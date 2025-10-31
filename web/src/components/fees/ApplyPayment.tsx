'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Download, Printer, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-client';

interface Student {
  id: string;
  full_name: string;
  admission_no: string;
  grade: string;
  section: string;
}

interface FeeDemand {
  id: string;
  fee_structure_id?: string;
  fee_type: string;
  due_date: string | null;
  total_amount: number;
  discount: number;
  demand_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: 'paid' | 'partial' | 'pending' | 'overdue';
  isNew?: boolean; // Flag to indicate this fee doesn't have a demand record yet
}

interface PaymentFormData {
  fee_demand_id: string;
  amount: number;
  payment_method: 'cash' | 'cheque' | 'online' | 'card';
  payment_date: string;
  reference_number?: string;
  notes?: string;
}

export default function ApplyPayment({ schoolId }: { schoolId: string }) {
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState<FeeDemand | null>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [lastPaymentReceipt, setLastPaymentReceipt] = useState<any>(null);
  const [selectedDemands, setSelectedDemands] = useState<Set<string>>(new Set());
  const [showBulkPaymentDialog, setShowBulkPaymentDialog] = useState(false);
  const [manualAllocations, setManualAllocations] = useState<Record<string, number>>({});

  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({
    fee_demand_id: '',
    amount: 0,
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    notes: ''
  });

  // Helper function to format address
  const formatAddress = (address: any): string => {
    if (typeof address === 'string') return address;
    if (!address) return '';

    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.country) parts.push(address.country);
    if (address.postal_code) parts.push(address.postal_code);

    return parts.filter(Boolean).join(', ');
  };

  // Function to open receipt in new tab and print
  const printReceipt = () => {
    if (!lastPaymentReceipt) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print receipt');
      return;
    }

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Receipt - ${lastPaymentReceipt.payment.receipt_no}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 40px; }
            .receipt { max-width: 800px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; gap: 20px; }
            .header-content { flex: 1; text-align: center; }
            .header img { max-width: 80px; max-height: 80px; object-fit: contain; }
            .header h1 { font-size: 28px; margin-bottom: 8px; }
            .header p { color: #666; }
            .header .title { font-size: 18px; font-weight: bold; margin-top: 10px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; font-size: 14px; }
            .info-grid .right { text-align: right; }
            .student-details { background: #f5f5f5; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
            .student-details h3 { margin-bottom: 10px; }
            .student-details .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px; }
            .fee-details h3 { margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background: #f5f5f5; font-weight: bold; }
            td.right, th.right { text-align: right; }
            tfoot td { background: #f5f5f5; font-weight: bold; }
            .notes { font-size: 14px; margin-bottom: 20px; }
            .footer { border-top: 1px solid #ddd; padding-top: 15px; text-align: center; color: #666; font-size: 13px; }
            @media print {
              body { padding: 20px; }
              @page { margin: 20mm; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              ${lastPaymentReceipt.school.logo_url ? `<img src="${lastPaymentReceipt.school.logo_url}" alt="School Logo" />` : ''}
              <div class="header-content">
                <h1>${lastPaymentReceipt.school.name}</h1>
                <p>${lastPaymentReceipt.school.address}</p>
                ${lastPaymentReceipt.school.phone ? `<p>Phone: ${lastPaymentReceipt.school.phone}</p>` : ''}
                ${lastPaymentReceipt.school.email ? `<p>Email: ${lastPaymentReceipt.school.email}</p>` : ''}
                <p class="title">FEE PAYMENT RECEIPT</p>
              </div>
            </div>

            <div class="info-grid">
              <div>
                <p><strong>Receipt No:</strong> ${lastPaymentReceipt.payment.receipt_no}</p>
                <p><strong>Date:</strong> ${new Date(lastPaymentReceipt.payment.payment_date).toLocaleDateString('en-GB')}</p>
              </div>
              <div class="right">
                <p><strong>Payment Method:</strong> ${lastPaymentReceipt.payment.payment_method.toUpperCase()}</p>
                ${lastPaymentReceipt.payment.reference_number ? `<p><strong>Reference No:</strong> ${lastPaymentReceipt.payment.reference_number}</p>` : ''}
              </div>
            </div>

            <div class="student-details">
              <h3>Student Details</h3>
              <div class="grid">
                <p><strong>Name:</strong> ${lastPaymentReceipt.student.full_name}</p>
                <p><strong>Admission No:</strong> ${lastPaymentReceipt.student.admission_no}</p>
                <p><strong>Class:</strong> ${lastPaymentReceipt.student.grade} - ${lastPaymentReceipt.student.section}</p>
                ${lastPaymentReceipt.student.parent_name ? `<p><strong>Parent/Guardian:</strong> ${lastPaymentReceipt.student.parent_name}</p>` : ''}
                ${lastPaymentReceipt.student.parent_phone ? `<p><strong>Contact:</strong> ${lastPaymentReceipt.student.parent_phone}</p>` : ''}
              </div>
            </div>

            <div class="fee-details">
              <h3>Fee Details</h3>
              <table>
                <thead>
                  <tr>
                    <th>Fee Type</th>
                    <th class="right">Balance</th>
                    <th class="right">Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  ${lastPaymentReceipt.payments ?
                    lastPaymentReceipt.payments.map((payment: any) => `
                      <tr>
                        <td>${payment.fee_type}</td>
                        <td class="right">₹${(payment.demand?.balance_amount || payment.demand?.demand_amount || 0).toFixed(2)}</td>
                        <td class="right"><strong>₹${payment.amount.toFixed(2)}</strong></td>
                      </tr>
                    `).join('') :
                    `<tr>
                      <td>${lastPaymentReceipt.demand.fee_type}</td>
                      <td class="right">₹${lastPaymentReceipt.demand.balance_amount.toFixed(2)}</td>
                      <td class="right"><strong>₹${lastPaymentReceipt.payment.amount.toFixed(2)}</strong></td>
                    </tr>`
                  }
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="2" class="right">Total Paid:</td>
                    <td class="right">₹${(lastPaymentReceipt.totalAmount || lastPaymentReceipt.payment.amount).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            ${lastPaymentReceipt.payment.notes ? `
              <div class="notes">
                <p><strong>Notes:</strong> ${lastPaymentReceipt.payment.notes}</p>
              </div>
            ` : ''}

            <div class="footer">
              <p>This is a computer-generated receipt and does not require a signature.</p>
              <p style="margin-top: 8px;">Thank you for your payment!</p>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
  };

  // Fetch school details for receipt
  const { data: schoolData } = useQuery({
    queryKey: ['school', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('name, logo_url, address, phone_number, email_address')
        .eq('id', schoolId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!schoolId
  });

  // Fetch unique classes/grades from students
  const { data: classesData } = useQuery({
    queryKey: ['classes', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('grade')
        .eq('school_id', schoolId)
        .eq('status', 'active');

      if (error) throw error;

      // Get unique grades
      const uniqueGrades = [...new Set(data?.map(s => s.grade) || [])].sort();
      return { data: uniqueGrades.map(grade => ({ grade })) };
    },
    enabled: !!schoolId
  });

  // Fetch sections for selected class
  const { data: sectionsData } = useQuery({
    queryKey: ['sections', schoolId, selectedClass],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sections')
        .select('id, section, grade_text')
        .eq('school_id', schoolId)
        .ilike('grade_text', selectedClass)
        .order('section', { ascending: true });

      if (error) throw error;
      return { data };
    },
    enabled: !!schoolId && !!selectedClass
  });

  // Fetch students for selected class and section
  const { data: studentsData } = useQuery({
    queryKey: ['students', schoolId, selectedClass, selectedSection, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('students')
        .select(`
          id,
          full_name,
          admission_no,
          grade,
          section,
          student_parents (
            users (
              id,
              first_name,
              last_name,
              phone,
              email
            )
          )
        `)
        .eq('school_id', schoolId)
        .eq('status', 'active');

      if (selectedClass) query = query.eq('grade', selectedClass);
      if (selectedSection) query = query.eq('section', selectedSection);
      // Only apply search filter when student is NOT selected
      if (searchTerm && !selectedStudent) {
        query = query.or(`full_name.ilike.%${searchTerm}%,admission_no.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.order('full_name', { ascending: true });
      if (error) throw error;
      return { data };
    },
    enabled: !!schoolId
  });

  // Fetch fee structure for selected student's grade
  const { data: feeStructureData } = useQuery({
    queryKey: ['fee-structure', schoolId, selectedStudent?.grade],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fee_structures')
        .select(`
          id,
          amount,
          is_active,
          fee_categories (
            id,
            name,
            description
          )
        `)
        .eq('school_id', schoolId)
        .ilike('grade', selectedStudent?.grade)
        .eq('is_active', true);

      if (error) throw error;
      return { data };
    },
    enabled: !!schoolId && !!selectedStudent?.grade
  });

  // Fetch fee demands for selected student
  const { data: feeDemandsData, isLoading: loadingDemands } = useQuery({
    queryKey: ['fee-demands', schoolId, selectedStudent?.id],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/fees/demands?school_id=${schoolId}&student_id=${selectedStudent?.id}`
      );
      if (!response.ok) throw new Error('Failed to fetch fee demands');
      return response.json();
    },
    enabled: !!schoolId && !!selectedStudent
  });

  // Apply payment mutation
  const applyPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      // If this is a new demand (doesn't exist in database), create it first
      if (selectedDemand?.isNew) {
        // Create the demand first
        const demandResponse = await fetch(`/api/admin/fees/demands?school_id=${schoolId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            demands: [{
              student_id: selectedStudent?.id,
              fee_structure_id: selectedDemand.fee_structure_id,
              academic_year: new Date().getFullYear().toString(),
              original_amount: selectedDemand.total_amount,
              discount_amount: 0,
              demand_amount: selectedDemand.total_amount
            }]
          })
        });

        if (!demandResponse.ok) {
          throw new Error('Failed to create fee demand');
        }

        const demandResult = await demandResponse.json();
        const newDemand = demandResult.data[0];

        // Update the payment form with the new demand ID
        data.fee_demand_id = newDemand.id;
      }

      // Now apply the payment
      const response = await fetch(`/api/admin/fees/apply-payment?school_id=${schoolId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          student_id: selectedStudent?.id
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to apply payment');
      }
      return response.json();
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['fee-demands', schoolId, selectedStudent?.id] });
      toast.success('Payment applied successfully');
      setShowPaymentDialog(false);

      // Store receipt data and show receipt dialog
      const parentInfo = selectedStudent?.student_parents?.[0]?.users;
      const receiptNo = result.receipt_no || `RCP-${Date.now()}`;
      const parentName = parentInfo ? `${parentInfo.first_name || ''} ${parentInfo.last_name || ''}`.trim() : '';

      const receiptData = {
        student: {
          ...selectedStudent,
          parent_name: parentName,
          parent_phone: parentInfo?.phone || ''
        },
        demand: selectedDemand,
        payment: {
          ...paymentForm,
          receipt_no: receiptNo
        },
        school: {
          name: schoolData?.name || 'School Name',
          address: formatAddress(schoolData?.address),
          phone: schoolData?.phone_number || '',
          email: schoolData?.email_address || '',
          logo_url: schoolData?.logo_url
        }
      };

      setLastPaymentReceipt(receiptData);
      setShowReceiptDialog(true);
      resetPaymentForm();

      // Save receipt to database
      try {
        await fetch(`/api/admin/fees/receipts?school_id=${schoolId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: selectedStudent?.id,
            receipt_no: receiptNo,
            student_name: selectedStudent?.full_name,
            student_admission_no: selectedStudent?.admission_no,
            student_grade: selectedStudent?.grade,
            student_section: selectedStudent?.section,
            parent_name: parentName || null,
            parent_phone: parentInfo?.phone || null,
            parent_email: parentInfo?.email || null,
            payment_method: paymentForm.payment_method,
            payment_date: paymentForm.payment_date,
            reference_number: paymentForm.reference_number || null,
            notes: paymentForm.notes || null,
            receipt_items: {
              fee_type: selectedDemand?.fee_type,
              amount: paymentForm.amount,
              demand_id: selectedDemand?.id
            },
            total_amount: paymentForm.amount,
            school_name: schoolData?.name,
            school_address: formatAddress(schoolData?.address),
            school_phone: schoolData?.phone_number || null,
            school_email: schoolData?.email_address || null,
            school_logo_url: schoolData?.logo_url || null
          })
        });
      } catch (error) {
        console.error('Failed to save receipt to database:', error);
        // Don't show error to user - receipt is still displayed
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const handleSearch = () => {
    // Trigger refetch with current filters
    queryClient.invalidateQueries({ queryKey: ['students', schoolId] });
  };

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    setSearchTerm(`${student.full_name} - ${student.admission_no}`);
  };

  const handlePayment = (demand: FeeDemand) => {
    setSelectedDemand(demand);
    setPaymentForm({
      fee_demand_id: demand.id,
      amount: demand.balance_amount,
      payment_method: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      reference_number: '',
      notes: ''
    });
    setShowPaymentDialog(true);
  };

  const handleCheckboxChange = (demandId: string, checked: boolean) => {
    const newSelected = new Set(selectedDemands);
    if (checked) {
      newSelected.add(demandId);
    } else {
      newSelected.delete(demandId);
    }
    setSelectedDemands(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allDemandIds = feeDemands
        .filter(d => d.balance_amount > 0)
        .map(d => d.id);
      setSelectedDemands(new Set(allDemandIds));
    } else {
      setSelectedDemands(new Set());
    }
  };

  const handleBulkPayment = () => {
    if (selectedDemands.size === 0) {
      toast.error('Please select at least one fee to pay');
      return;
    }
    // Initialize manual allocations with balance amounts
    const initialAllocations: Record<string, number> = {};
    feeDemands
      .filter(d => selectedDemands.has(d.id))
      .forEach(d => {
        initialAllocations[d.id] = d.balance_amount;
      });
    setManualAllocations(initialAllocations);
    setShowBulkPaymentDialog(true);
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      fee_demand_id: '',
      amount: 0,
      payment_method: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      reference_number: '',
      notes: ''
    });
    setSelectedDemand(null);
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      toast.error('Please select a student');
      return;
    }
    if (paymentForm.amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (paymentForm.amount > (selectedDemand?.balance_amount || 0)) {
      toast.error('Payment amount cannot exceed balance amount');
      return;
    }
    applyPaymentMutation.mutate(paymentForm);
  };

  const classes = classesData?.data || [];
  const sections = sectionsData?.data || [];
  const students = studentsData?.data || [];
  const feeStructures = feeStructureData?.data || [];
  const existingDemands = feeDemandsData?.data || [];

  // Merge fee structure with existing demands to show all fee categories
  const feeDemands = feeStructures.map((structure: any) => {
    // Find if there's an existing demand for this fee structure
    const existingDemand = existingDemands.find(
      (demand: any) => demand.fee_structure_id === structure.id
    );

    if (existingDemand) {
      // Return the existing demand with fee category name
      return {
        ...existingDemand,
        fee_structure_id: structure.id,
        fee_type: structure.fee_categories?.name || 'Unknown'
      };
    } else {
      // Create a placeholder for fees that don't have demands yet
      return {
        id: `new-${structure.id}`,
        fee_structure_id: structure.id,
        fee_type: structure.fee_categories?.name || 'Unknown',
        due_date: null,
        total_amount: structure.amount || 0,
        discount: 0,
        demand_amount: structure.amount || 0,
        paid_amount: 0,
        balance_amount: structure.amount || 0,
        payment_status: 'pending' as const,
        isNew: true // Flag to indicate this is not yet in database
      };
    }
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-6">Accounts | Payment</h2>

          {/* Search Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <Label>Search by Class</Label>
              <Select value={selectedClass || undefined} onValueChange={(value) => setSelectedClass(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="---All---" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls: any) => (
                    <SelectItem key={cls.id} value={cls.grade}>
                      Class {cls.grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Search by Section</Label>
              <Select
                value={selectedSection || undefined}
                onValueChange={(value) => setSelectedSection(value)}
                disabled={!selectedClass}
              >
                <SelectTrigger>
                  <SelectValue placeholder="--Search by Section--" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((sec: any) => (
                    <SelectItem key={sec.id} value={sec.section}>
                      Section {sec.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Search by Student</Label>
              <div className="relative">
                <Input
                  placeholder="--Search by Student---"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
                {students.length > 0 && searchTerm && !selectedStudent && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {students.slice(0, 10).map((student: Student) => (
                      <div
                        key={student.id}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleStudentSelect(student)}
                      >
                        <div className="font-medium">{student.full_name}</div>
                        <div className="text-sm text-gray-500">
                          {student.admission_no} - Class {student.grade} {student.section}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-6 justify-between">
            <div className="flex gap-2">
              <Button key="search-btn" onClick={handleSearch} variant="default">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button key="excel-btn" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button key="print-btn" variant="outline">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
            {selectedDemands.size > 0 && (
              <Button onClick={handleBulkPayment} className="bg-green-600 hover:bg-green-700">
                Pay Selected ({selectedDemands.size}) - ₹
                {feeDemands
                  .filter(d => selectedDemands.has(d.id))
                  .reduce((sum, d) => sum + (d.balance_amount || 0), 0)
                  .toFixed(2)}
              </Button>
            )}
          </div>

          {/* Date Range Filter */}
          <div className="mb-6">
            <h3 className="font-semibold mb-4">Details of fee paid :</h3>
            <div className="flex gap-4 items-end">
              <div>
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div>
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
              <Button variant="outline">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Fee Details Table */}
          <div>
            <h3 className="font-semibold mb-4">Fee Details</h3>
            {loadingDemands ? (
              <div className="text-center py-8">Loading fee demands...</div>
            ) : !selectedStudent ? (
              <div className="text-center py-8 text-muted-foreground">
                Please select a student to view fee details
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-700">
                      <TableHead className="text-white w-12">
                        <Checkbox
                          checked={selectedDemands.size > 0 && selectedDemands.size === feeDemands.filter(d => d.balance_amount > 0).length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="text-white">Fee Type</TableHead>
                      <TableHead className="text-white">Due Date</TableHead>
                      <TableHead className="text-white">Total Amount</TableHead>
                      <TableHead className="text-white">Discount</TableHead>
                      <TableHead className="text-white">Demand Amount</TableHead>
                      <TableHead className="text-white">Paid Amount</TableHead>
                      <TableHead className="text-white">Bal Amount</TableHead>
                      <TableHead className="text-white">Payment Status</TableHead>
                      <TableHead className="text-white">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeDemands.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          No fee demands found for this student
                        </TableCell>
                      </TableRow>
                    ) : (
                      feeDemands.map((demand: FeeDemand) => (
                        <TableRow key={demand.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedDemands.has(demand.id)}
                              onCheckedChange={(checked) => handleCheckboxChange(demand.id, checked as boolean)}
                              disabled={demand.balance_amount <= 0}
                            />
                          </TableCell>
                          <TableCell>{demand.fee_type}</TableCell>
                          <TableCell>{demand.due_date ? new Date(demand.due_date).toLocaleDateString('en-GB') : '-'}</TableCell>
                          <TableCell>{(demand.total_amount || 0).toFixed(2)}</TableCell>
                          <TableCell>{demand.discount || 0}</TableCell>
                          <TableCell>{(demand.demand_amount || 0).toFixed(2)}</TableCell>
                          <TableCell>{(demand.paid_amount || 0).toFixed(2)}</TableCell>
                          <TableCell>{(demand.balance_amount || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                demand.payment_status === 'paid'
                                  ? 'bg-green-100 text-green-800'
                                  : demand.payment_status === 'partial'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {demand.payment_status.charAt(0).toUpperCase() + demand.payment_status.slice(1)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {demand.balance_amount > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-blue-600"
                                onClick={() => handlePayment(demand)}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Apply Payment</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitPayment} className="space-y-4">
            {selectedStudent && selectedDemand && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div key="student-name"><strong>Student:</strong> {selectedStudent.full_name}</div>
                  <div key="admission-no"><strong>Admission No:</strong> {selectedStudent.admission_no}</div>
                  <div key="class"><strong>Class:</strong> {selectedStudent.grade} {selectedStudent.section}</div>
                  <div key="fee-type"><strong>Fee Type:</strong> {selectedDemand.fee_type}</div>
                  {selectedDemand.due_date && (
                    <div key="due-date"><strong>Due Date:</strong> {new Date(selectedDemand.due_date).toLocaleDateString('en-GB')}</div>
                  )}
                  <div key="balance"><strong>Balance Amount:</strong> ₹{(selectedDemand.balance_amount || 0).toFixed(2)}</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Payment Date*</Label>
                <Input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Payment Method*</Label>
                <Select
                  value={paymentForm.payment_method}
                  onValueChange={(value: any) => setPaymentForm({ ...paymentForm, payment_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="online">Online Transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Amount*</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                  required
                  max={selectedDemand?.balance_amount}
                />
              </div>

              <div>
                <Label>Reference Number</Label>
                <Input
                  value={paymentForm.reference_number}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                  placeholder="Cheque/Transaction ID"
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Input
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Additional notes"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowPaymentDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={applyPaymentMutation.isPending}>
                {applyPaymentMutation.isPending ? 'Processing...' : 'Apply Payment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={(open) => setShowReceiptDialog(open)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
          </DialogHeader>

          {lastPaymentReceipt && (
            <div id="payment-receipt" className="bg-white p-8 space-y-6">
              {/* Header */}
              <div className="text-center border-b-2 pb-4">
                <h1 className="text-3xl font-bold">{lastPaymentReceipt.school.name}</h1>
                <p className="text-gray-600">{lastPaymentReceipt.school.address}</p>
                {lastPaymentReceipt.school.phone && (
                  <p className="text-gray-600">Phone: {lastPaymentReceipt.school.phone}</p>
                )}
                {lastPaymentReceipt.school.email && (
                  <p className="text-gray-600">Email: {lastPaymentReceipt.school.email}</p>
                )}
                <p className="text-lg font-semibold mt-2">FEE PAYMENT RECEIPT</p>
              </div>

              {/* Receipt Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Receipt No:</strong> {lastPaymentReceipt.payment.receipt_no}</p>
                  <p><strong>Date:</strong> {new Date(lastPaymentReceipt.payment.payment_date).toLocaleDateString('en-GB')}</p>
                </div>
                <div className="text-right">
                  <p><strong>Payment Method:</strong> {lastPaymentReceipt.payment.payment_method.toUpperCase()}</p>
                  {lastPaymentReceipt.payment.reference_number && (
                    <p><strong>Reference No:</strong> {lastPaymentReceipt.payment.reference_number}</p>
                  )}
                </div>
              </div>

              {/* Student Info */}
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-semibold mb-2">Student Details</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><strong>Name:</strong> {lastPaymentReceipt.student.full_name}</p>
                  <p><strong>Admission No:</strong> {lastPaymentReceipt.student.admission_no}</p>
                  <p><strong>Class:</strong> {lastPaymentReceipt.student.grade} - {lastPaymentReceipt.student.section}</p>
                  {lastPaymentReceipt.student.parent_name && (
                    <p><strong>Parent/Guardian:</strong> {lastPaymentReceipt.student.parent_name}</p>
                  )}
                  {lastPaymentReceipt.student.parent_phone && (
                    <p><strong>Contact:</strong> {lastPaymentReceipt.student.parent_phone}</p>
                  )}
                </div>
              </div>

              {/* Fee Details */}
              <div>
                <h3 className="font-semibold mb-2">Fee Details</h3>
                <table className="w-full border-collapse border">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">Fee Type</th>
                      <th className="border p-2 text-right">Balance</th>
                      <th className="border p-2 text-right">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Check if it's bulk payment or single payment */}
                    {lastPaymentReceipt.payments ? (
                      // Bulk payment - show multiple rows
                      lastPaymentReceipt.payments.map((payment: any, idx: number) => (
                        <tr key={idx}>
                          <td className="border p-2">{payment.fee_type}</td>
                          <td className="border p-2 text-right">₹{payment.demand?.balance_amount?.toFixed(2) || payment.demand?.demand_amount?.toFixed(2) || '0.00'}</td>
                          <td className="border p-2 text-right font-bold">₹{payment.amount.toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      // Single payment - show one row
                      <tr>
                        <td className="border p-2">{lastPaymentReceipt.demand.fee_type}</td>
                        <td className="border p-2 text-right">₹{lastPaymentReceipt.demand.balance_amount.toFixed(2)}</td>
                        <td className="border p-2 text-right font-bold">₹{lastPaymentReceipt.payment.amount.toFixed(2)}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold">
                      <td colSpan={2} className="border p-2 text-right">Total Paid:</td>
                      <td className="border p-2 text-right">
                        ₹{(lastPaymentReceipt.totalAmount || lastPaymentReceipt.payment.amount).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Notes */}
              {lastPaymentReceipt.payment.notes && (
                <div className="text-sm">
                  <p><strong>Notes:</strong> {lastPaymentReceipt.payment.notes}</p>
                </div>
              )}

              {/* Footer */}
              <div className="border-t pt-4 text-sm text-gray-600 text-center">
                <p>This is a computer-generated receipt and does not require a signature.</p>
                <p className="mt-2">Thank you for your payment!</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowReceiptDialog(false);
              }}
            >
              Close
            </Button>
            <Button 
              type="button" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                printReceipt();
              }}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Payment Dialog */}
      <Dialog open={showBulkPaymentDialog} onOpenChange={setShowBulkPaymentDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Pay Multiple Fees</DialogTitle>
          </DialogHeader>

          <form onSubmit={async (e) => {
            e.preventDefault();

            // Validate that at least one payment is being made
            const totalPayment = Object.values(manualAllocations).reduce((sum, val) => sum + val, 0);
            if (totalPayment <= 0) {
              toast.error('Please enter payment amounts');
              return;
            }

            try {
              // Prepare payments array for each fee
              const payments = Object.entries(manualAllocations)
                .filter(([_, amount]) => amount > 0)
                .map(([demandId, amount]) => {
                  const demand = feeDemands.find(d => d.id === demandId);
                  return {
                    fee_demand_id: demandId,
                    student_id: selectedStudent?.id,
                    amount,
                    payment_method: paymentForm.payment_method,
                    payment_date: paymentForm.payment_date,
                    reference_number: paymentForm.reference_number,
                    notes: paymentForm.notes,
                    fee_type: demand?.fee_type,
                    isNew: demand?.isNew,
                    fee_structure_id: demand?.fee_structure_id
                  };
                });

              // Call bulk payment API
              const response = await fetch(`/api/admin/fees/bulk-payment?school_id=${schoolId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payments })
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to process bulk payment');
              }

              const result = await response.json();

              // Refresh fee demands
              queryClient.invalidateQueries({ queryKey: ['fee-demands', schoolId, selectedStudent?.id] });

              toast.success('Bulk payment applied successfully');
              setShowBulkPaymentDialog(false);
              setSelectedDemands(new Set());

              // Show consolidated receipt
              const parentInfo = selectedStudent?.student_parents?.[0]?.users;
              const receiptNo = result.receipt_no || `RCP-${Date.now()}`;
              const parentName = parentInfo ? `${parentInfo.first_name || ''} ${parentInfo.last_name || ''}`.trim() : '';

              const receiptData = {
                student: {
                  ...selectedStudent,
                  parent_name: parentName,
                  parent_phone: parentInfo?.phone || ''
                },
                payments: payments.map(p => ({
                  ...p,
                  demand: feeDemands.find(d => d.id === p.fee_demand_id)
                })),
                totalAmount: totalPayment,
                payment: {
                  ...paymentForm,
                  amount: totalPayment,
                  receipt_no: receiptNo
                },
                school: {
                  name: schoolData?.name || 'School Name',
                  address: formatAddress(schoolData?.address),
                  phone: schoolData?.phone_number || '',
                  email: schoolData?.email_address || '',
                  logo_url: schoolData?.logo_url
                }
              };

              setLastPaymentReceipt(receiptData);
              setShowReceiptDialog(true);

              // Save receipt to database
              try {
                await fetch(`/api/admin/fees/receipts?school_id=${schoolId}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    student_id: selectedStudent?.id,
                    receipt_no: receiptNo,
                    student_name: selectedStudent?.full_name,
                    student_admission_no: selectedStudent?.admission_no,
                    student_grade: selectedStudent?.grade,
                    student_section: selectedStudent?.section,
                    parent_name: parentName || null,
                    parent_phone: parentInfo?.phone || null,
                    parent_email: parentInfo?.email || null,
                    payment_method: paymentForm.payment_method,
                    payment_date: paymentForm.payment_date,
                    reference_number: paymentForm.reference_number || null,
                    notes: paymentForm.notes || null,
                    receipt_items: payments.map(p => ({
                      fee_type: feeDemands.find(d => d.id === p.fee_demand_id)?.fee_type,
                      amount: p.amount,
                      demand_id: p.fee_demand_id
                    })),
                    total_amount: totalPayment,
                    school_name: schoolData?.name,
                    school_address: formatAddress(schoolData?.address),
                    school_phone: schoolData?.phone_number || null,
                    school_email: schoolData?.email_address || null,
                    school_logo_url: schoolData?.logo_url || null
                  })
                });
              } catch (error) {
                console.error('Failed to save receipt to database:', error);
                // Don't show error to user - receipt is still displayed
              }

            } catch (error: any) {
              toast.error(error.message);
            }
          }} className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Allocate Payment to Each Fee</h3>
              <div className="space-y-3">
                {feeDemands.filter(d => selectedDemands.has(d.id)).map(demand => (
                  <div key={demand.id} className="grid grid-cols-3 gap-2 items-center text-sm">
                    <span className="font-medium">{demand.fee_type}</span>
                    <span className="text-gray-600">Balance: ₹{(demand.balance_amount || 0).toFixed(2)}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600">₹</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={demand.balance_amount}
                        value={manualAllocations[demand.id] || 0}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setManualAllocations({
                            ...manualAllocations,
                            [demand.id]: Math.min(value, demand.balance_amount)
                          });
                        }}
                        className="h-8"
                      />
                    </div>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                  <span>Total Paying:</span>
                  <span className="text-green-600">
                    ₹{Object.values(manualAllocations).reduce((sum, val) => sum + val, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Payment Date*</Label>
                <Input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Payment Method*</Label>
                <Select
                  value={paymentForm.payment_method}
                  onValueChange={(value: any) => setPaymentForm({ ...paymentForm, payment_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="online">Online Transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Reference Number</Label>
                <Input
                  value={paymentForm.reference_number}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                  placeholder="Cheque/Transaction ID"
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Input
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Optional notes"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowBulkPaymentDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Apply Payment - ₹{Object.values(manualAllocations).reduce((sum, val) => sum + val, 0).toFixed(2)}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
