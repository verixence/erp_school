import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import {
  Receipt,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Upload,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { schoolTheme } from '../../theme/schoolTheme';

interface ExpenseClaim {
  id: string;
  expense_date: string;
  category: string;
  amount: number;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  receipt_url?: string;
  created_at: string;
  bank_details?: {
    account_name: string;
    account_number: string;
    ifsc_code: string;
  };
}

const EXPENSE_CATEGORIES = [
  'Transportation',
  'Materials & Supplies',
  'Professional Development',
  'Communication',
  'Other',
];

export const TeacherExpenseClaimsScreen: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [receiptFile, setReceiptFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch expense claims
  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['teacher-expense-claims', user?.id],
    queryFn: async (): Promise<ExpenseClaim[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('expense_claims')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Submit expense claim mutation
  const submitClaimMutation = useMutation({
    mutationFn: async (claimData: any) => {
      let receiptUrl = null;

      // Upload receipt if exists
      if (receiptFile) {
        const fileExt = receiptFile.name?.split('.').pop() || 'jpg';
        const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('expense-receipts')
          .upload(fileName, {
            uri: receiptFile.uri,
            type: receiptFile.mimeType,
            name: receiptFile.name,
          } as any);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('expense-receipts')
          .getPublicUrl(fileName);

        receiptUrl = publicUrl;
      }

      const { data, error } = await supabase
        .from('expense_claims')
        .insert({
          teacher_id: user?.id,
          school_id: user?.school_id,
          expense_date: claimData.expense_date,
          category: claimData.category,
          amount: parseFloat(claimData.amount),
          description: claimData.description,
          status: 'pending',
          receipt_url: receiptUrl,
          bank_details: {
            account_name: claimData.account_name,
            account_number: claimData.account_number,
            ifsc_code: claimData.ifsc_code,
          },
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-expense-claims'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Expense claim submitted successfully!');
      resetForm();
      setShowForm(false);
    },
    onError: (error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to submit expense claim. Please try again.');
      console.error(error);
    },
  });

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReceiptFile(result.assets[0]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photos');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReceiptFile({
          uri: result.assets[0].uri,
          name: `receipt_${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const resetForm = () => {
    setExpenseDate(new Date());
    setCategory(EXPENSE_CATEGORIES[0]);
    setAmount('');
    setDescription('');
    setAccountName('');
    setAccountNumber('');
    setIfscCode('');
    setReceiptFile(null);
  };

  const handleSubmit = () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Please enter a description');
      return;
    }
    if (!accountName.trim() || !accountNumber.trim() || !ifscCode.trim()) {
      Alert.alert('Validation Error', 'Please enter complete bank details');
      return;
    }

    submitClaimMutation.mutate({
      expense_date: expenseDate.toISOString().split('T')[0],
      category,
      amount,
      description,
      account_name: accountName,
      account_number: accountNumber,
      ifsc_code: ifscCode,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return schoolTheme.colors.success.main;
      case 'rejected':
        return schoolTheme.colors.error.main;
      default:
        return schoolTheme.colors.warning.main;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return CheckCircle;
      case 'rejected':
        return XCircle;
      default:
        return Clock;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Receipt size={32} color={schoolTheme.colors.teacher.main} />
            <View style={styles.headerText}>
              <Text style={styles.title}>Expense Claims</Text>
              <Text style={styles.subtitle}>Submit and track reimbursements</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowForm(!showForm);
            }}
          >
            <Text style={styles.addButtonText}>
              {showForm ? 'Cancel' : '+ New Claim'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <AlertCircle size={20} color={schoolTheme.colors.info.main} />
          <Text style={styles.infoText}>
            Upload a clear receipt photo for faster approval. Reimbursement will be credited to your bank account.
          </Text>
        </View>

        {/* New Claim Form */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>New Expense Claim</Text>

            {/* Expense Date */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Expense Date *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Calendar size={20} color={schoolTheme.colors.text.secondary} />
                <Text style={styles.dateText}>
                  {expenseDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            </View>

            <Modal
              visible={showDatePicker}
              transparent
              animationType="fade"
              onRequestClose={() => setShowDatePicker(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.datePickerCard}>
                  <View style={styles.datePickerHeader}>
                    <Text style={styles.datePickerTitle}>Select Date</Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <X size={24} color={schoolTheme.colors.text.primary} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.dateInputContainer}>
                    <TextInput
                      style={styles.dateInput}
                      value={expenseDate.toISOString().split('T')[0]}
                      onChangeText={(text) => {
                        const date = new Date(text);
                        if (!isNaN(date.getTime())) {
                          setExpenseDate(date);
                        }
                      }}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => {
                      setShowDatePicker(false);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Text style={styles.datePickerButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* Category */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoryContainer}>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        category === cat && styles.categoryChipActive,
                      ]}
                      onPress={() => {
                        setCategory(cat);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          category === cat && styles.categoryChipTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Amount */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Amount (₹) *</Text>
              <View style={styles.inputContainer}>
                <DollarSign size={20} color={schoolTheme.colors.text.secondary} />
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Describe the expense..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Bank Details */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Bank Details *</Text>
              <TextInput
                style={styles.inputField}
                placeholder="Account Holder Name"
                value={accountName}
                onChangeText={setAccountName}
              />
              <TextInput
                style={styles.inputField}
                placeholder="Account Number"
                value={accountNumber}
                onChangeText={setAccountNumber}
                keyboardType="number-pad"
              />
              <TextInput
                style={styles.inputField}
                placeholder="IFSC Code"
                value={ifscCode}
                onChangeText={setIfscCode}
                autoCapitalize="characters"
              />
            </View>

            {/* Receipt Upload */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Receipt (Optional)</Text>
              <View style={styles.uploadButtons}>
                <TouchableOpacity style={styles.uploadButton} onPress={handlePickImage}>
                  <Upload size={20} color={schoolTheme.colors.primary.main} />
                  <Text style={styles.uploadButtonText}>Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.uploadButton} onPress={handlePickDocument}>
                  <FileText size={20} color={schoolTheme.colors.primary.main} />
                  <Text style={styles.uploadButtonText}>Document</Text>
                </TouchableOpacity>
              </View>
              {receiptFile && (
                <View style={styles.filePreview}>
                  <FileText size={16} color={schoolTheme.colors.success.main} />
                  <Text style={styles.fileName} numberOfLines={1}>
                    {receiptFile.name}
                  </Text>
                  <TouchableOpacity onPress={() => setReceiptFile(null)}>
                    <Trash2 size={16} color={schoolTheme.colors.error.main} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, submitClaimMutation.isPending && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitClaimMutation.isPending}
            >
              {submitClaimMutation.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Claim</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Claims List */}
        <View style={styles.claimsSection}>
          <Text style={styles.sectionTitle}>Your Claims</Text>

          {isLoading ? (
            <ActivityIndicator size="large" color={schoolTheme.colors.teacher.main} style={{ marginTop: 20 }} />
          ) : claims.length === 0 ? (
            <View style={styles.emptyState}>
              <Receipt size={48} color={schoolTheme.colors.text.tertiary} />
              <Text style={styles.emptyStateText}>No claims submitted yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Submit your first expense claim to get started
              </Text>
            </View>
          ) : (
            claims.map((claim) => {
              const StatusIcon = getStatusIcon(claim.status);
              return (
                <View key={claim.id} style={styles.claimCard}>
                  <View style={styles.claimHeader}>
                    <View style={styles.claimHeaderLeft}>
                      <Text style={styles.claimCategory}>{claim.category}</Text>
                      <Text style={styles.claimDate}>
                        {new Date(claim.expense_date).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(claim.status) + '20' }]}>
                      <StatusIcon size={14} color={getStatusColor(claim.status)} />
                      <Text style={[styles.statusText, { color: getStatusColor(claim.status) }]}>
                        {claim.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.claimDescription}>{claim.description}</Text>

                  <View style={styles.claimFooter}>
                    <Text style={styles.claimAmount}>₹{claim.amount.toFixed(2)}</Text>
                    {claim.receipt_url && (
                      <View style={styles.receiptIndicator}>
                        <FileText size={14} color={schoolTheme.colors.success.main} />
                        <Text style={styles.receiptText}>Receipt attached</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  addButton: {
    backgroundColor: schoolTheme.colors.teacher.main,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: schoolTheme.typography.fonts.semibold,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: schoolTheme.colors.info.bg,
    padding: 16,
    margin: 20,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: schoolTheme.colors.info.main + '30',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    color: schoolTheme.colors.info.main,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 8,
    padding: 20,
    borderRadius: 16,
    ...schoolTheme.shadows.md,
  },
  formTitle: {
    fontSize: 20,
    fontFamily: schoolTheme.typography.fonts.bold,
    color: schoolTheme.colors.text.primary,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: schoolTheme.typography.fonts.semibold,
    color: schoolTheme.colors.text.primary,
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: 'white',
  },
  dateText: {
    marginLeft: 12,
    fontSize: 16,
    color: schoolTheme.colors.text.primary,
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: 'white',
  },
  categoryChipActive: {
    backgroundColor: schoolTheme.colors.teacher.main,
    borderColor: schoolTheme.colors.teacher.main,
  },
  categoryChipText: {
    fontSize: 14,
    color: schoolTheme.colors.text.secondary,
  },
  categoryChipTextActive: {
    color: 'white',
    fontFamily: schoolTheme.typography.fonts.semibold,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: 'white',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 12,
    fontSize: 16,
    color: schoolTheme.colors.text.primary,
  },
  inputField: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    height: 100,
    backgroundColor: 'white',
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: schoolTheme.colors.primary.main,
    borderRadius: 12,
    padding: 14,
    backgroundColor: schoolTheme.colors.secondary.light,
  },
  uploadButtonText: {
    color: schoolTheme.colors.primary.main,
    fontSize: 14,
    fontFamily: schoolTheme.typography.fonts.semibold,
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: schoolTheme.colors.success.bg,
    borderRadius: 8,
    gap: 8,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    color: schoolTheme.colors.text.primary,
  },
  submitButton: {
    backgroundColor: schoolTheme.colors.teacher.main,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: schoolTheme.typography.fonts.bold,
  },
  claimsSection: {
    padding: 20,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: schoolTheme.typography.fonts.bold,
    color: schoolTheme.colors.text.primary,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontFamily: schoolTheme.typography.fonts.semibold,
    color: schoolTheme.colors.text.secondary,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: schoolTheme.colors.text.tertiary,
    marginTop: 8,
    textAlign: 'center',
  },
  claimCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...schoolTheme.shadows.sm,
  },
  claimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  claimHeaderLeft: {
    flex: 1,
  },
  claimCategory: {
    fontSize: 16,
    fontFamily: schoolTheme.typography.fonts.bold,
    color: schoolTheme.colors.text.primary,
  },
  claimDate: {
    fontSize: 12,
    color: schoolTheme.colors.text.secondary,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontFamily: schoolTheme.typography.fonts.bold,
  },
  claimDescription: {
    fontSize: 14,
    color: schoolTheme.colors.text.secondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  claimFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  claimAmount: {
    fontSize: 20,
    fontFamily: schoolTheme.typography.fonts.bold,
    color: schoolTheme.colors.teacher.main,
  },
  receiptIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  receiptText: {
    fontSize: 12,
    color: schoolTheme.colors.success.main,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 400,
    ...schoolTheme.shadows.lg,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  datePickerTitle: {
    fontSize: 18,
    fontFamily: schoolTheme.typography.fonts.bold,
    color: schoolTheme.colors.text.primary,
  },
  dateInputContainer: {
    marginBottom: 20,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: schoolTheme.colors.text.primary,
    fontFamily: schoolTheme.typography.fonts.medium,
  },
  datePickerButton: {
    backgroundColor: schoolTheme.colors.teacher.main,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  datePickerButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: schoolTheme.typography.fonts.semibold,
  },
});
