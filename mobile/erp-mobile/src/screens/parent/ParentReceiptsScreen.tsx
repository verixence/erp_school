import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import {
  Receipt as ReceiptIcon,
  Download,
  Eye,
  Search,
  X,
  FileText,
  Calendar,
  User,
  DollarSign,
  CreditCard,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { schoolTheme } from '../../theme/schoolTheme';

interface Receipt {
  id: string;
  receipt_no: string;
  receipt_date: string;
  student_name: string;
  student_admission_no: string;
  student_grade: string;
  student_section: string;
  payment_method: string;
  payment_date: string;
  reference_number: string | null;
  notes: string | null;
  receipt_items: any;
  total_amount: number;
  school_name: string;
  school_address: string;
  school_phone: string | null;
  school_email: string | null;
  school_logo_url: string | null;
}

export const ParentReceiptsScreen: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Fetch receipts
  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['parent-receipts', user?.id],
    queryFn: async (): Promise<Receipt[]> => {
      if (!user?.id) return [];

      // Get children
      const { data: childrenData } = await supabase
        .from('student_parents')
        .select('student_id, students!inner(id)')
        .eq('parent_id', user.id);

      if (!childrenData || childrenData.length === 0) return [];

      const studentIds = childrenData.map((c: any) => c.student_id);

      // Get receipts with school details
      const { data, error } = await supabase
        .from('receipts')
        .select(`
          *,
          students!inner(full_name, admission_no, sections(grade, section)),
          schools!inner(name, address, phone, email, logo_url)
        `)
        .in('student_id', studentIds)
        .order('receipt_date', { ascending: false })
        .limit(100);

      if (error) throw error;

      return (data || []).map((receipt: any) => ({
        id: receipt.id,
        receipt_no: receipt.receipt_no,
        receipt_date: receipt.receipt_date,
        student_name: receipt.students.full_name,
        student_admission_no: receipt.students.admission_no,
        student_grade: `Grade ${receipt.students.sections?.grade || 'N/A'}`,
        student_section: receipt.students.sections?.section || 'N/A',
        payment_method: receipt.payment_method,
        payment_date: receipt.payment_date,
        reference_number: receipt.reference_number,
        notes: receipt.notes,
        receipt_items: receipt.receipt_items,
        total_amount: parseFloat(receipt.total_amount || 0),
        school_name: receipt.schools.name,
        school_address: typeof receipt.schools.address === 'string'
          ? receipt.schools.address
          : [
              receipt.schools.address?.street,
              receipt.schools.address?.city,
              receipt.schools.address?.state,
              receipt.schools.address?.postal_code
            ].filter(Boolean).join(', '),
        school_phone: receipt.schools.phone,
        school_email: receipt.schools.email,
        school_logo_url: receipt.schools.logo_url,
      }));
    },
    enabled: !!user?.id,
  });

  // Filter receipts
  const filteredReceipts = receipts.filter((receipt) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      receipt.receipt_no.toLowerCase().includes(search) ||
      receipt.student_name.toLowerCase().includes(search) ||
      receipt.student_admission_no?.toLowerCase().includes(search)
    );
  });

  const handleViewReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setShowDetailsModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const generateReceiptHTML = async (receipt: Receipt): Promise<string> => {
    let logoBase64 = '';
    if (receipt.school_logo_url) {
      try {
        const response = await fetch(receipt.school_logo_url);
        const blob = await response.blob();
        logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.warn('Failed to load logo:', e);
      }
    }

    const receiptItems = Array.isArray(receipt.receipt_items)
      ? receipt.receipt_items
      : [receipt.receipt_items];

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt ${receipt.receipt_no}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          .logo {
            max-width: 150px;
            max-height: 150px;
            margin-bottom: 10px;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            margin: 20px 0;
          }
          .details {
            margin: 20px 0;
          }
          .details table {
            width: 100%;
            border-collapse: collapse;
          }
          .details td {
            padding: 8px 0;
          }
          .items {
            margin: 30px 0;
          }
          .items table {
            width: 100%;
            border-collapse: collapse;
          }
          .items th, .items td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
          }
          .items th {
            background-color: #f5f5f5;
          }
          .total {
            font-size: 18px;
            font-weight: bold;
            text-align: right;
            margin-top: 20px;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoBase64 ? `<img src="${logoBase64}" alt="School Logo" class="logo">` : ''}
          <h1>${receipt.school_name}</h1>
          <p>${receipt.school_address}</p>
          ${receipt.school_phone ? `<p>Phone: ${receipt.school_phone}</p>` : ''}
          ${receipt.school_email ? `<p>Email: ${receipt.school_email}</p>` : ''}
          <p class="title">FEE PAYMENT RECEIPT</p>
        </div>

        <div class="details">
          <table>
            <tr>
              <td><strong>Receipt No:</strong></td>
              <td>${receipt.receipt_no}</td>
              <td><strong>Date:</strong></td>
              <td>${new Date(receipt.receipt_date).toLocaleDateString()}</td>
            </tr>
            <tr>
              <td><strong>Student Name:</strong></td>
              <td>${receipt.student_name}</td>
              <td><strong>Admission No:</strong></td>
              <td>${receipt.student_admission_no || 'N/A'}</td>
            </tr>
            <tr>
              <td><strong>Class/Grade:</strong></td>
              <td>${receipt.student_grade}</td>
              <td><strong>Section:</strong></td>
              <td>${receipt.student_section}</td>
            </tr>
          </table>
        </div>

        <div class="items">
          <table>
            <thead>
              <tr>
                <th>Fee Type</th>
                <th style="text-align: right;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${receiptItems.map((item: any) => `
                <tr>
                  <td>${item.fee_type || item.description || 'Fee'}</td>
                  <td style="text-align: right;">₹${Number(item.amount).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="total">
          <p>Total Amount Paid: ₹${receipt.total_amount.toFixed(2)}</p>
        </div>

        <div class="details" style="margin-top: 30px;">
          <table>
            <tr>
              <td><strong>Payment Method:</strong></td>
              <td>${receipt.payment_method.toUpperCase()}</td>
              <td><strong>Payment Date:</strong></td>
              <td>${new Date(receipt.payment_date).toLocaleDateString()}</td>
            </tr>
            ${receipt.reference_number ? `
            <tr>
              <td><strong>Reference No:</strong></td>
              <td colspan="3">${receipt.reference_number}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <div class="footer">
          <p>This is a computer-generated receipt and does not require a signature.</p>
          <p>For any queries, please contact the school office.</p>
        </div>
      </body>
      </html>
    `;
  };

  const handleDownloadReceipt = async (receipt: Receipt) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const html = await generateReceiptHTML(receipt);
      const { uri } = await Print.printToFileAsync({ html });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Receipt ${receipt.receipt_no}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Success', 'Receipt PDF generated successfully');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error generating receipt:', error);
      Alert.alert('Error', 'Failed to generate receipt. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const receiptItems = selectedReceipt
    ? (Array.isArray(selectedReceipt.receipt_items)
        ? selectedReceipt.receipt_items
        : [selectedReceipt.receipt_items])
    : [];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <ReceiptIcon size={32} color={schoolTheme.colors.parent.main} />
            <View style={styles.headerText}>
              <Text style={styles.title}>Fee Receipts</Text>
              <Text style={styles.subtitle}>Payment receipts for your children</Text>
            </View>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Search size={20} color={schoolTheme.colors.text.secondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by receipt no, student name..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor={schoolTheme.colors.text.tertiary}
            />
          </View>
        </View>

        {/* Receipts List */}
        <View style={styles.content}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={schoolTheme.colors.parent.main} />
              <Text style={styles.loadingText}>Loading receipts...</Text>
            </View>
          ) : filteredReceipts.length === 0 ? (
            <View style={styles.emptyState}>
              <ReceiptIcon size={64} color={schoolTheme.colors.text.tertiary} />
              <Text style={styles.emptyStateTitle}>
                {searchTerm ? 'No receipts found' : 'No Receipts Available'}
              </Text>
              <Text style={styles.emptyStateText}>
                {searchTerm
                  ? 'Try adjusting your search criteria'
                  : 'Payment receipts will appear here once fees are paid'}
              </Text>
            </View>
          ) : (
            filteredReceipts.map((receipt) => (
              <View key={receipt.id} style={styles.receiptCard}>
                <View style={styles.receiptHeader}>
                  <View style={styles.receiptHeaderLeft}>
                    <Text style={styles.receiptNumber}>{receipt.receipt_no}</Text>
                    <Text style={styles.receiptDate}>
                      {new Date(receipt.receipt_date).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.amountBadge}>
                    <Text style={styles.amountText}>₹{receipt.total_amount.toFixed(2)}</Text>
                  </View>
                </View>

                <View style={styles.receiptBody}>
                  <View style={styles.studentInfo}>
                    <User size={16} color={schoolTheme.colors.text.secondary} />
                    <View style={styles.studentInfoText}>
                      <Text style={styles.studentName}>{receipt.student_name}</Text>
                      <Text style={styles.studentDetails}>
                        {receipt.student_grade} - {receipt.student_section}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.paymentInfo}>
                    <CreditCard size={16} color={schoolTheme.colors.text.secondary} />
                    <Text style={styles.paymentMethod}>
                      {receipt.payment_method.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.receiptActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleViewReceipt(receipt)}
                  >
                    <Eye size={18} color={schoolTheme.colors.primary.main} />
                    <Text style={styles.actionButtonText}>View</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonPrimary]}
                    onPress={() => handleDownloadReceipt(receipt)}
                  >
                    <Download size={18} color="white" />
                    <Text style={styles.actionButtonTextPrimary}>Print</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Receipt Details</Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <X size={24} color={schoolTheme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedReceipt && (
                <>
                  {/* School Info */}
                  <View style={styles.schoolInfo}>
                    <Text style={styles.schoolName}>{selectedReceipt.school_name}</Text>
                    <Text style={styles.schoolAddress}>{selectedReceipt.school_address}</Text>
                    {selectedReceipt.school_phone && (
                      <Text style={styles.schoolContact}>Phone: {selectedReceipt.school_phone}</Text>
                    )}
                    {selectedReceipt.school_email && (
                      <Text style={styles.schoolContact}>Email: {selectedReceipt.school_email}</Text>
                    )}
                    <Text style={styles.receiptTitle}>FEE PAYMENT RECEIPT</Text>
                  </View>

                  {/* Receipt Info */}
                  <View style={styles.detailSection}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Receipt No</Text>
                      <Text style={styles.detailValue}>{selectedReceipt.receipt_no}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedReceipt.receipt_date).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Student Name</Text>
                      <Text style={styles.detailValue}>{selectedReceipt.student_name}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Admission No</Text>
                      <Text style={styles.detailValue}>{selectedReceipt.student_admission_no || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Class</Text>
                      <Text style={styles.detailValue}>
                        {selectedReceipt.student_grade} - {selectedReceipt.student_section}
                      </Text>
                    </View>
                  </View>

                  {/* Fee Items */}
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Fee Details</Text>
                    {receiptItems.map((item: any, index: number) => (
                      <View key={index} style={styles.feeItem}>
                        <Text style={styles.feeType}>{item.fee_type || item.description || 'Fee'}</Text>
                        <Text style={styles.feeAmount}>₹{Number(item.amount).toFixed(2)}</Text>
                      </View>
                    ))}
                    <View style={[styles.feeItem, styles.totalItem]}>
                      <Text style={styles.totalLabel}>TOTAL</Text>
                      <Text style={styles.totalValue}>₹{selectedReceipt.total_amount.toFixed(2)}</Text>
                    </View>
                  </View>

                  {/* Payment Info */}
                  <View style={styles.detailSection}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Payment Method</Text>
                      <Text style={styles.detailValue}>{selectedReceipt.payment_method.toUpperCase()}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Payment Date</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedReceipt.payment_date).toLocaleDateString()}
                      </Text>
                    </View>
                    {selectedReceipt.reference_number && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Reference No</Text>
                        <Text style={styles.detailValue}>{selectedReceipt.reference_number}</Text>
                      </View>
                    )}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowDetailsModal(false)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => {
                  if (selectedReceipt) {
                    handleDownloadReceipt(selectedReceipt);
                  }
                }}
              >
                <Download size={18} color="white" />
                <Text style={styles.modalButtonTextPrimary}>Print Receipt</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: schoolTheme.colors.background.main,
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontFamily: schoolTheme.typography.fonts.bold,
    color: schoolTheme.colors.text.primary,
  },
  subtitle: {
    fontSize: 14,
    color: schoolTheme.colors.text.secondary,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: schoolTheme.colors.text.primary,
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: schoolTheme.colors.text.secondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: schoolTheme.typography.fonts.bold,
    color: schoolTheme.colors.text.secondary,
    marginTop: 20,
  },
  emptyStateText: {
    fontSize: 14,
    color: schoolTheme.colors.text.tertiary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  receiptCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...schoolTheme.shadows.md,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  receiptHeaderLeft: {
    flex: 1,
  },
  receiptNumber: {
    fontSize: 18,
    fontFamily: schoolTheme.typography.fonts.bold,
    color: schoolTheme.colors.text.primary,
    marginBottom: 4,
  },
  receiptDate: {
    fontSize: 12,
    color: schoolTheme.colors.text.secondary,
  },
  amountBadge: {
    backgroundColor: schoolTheme.colors.parent.main + '20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  amountText: {
    fontSize: 16,
    fontFamily: schoolTheme.typography.fonts.bold,
    color: schoolTheme.colors.parent.main,
  },
  receiptBody: {
    marginBottom: 16,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  studentInfoText: {
    marginLeft: 8,
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontFamily: schoolTheme.typography.fonts.semibold,
    color: schoolTheme.colors.text.primary,
  },
  studentDetails: {
    fontSize: 13,
    color: schoolTheme.colors.text.secondary,
    marginTop: 2,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethod: {
    fontSize: 13,
    color: schoolTheme.colors.text.secondary,
    marginLeft: 8,
  },
  receiptActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: schoolTheme.colors.primary.main,
    backgroundColor: schoolTheme.colors.primary.light,
  },
  actionButtonPrimary: {
    backgroundColor: schoolTheme.colors.parent.main,
    borderColor: schoolTheme.colors.parent.main,
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: schoolTheme.typography.fonts.semibold,
    color: schoolTheme.colors.primary.main,
  },
  actionButtonTextPrimary: {
    fontSize: 14,
    fontFamily: schoolTheme.typography.fonts.semibold,
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: schoolTheme.typography.fonts.bold,
    color: schoolTheme.colors.text.primary,
  },
  modalBody: {
    padding: 20,
  },
  schoolInfo: {
    alignItems: 'center',
    paddingBottom: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  schoolName: {
    fontSize: 20,
    fontFamily: schoolTheme.typography.fonts.bold,
    color: schoolTheme.colors.text.primary,
    marginBottom: 8,
  },
  schoolAddress: {
    fontSize: 14,
    color: schoolTheme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  schoolContact: {
    fontSize: 13,
    color: schoolTheme.colors.text.secondary,
    marginTop: 2,
  },
  receiptTitle: {
    fontSize: 18,
    fontFamily: schoolTheme.typography.fonts.bold,
    color: schoolTheme.colors.text.primary,
    marginTop: 12,
  },
  detailSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: schoolTheme.typography.fonts.bold,
    color: schoolTheme.colors.text.primary,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: schoolTheme.colors.text.secondary,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: schoolTheme.typography.fonts.semibold,
    color: schoolTheme.colors.text.primary,
  },
  feeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  feeType: {
    fontSize: 15,
    color: schoolTheme.colors.text.primary,
  },
  feeAmount: {
    fontSize: 15,
    fontFamily: schoolTheme.typography.fonts.semibold,
    color: schoolTheme.colors.text.primary,
  },
  totalItem: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    marginHorizontal: -12,
    marginTop: 8,
    borderRadius: 8,
    borderBottomWidth: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: schoolTheme.typography.fonts.bold,
    color: schoolTheme.colors.text.primary,
  },
  totalValue: {
    fontSize: 18,
    fontFamily: schoolTheme.typography.fonts.bold,
    color: schoolTheme.colors.parent.main,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalButtonPrimary: {
    backgroundColor: schoolTheme.colors.parent.main,
    borderColor: schoolTheme.colors.parent.main,
    flexDirection: 'row',
    gap: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: schoolTheme.typography.fonts.semibold,
    color: schoolTheme.colors.text.primary,
  },
  modalButtonTextPrimary: {
    fontSize: 16,
    fontFamily: schoolTheme.typography.fonts.semibold,
    color: 'white',
  },
});
