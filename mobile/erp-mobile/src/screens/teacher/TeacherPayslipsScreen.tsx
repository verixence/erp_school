import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import {
  Wallet,
  Download,
  Eye,
  FileText,
  Calendar,
  X,
  CheckCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { schoolTheme } from '../../theme/schoolTheme';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface Payslip {
  id: string;
  month: number;
  year: number;
  basic_salary: number;
  gross_salary: number;
  net_salary: number;
  status: 'sent' | 'viewed';
  sent_at: string;
  viewed_at?: string;
  allowances: {
    hra?: number;
    da?: number;
    ta?: number;
    other?: number;
  };
  deductions: {
    pf?: number;
    tax?: number;
    other?: number;
  };
  notes?: string;
}

export const TeacherPayslipsScreen: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Fetch payslips
  const { data: payslips = [], isLoading } = useQuery({
    queryKey: ['teacher-payslips', user?.id],
    queryFn: async (): Promise<Payslip[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('teacher_payslips')
        .select('*')
        .eq('teacher_id', user.id)
        .in('status', ['sent', 'viewed'])
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Mark payslip as viewed
  const markAsViewedMutation = useMutation({
    mutationFn: async (payslipId: string) => {
      const { error } = await supabase
        .from('teacher_payslips')
        .update({
          status: 'viewed',
          viewed_at: new Date().toISOString(),
        })
        .eq('id', payslipId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-payslips'] });
    },
  });

  const handleViewPayslip = (payslip: Payslip) => {
    setSelectedPayslip(payslip);
    setShowDetailsModal(true);

    if (payslip.status === 'sent') {
      markAsViewedMutation.mutate(payslip.id);
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const generatePayslipHTML = async (payslip: Payslip): Promise<string> => {
    // Fetch school details
    const { data: schoolData } = await supabase
      .from('schools')
      .select('name, logo_url, address')
      .eq('id', user?.school_id)
      .single();

    let logoBase64 = '';
    if (schoolData?.logo_url) {
      try {
        const response = await fetch(schoolData.logo_url);
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

    let addressText = '';
    if (schoolData?.address) {
      const addr = schoolData.address as any;
      const parts = [addr.street, addr.city, addr.state, addr.postal_code].filter(Boolean);
      addressText = parts.join(', ');
    }

    const totalDeductions = parseFloat(payslip.gross_salary as any) - parseFloat(payslip.net_salary as any);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payslip - ${MONTHS[payslip.month - 1]} ${payslip.year}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
          }

          .payslip {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          }

          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }

          .logo {
            max-width: 120px;
            max-height: 120px;
            margin-bottom: 15px;
            border-radius: 10px;
            background: white;
            padding: 10px;
          }

          .school-name {
            font-size: 28px;
            font-weight: 800;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
          }

          .school-address {
            font-size: 14px;
            opacity: 0.95;
            line-height: 1.5;
          }

          .payslip-title {
            background: rgba(255, 255, 255, 0.2);
            margin: 20px -30px -15px;
            padding: 20px 30px;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 1px;
          }

          .info-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            padding: 30px;
            border-bottom: 2px solid #f0f0f0;
          }

          .info-item {
            padding: 15px;
            background: #f8f9fa;
            border-radius: 10px;
          }

          .info-label {
            font-size: 12px;
            color: #6c757d;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
          }

          .info-value {
            font-size: 18px;
            color: #212529;
            font-weight: 700;
          }

          .salary-section {
            padding: 30px;
          }

          .section-title {
            font-size: 18px;
            font-weight: 700;
            color: #212529;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #667eea;
          }

          .salary-table {
            width: 100%;
            margin-bottom: 25px;
          }

          .salary-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #f0f0f0;
          }

          .salary-label {
            font-size: 15px;
            color: #495057;
          }

          .salary-value {
            font-size: 15px;
            font-weight: 600;
            color: #212529;
          }

          .total-row {
            background: #f8f9fa;
            padding: 15px;
            margin: 10px -15px;
            border-radius: 10px;
            border: 2px solid #e9ecef;
          }

          .total-row .salary-label,
          .total-row .salary-value {
            font-size: 16px;
            font-weight: 700;
          }

          .deduction-value {
            color: #dc3545;
          }

          .net-pay {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            margin: 30px 0;
            border-radius: 15px;
            text-align: center;
          }

          .net-pay-label {
            font-size: 16px;
            opacity: 0.9;
            margin-bottom: 8px;
          }

          .net-pay-amount {
            font-size: 36px;
            font-weight: 800;
            letter-spacing: -1px;
          }

          .notes {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
          }

          .notes-title {
            font-weight: 700;
            margin-bottom: 8px;
            color: #856404;
          }

          .notes-text {
            color: #856404;
            font-size: 14px;
            line-height: 1.6;
          }

          .footer {
            background: #f8f9fa;
            padding: 25px;
            text-align: center;
            color: #6c757d;
            font-size: 12px;
            line-height: 1.8;
          }

          .footer-highlight {
            color: #667eea;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="payslip">
          <div class="header">
            ${logoBase64 ? `<img src="${logoBase64}" alt="School Logo" class="logo">` : ''}
            <div class="school-name">${schoolData?.name || 'School Name'}</div>
            <div class="school-address">${addressText || 'School Address'}</div>
            <div class="payslip-title">SALARY PAYSLIP</div>
          </div>

          <div class="info-section">
            <div class="info-item">
              <div class="info-label">Employee Name</div>
              <div class="info-value">${user?.first_name} ${user?.last_name}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Employee ID</div>
              <div class="info-value">${(user as any)?.employee_id || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Pay Period</div>
              <div class="info-value">${MONTHS[payslip.month - 1]} ${payslip.year}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Issue Date</div>
              <div class="info-value">${new Date(payslip.sent_at).toLocaleDateString()}</div>
            </div>
          </div>

          <div class="salary-section">
            <div class="section-title">EARNINGS</div>
            <div class="salary-table">
              <div class="salary-row">
                <span class="salary-label">Basic Salary</span>
                <span class="salary-value">₹${parseFloat(payslip.basic_salary as any).toLocaleString()}</span>
              </div>
              ${payslip.allowances?.hra ? `
              <div class="salary-row">
                <span class="salary-label">House Rent Allowance (HRA)</span>
                <span class="salary-value">₹${parseFloat(payslip.allowances.hra as any).toLocaleString()}</span>
              </div>` : ''}
              ${payslip.allowances?.da ? `
              <div class="salary-row">
                <span class="salary-label">Dearness Allowance (DA)</span>
                <span class="salary-value">₹${parseFloat(payslip.allowances.da as any).toLocaleString()}</span>
              </div>` : ''}
              ${payslip.allowances?.ta ? `
              <div class="salary-row">
                <span class="salary-label">Transport Allowance (TA)</span>
                <span class="salary-value">₹${parseFloat(payslip.allowances.ta as any).toLocaleString()}</span>
              </div>` : ''}
              ${payslip.allowances?.other ? `
              <div class="salary-row">
                <span class="salary-label">Other Allowances</span>
                <span class="salary-value">₹${parseFloat(payslip.allowances.other as any).toLocaleString()}</span>
              </div>` : ''}
              <div class="salary-row total-row">
                <span class="salary-label">GROSS SALARY</span>
                <span class="salary-value">₹${parseFloat(payslip.gross_salary as any).toLocaleString()}</span>
              </div>
            </div>

            <div class="section-title">DEDUCTIONS</div>
            <div class="salary-table">
              ${payslip.deductions?.pf ? `
              <div class="salary-row">
                <span class="salary-label">Provident Fund (PF)</span>
                <span class="salary-value deduction-value">-₹${parseFloat(payslip.deductions.pf as any).toLocaleString()}</span>
              </div>` : ''}
              ${payslip.deductions?.tax ? `
              <div class="salary-row">
                <span class="salary-label">Income Tax (TDS)</span>
                <span class="salary-value deduction-value">-₹${parseFloat(payslip.deductions.tax as any).toLocaleString()}</span>
              </div>` : ''}
              ${payslip.deductions?.other ? `
              <div class="salary-row">
                <span class="salary-label">Other Deductions</span>
                <span class="salary-value deduction-value">-₹${parseFloat(payslip.deductions.other as any).toLocaleString()}</span>
              </div>` : ''}
              <div class="salary-row total-row">
                <span class="salary-label">TOTAL DEDUCTIONS</span>
                <span class="salary-value deduction-value">-₹${totalDeductions.toLocaleString()}</span>
              </div>
            </div>

            <div class="net-pay">
              <div class="net-pay-label">NET PAY</div>
              <div class="net-pay-amount">₹${parseFloat(payslip.net_salary as any).toLocaleString()}</div>
            </div>

            ${payslip.notes ? `
            <div class="notes">
              <div class="notes-title">Notes</div>
              <div class="notes-text">${payslip.notes}</div>
            </div>` : ''}
          </div>

          <div class="footer">
            <p>This is a computer-generated payslip and does not require a physical signature.</p>
            <p>For any queries regarding your salary, please contact <span class="footer-highlight">HR Department</span></p>
            <p style="margin-top: 15px; color: #adb5bd;">Generated on ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handleDownloadPDF = async (payslip: Payslip) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const html = await generatePayslipHTML(payslip);
      const { uri } = await Print.printToFileAsync({ html });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Payslip - ${MONTHS[payslip.month - 1]} ${payslip.year}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Success', 'Payslip PDF generated successfully');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const totalDeductions = selectedPayslip
    ? parseFloat(selectedPayslip.gross_salary as any) - parseFloat(selectedPayslip.net_salary as any)
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Wallet size={32} color={schoolTheme.colors.teacher.main} />
            <View style={styles.headerText}>
              <Text style={styles.title}>My Payslips</Text>
              <Text style={styles.subtitle}>
                {payslips.length} payslip{payslips.length !== 1 ? 's' : ''} available
              </Text>
            </View>
          </View>
        </View>

        {/* Payslips List */}
        <View style={styles.content}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={schoolTheme.colors.teacher.main} />
              <Text style={styles.loadingText}>Loading payslips...</Text>
            </View>
          ) : payslips.length === 0 ? (
            <View style={styles.emptyState}>
              <FileText size={64} color={schoolTheme.colors.text.tertiary} />
              <Text style={styles.emptyStateTitle}>No Payslips Available</Text>
              <Text style={styles.emptyStateText}>
                Your payslips will appear here once they are shared by the administration
              </Text>
            </View>
          ) : (
            payslips.map((payslip) => (
              <View key={payslip.id} style={styles.payslipCard}>
                <View style={styles.payslipHeader}>
                  <View style={styles.payslipHeaderLeft}>
                    <Text style={styles.payslipMonth}>
                      {MONTHS[payslip.month - 1]} {payslip.year}
                    </Text>
                    {payslip.status === 'viewed' && (
                      <View style={styles.viewedBadge}>
                        <CheckCircle size={12} color={schoolTheme.colors.success.main} />
                        <Text style={styles.viewedText}>Viewed</Text>
                      </View>
                    )}
                  </View>
                  <Calendar size={20} color={schoolTheme.colors.text.secondary} />
                </View>

                <View style={styles.payslipAmounts}>
                  <View style={styles.amountItem}>
                    <Text style={styles.amountLabel}>Gross</Text>
                    <Text style={styles.amountValue}>
                      ₹{parseFloat(payslip.gross_salary as any).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.amountDivider} />
                  <View style={styles.amountItem}>
                    <Text style={styles.amountLabel}>Net Pay</Text>
                    <Text style={[styles.amountValue, styles.netPayValue]}>
                      ₹{parseFloat(payslip.net_salary as any).toLocaleString()}
                    </Text>
                  </View>
                </View>

                {payslip.sent_at && (
                  <Text style={styles.issueDate}>
                    Issued on {new Date(payslip.sent_at).toLocaleDateString()}
                  </Text>
                )}

                <View style={styles.payslipActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleViewPayslip(payslip)}
                  >
                    <Eye size={18} color={schoolTheme.colors.primary.main} />
                    <Text style={styles.actionButtonText}>View Details</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonPrimary]}
                    onPress={() => handleDownloadPDF(payslip)}
                  >
                    <Download size={18} color="white" />
                    <Text style={styles.actionButtonTextPrimary}>Download PDF</Text>
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
              <Text style={styles.modalTitle}>
                Payslip - {selectedPayslip && MONTHS[selectedPayslip.month - 1]} {selectedPayslip?.year}
              </Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <X size={24} color={schoolTheme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedPayslip && (
                <>
                  {/* Earnings */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>EARNINGS</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Basic Salary</Text>
                      <Text style={styles.detailValue}>
                        ₹{parseFloat(selectedPayslip.basic_salary as any).toLocaleString()}
                      </Text>
                    </View>
                    {selectedPayslip.allowances?.hra && selectedPayslip.allowances.hra > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>HRA</Text>
                        <Text style={styles.detailValue}>
                          ₹{parseFloat(selectedPayslip.allowances.hra as any).toLocaleString()}
                        </Text>
                      </View>
                    )}
                    {selectedPayslip.allowances?.da && selectedPayslip.allowances.da > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>DA</Text>
                        <Text style={styles.detailValue}>
                          ₹{parseFloat(selectedPayslip.allowances.da as any).toLocaleString()}
                        </Text>
                      </View>
                    )}
                    {selectedPayslip.allowances?.ta && selectedPayslip.allowances.ta > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>TA</Text>
                        <Text style={styles.detailValue}>
                          ₹{parseFloat(selectedPayslip.allowances.ta as any).toLocaleString()}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.detailRow, styles.totalRow]}>
                      <Text style={styles.totalLabel}>Gross Salary</Text>
                      <Text style={styles.totalValue}>
                        ₹{parseFloat(selectedPayslip.gross_salary as any).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* Deductions */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>DEDUCTIONS</Text>
                    {selectedPayslip.deductions?.pf && selectedPayslip.deductions.pf > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>PF</Text>
                        <Text style={[styles.detailValue, styles.deductionValue]}>
                          -₹{parseFloat(selectedPayslip.deductions.pf as any).toLocaleString()}
                        </Text>
                      </View>
                    )}
                    {selectedPayslip.deductions?.tax && selectedPayslip.deductions.tax > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Tax</Text>
                        <Text style={[styles.detailValue, styles.deductionValue]}>
                          -₹{parseFloat(selectedPayslip.deductions.tax as any).toLocaleString()}
                        </Text>
                      </View>
                    )}
                    {selectedPayslip.deductions?.other && selectedPayslip.deductions.other > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Other Deductions</Text>
                        <Text style={[styles.detailValue, styles.deductionValue]}>
                          -₹{parseFloat(selectedPayslip.deductions.other as any).toLocaleString()}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.detailRow, styles.totalRow]}>
                      <Text style={styles.totalLabel}>Total Deductions</Text>
                      <Text style={[styles.totalValue, styles.deductionValue]}>
                        -₹{totalDeductions.toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* Net Pay */}
                  <View style={styles.netPayCard}>
                    <Text style={styles.netPayLabel}>NET PAY</Text>
                    <Text style={styles.netPayAmount}>
                      ₹{parseFloat(selectedPayslip.net_salary as any).toLocaleString()}
                    </Text>
                  </View>

                  {/* Notes */}
                  {selectedPayslip.notes && (
                    <View style={styles.notesCard}>
                      <Text style={styles.notesTitle}>Notes</Text>
                      <Text style={styles.notesText}>{selectedPayslip.notes}</Text>
                    </View>
                  )}
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
                  if (selectedPayslip) {
                    handleDownloadPDF(selectedPayslip);
                  }
                }}
              >
                <Download size={18} color="white" />
                <Text style={styles.modalButtonTextPrimary}>Download PDF</Text>
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
  payslipCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...schoolTheme.shadows.md,
  },
  payslipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  payslipHeaderLeft: {
    flex: 1,
  },
  payslipMonth: {
    fontSize: 20,
    fontFamily: schoolTheme.typography.fonts.bold,
    color: schoolTheme.colors.text.primary,
    marginBottom: 8,
  },
  viewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: schoolTheme.colors.success.bg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  viewedText: {
    fontSize: 11,
    color: schoolTheme.colors.success.main,
    fontFamily: schoolTheme.typography.fonts.semibold,
  },
  payslipAmounts: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  amountItem: {
    flex: 1,
  },
  amountDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
  },
  amountLabel: {
    fontSize: 12,
    color: schoolTheme.colors.text.secondary,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 18,
    fontFamily: schoolTheme.typography.fonts.bold,
    color: schoolTheme.colors.text.primary,
  },
  netPayValue: {
    color: schoolTheme.colors.teacher.main,
  },
  issueDate: {
    fontSize: 12,
    color: schoolTheme.colors.text.secondary,
    marginBottom: 16,
  },
  payslipActions: {
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
    backgroundColor: schoolTheme.colors.secondary.light,
  },
  actionButtonPrimary: {
    backgroundColor: schoolTheme.colors.teacher.main,
    borderColor: schoolTheme.colors.teacher.main,
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
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontFamily: schoolTheme.typography.fonts.bold,
    color: schoolTheme.colors.text.secondary,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 15,
    color: schoolTheme.colors.text.secondary,
  },
  detailValue: {
    fontSize: 15,
    fontFamily: schoolTheme.typography.fonts.semibold,
    color: schoolTheme.colors.text.primary,
  },
  deductionValue: {
    color: schoolTheme.colors.error.main,
  },
  totalRow: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    marginHorizontal: -12,
    marginTop: 8,
    borderRadius: 8,
    borderBottomWidth: 0,
  },
  totalLabel: {
    fontSize: 15,
    fontFamily: schoolTheme.typography.fonts.bold,
    color: schoolTheme.colors.text.primary,
  },
  totalValue: {
    fontSize: 15,
    fontFamily: schoolTheme.typography.fonts.bold,
    color: schoolTheme.colors.text.primary,
  },
  netPayCard: {
    backgroundColor: schoolTheme.colors.teacher.main,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  netPayLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  netPayAmount: {
    fontSize: 32,
    fontFamily: schoolTheme.typography.fonts.bold,
    color: 'white',
  },
  notesCard: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    padding: 16,
    borderRadius: 8,
  },
  notesTitle: {
    fontSize: 14,
    fontFamily: schoolTheme.typography.fonts.bold,
    color: '#856404',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
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
    backgroundColor: schoolTheme.colors.teacher.main,
    borderColor: schoolTheme.colors.teacher.main,
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
