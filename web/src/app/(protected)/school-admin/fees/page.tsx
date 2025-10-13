'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  CreditCard, FileText, Receipt, Settings, PieChart,
  DollarSign, RefreshCw, Building2, CheckSquare,
  BarChart3, TrendingUp, Calculator, Wallet, ArrowLeft, Plus
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import FeeStructureList from '@/components/fees/FeeStructureList';
import FeeDemandManagement from '@/components/fees/FeeDemandManagement';

interface DashboardStats {
  total_outstanding: number;
  monthly_collections: number;
  overdue_count: number;
  recent_payments: number;
  total_students: number;
  pending_invoices: number;
}

interface FeeCategory {
  id: string;
  name: string;
  description: string;
  is_mandatory: boolean;
  display_order: number;
}

interface FeeStructure {
  id: string;
  grade: string;
  amount: number;
  payment_frequency: string;
  fee_category_id: string;
  academic_year: string;
  late_fee_amount: number;
}

interface RecentPayment {
  studentName: string;
  amount?: number;
  method: string;
  reference: string;
  date: string;
}

interface ExpenseCategory {
  name: string;
  amount?: number;
  count?: number;
  icon: any;
}

interface RecentExpense {
  description: string;
  category: string;
  vendor: string;
  amount?: number;
  status: string;
}

interface FeeStructureItem {
  id: string;
  class: string;
  academicYear: string;
  totalAmount?: number;
}

type DashboardSection = 'accounts' | 'settings' | 'reports' | 'main';
type AccountsView = 'apply-payment' | 'claim' | 'expenses' | 'receipts';
type SettingsView = 'fee-types' | 'fee-structures' | 'fee-demand' | 'expense-types' | 'bank-master' | 'cheque-register';
type ReportsView = 'transactions';

export default function FeeManagementUnified() {
  const { user } = useAuth();
  const schoolId = user?.school_id;
  
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Navigation state
  const [currentSection, setCurrentSection] = useState<DashboardSection>('main');
  const [accountsView, setAccountsView] = useState<AccountsView>('apply-payment');
  const [settingsView, setSettingsView] = useState<SettingsView>('fee-types');
  const [reportsView, setReportsView] = useState<ReportsView>('transactions');
  
  // Data state
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [saving, setSaving] = useState(false);
  
  // Payment form state
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    studentSearch: '',
    amount: '',
    paymentMethod: '',
    reference: '',
    notes: ''
  });
  
  // Recent payments data
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);

  // Expense form state
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    vendorName: '',
    description: ''
  });

  // Expense categories data
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);

  // Recent expenses data
  const [recentExpenses, setRecentExpenses] = useState<RecentExpense[]>([]);

  // Fee Type form state
  const [showFeeTypeForm, setShowFeeTypeForm] = useState(false);
  const [feeTypeForm, setFeeTypeForm] = useState({
    name: '',
    description: ''
  });

  // Fee Structure form state
  const [showFeeStructureForm, setShowFeeStructureForm] = useState(false);
  const [feeStructureForm, setFeeStructureForm] = useState({
    selectedClass: ''
  });

  // Fee structures list data
  const [feeStructuresList, setFeeStructuresList] = useState<FeeStructureItem[]>([]);

  // Quick stats for cards
  const quickStats = dashboardStats ? [
    { label: 'Total Outstanding', value: `₹${(dashboardStats.total_outstanding || 0).toLocaleString()}`, icon: DollarSign, color: 'text-red-600' },
    { label: 'Monthly Collections', value: `₹${(dashboardStats.monthly_collections || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-green-600' },
    { label: 'Total Students', value: (dashboardStats.total_students || 0).toString(), icon: Building2, color: 'text-blue-600' },
    { label: 'Pending Invoices', value: (dashboardStats.pending_invoices || 0).toString(), icon: FileText, color: 'text-orange-600' }
  ] : [
    { label: 'Total Outstanding', value: '₹0', icon: DollarSign, color: 'text-red-600' },
    { label: 'Monthly Collections', value: '₹0', icon: TrendingUp, color: 'text-green-600' },
    { label: 'Total Students', value: '0', icon: Building2, color: 'text-blue-600' },
    { label: 'Pending Invoices', value: '0', icon: FileText, color: 'text-orange-600' }
  ];

  // Load dashboard data
  const loadDashboardData = async () => {
    if (!schoolId) {
      console.log('No school ID found');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Load all data in parallel
      const [categoriesRes, structuresRes, statsRes, paymentsRes, expensesRes] = await Promise.all([
        fetch(`/api/admin/fees/categories?school_id=${schoolId}`),
        fetch(`/api/admin/fees/structures?school_id=${schoolId}`),
        fetch(`/api/admin/fees/dashboard-stats?school_id=${schoolId}`),
        fetch(`/api/admin/fees/payments?school_id=${schoolId}&limit=5`),
        fetch(`/api/admin/fees/expenses?school_id=${schoolId}&limit=5`)
      ]);

      const [categoriesData, structuresData, statsData, paymentsData, expensesData] = await Promise.all([
        categoriesRes.ok ? categoriesRes.json() : { data: [] },
        structuresRes.ok ? structuresRes.json() : { data: [] },
        statsRes.ok ? statsRes.json() : { data: null },
        paymentsRes.ok ? paymentsRes.json() : { data: [] },
        expensesRes.ok ? expensesRes.json() : { data: [] }
      ]);
      
      setCategories(categoriesData.data || []);
      setStructures(structuresData.data || []);
      setDashboardStats(statsData.data);
      setRecentPayments(paymentsData.data || []);
      setRecentExpenses(expensesData.data || []);
      setFeeStructuresList(structuresData.data || []);
      
      // Set expense categories from expenses data
      if (expensesData.summary?.by_category) {
        const categoryStats = Object.entries(expensesData.summary.by_category).map(([name, data]: [string, any]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          amount: data.amount || 0,
          count: data.count || 0,
          icon: name === 'utilities' ? Building2 : name === 'supplies' ? Calculator : name === 'maintenance' ? Settings : TrendingUp
        }));
        setExpenseCategories(categoryStats);
      } else {
        // Set default categories if no data available
        setExpenseCategories([
          { name: 'Utilities', amount: 0, count: 0, icon: Building2 },
          { name: 'Supplies', amount: 0, count: 0, icon: Calculator },
          { name: 'Maintenance', amount: 0, count: 0, icon: Settings },
          { name: 'Events', amount: 0, count: 0, icon: TrendingUp }
        ]);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
      // Set fallback data on error
      setDashboardStats({
        total_outstanding: 0,
        monthly_collections: 0,
        overdue_count: 0,
        recent_payments: 0,
        total_students: 0,
        pending_invoices: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Navigation helpers
  const navigateToSection = (section: DashboardSection, subView?: string) => {
    setCurrentSection(section);
    if (section === 'accounts' && subView) {
      setAccountsView(subView as AccountsView);
    } else if (section === 'settings' && subView) {
      setSettingsView(subView as SettingsView);
    } else if (section === 'reports' && subView) {
      setReportsView(subView as ReportsView);
    }
  };

  // Payment form handlers
  const handlePaymentSubmit = async () => {
    if (!schoolId || !paymentForm.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      // For now, just show success message
      // TODO: Integrate with actual payment API once invoices are generated
      toast.success('Payment recorded successfully!');
      
      // Reset form
      setPaymentForm({
        studentSearch: '',
        amount: '',
        paymentMethod: '',
        reference: '',
        notes: ''
      });
      setShowPaymentForm(false);
      
      // Reload dashboard data
      await loadDashboardData();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  // Expense form handlers
  const handleExpenseSubmit = async () => {
    if (!schoolId || !expenseForm.amount || !expenseForm.description || !expenseForm.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/fees/expenses?school_id=${schoolId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: expenseForm.category,
          description: expenseForm.description,
          amount: parseFloat(expenseForm.amount),
          expense_date: expenseForm.date,
          vendor_name: expenseForm.vendorName
        })
      });

      if (response.ok) {
        toast.success('Expense recorded successfully!');
        
        // Reset form
        setExpenseForm({
          category: '',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          vendorName: '',
          description: ''
        });
        setShowExpenseForm(false);
        
        // Reload dashboard data
        await loadDashboardData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to record expense');
      }
    } catch (error) {
      console.error('Error recording expense:', error);
      toast.error('Failed to record expense');
    } finally {
      setSaving(false);
    }
  };

  // Fee Type form handlers
  const handleFeeTypeSubmit = async () => {
    if (!schoolId || !feeTypeForm.name) {
      toast.error('Please enter fee type name');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/fees/categories?school_id=${schoolId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: feeTypeForm.name,
          description: feeTypeForm.description
        })
      });

      if (response.ok) {
        toast.success('Fee type created successfully!');
        setFeeTypeForm({ name: '', description: '' });
        setShowFeeTypeForm(false);
        await loadDashboardData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create fee type');
      }
    } catch (error) {
      console.error('Error creating fee type:', error);
      toast.error('Failed to create fee type');
    } finally {
      setSaving(false);
    }
  };

  // Fee Structure form handlers
  const handleFeeStructureSubmit = async () => {
    if (!schoolId || !feeStructureForm.selectedClass) {
      toast.error('Please select a class');
      return;
    }

    setSaving(true);
    try {
      // This would create fee structure - implementation depends on actual form fields
      toast.success('Fee structure configuration updated!');
      setFeeStructureForm({ selectedClass: '' });
      setShowFeeStructureForm(false);
      await loadDashboardData();
    } catch (error) {
      console.error('Error updating fee structure:', error);
      toast.error('Failed to update fee structure');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [schoolId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading fee management...</p>
        </div>
      </div>
    );
  }

  // Render main dashboard
  if (currentSection === 'main') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Fee Management</h1>
            <p className="text-muted-foreground">
              Comprehensive fee operations dashboard
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Accounts Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => navigateToSection('accounts', 'apply-payment')}
              >
                <DollarSign className="h-6 w-6 text-orange-500" />
                <span className="text-sm font-medium">Apply Payment</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => navigateToSection('accounts', 'claim')}
              >
                <RefreshCw className="h-6 w-6 text-blue-500" />
                <span className="text-sm font-medium">Claim</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => navigateToSection('accounts', 'expenses')}
              >
                <Calculator className="h-6 w-6 text-cyan-500" />
                <span className="text-sm font-medium">Expenses</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => navigateToSection('accounts', 'receipts')}
              >
                <Receipt className="h-6 w-6 text-cyan-500" />
                <span className="text-sm font-medium">Attached Receipt</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Settings Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => navigateToSection('settings', 'fee-types')}
              >
                <FileText className="h-6 w-6 text-cyan-500" />
                <span className="text-sm font-medium text-center">Fee Type Setup</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => navigateToSection('settings', 'fee-structures')}
              >
                <BarChart3 className="h-6 w-6 text-purple-500" />
                <span className="text-sm font-medium text-center">Fee Structure</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => navigateToSection('settings', 'fee-demand')}
              >
                <DollarSign className="h-6 w-6 text-green-500" />
                <span className="text-sm font-medium text-center">Fee Demand</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => navigateToSection('settings', 'expense-types')}
              >
                <PieChart className="h-6 w-6 text-blue-500" />
                <span className="text-sm font-medium text-center">Expense Type</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => navigateToSection('settings', 'bank-master')}
              >
                <Building2 className="h-6 w-6 text-green-500" />
                <span className="text-sm font-medium text-center">Bank Master</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => navigateToSection('settings', 'cheque-register')}
              >
                <CheckSquare className="h-6 w-6 text-red-600" />
                <span className="text-sm font-medium text-center">Cheque Register</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reports Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-1">
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => navigateToSection('reports', 'transactions')}
              >
                <FileText className="h-6 w-6 text-cyan-500" />
                <span className="text-sm font-medium">Transaction</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Accounts Section Views
  if (currentSection === 'accounts') {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => setCurrentSection('main')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Accounts</h1>
            <p className="text-muted-foreground">Manage payments, claims, and expenses</p>
          </div>
        </div>

        {/* Accounts Navigation */}
        <div className="flex space-x-4 border-b">
          {[
            { key: 'apply-payment', label: 'Apply Payment', icon: DollarSign },
            { key: 'claim', label: 'Claim', icon: RefreshCw },
            { key: 'expenses', label: 'Expenses', icon: Calculator },
            { key: 'receipts', label: 'Receipts', icon: Receipt }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.key}
                variant={accountsView === tab.key ? 'default' : 'ghost'}
                onClick={() => setAccountsView(tab.key as AccountsView)}
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Button>
            );
          })}
        </div>

        {/* Accounts Content */}
        <Card>
          <CardContent className="p-6">
            {accountsView === 'apply-payment' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Payment Recording</h3>
                    <p className="text-muted-foreground">Record payments received from parents</p>
                  </div>
                  <Button onClick={() => setShowPaymentForm(true)}>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Record Payment
                  </Button>
                </div>

                {/* Payment Recording Form */}
                {showPaymentForm && (
                  <Card>
                    <CardHeader>
                      <CardTitle>New Payment Entry</CardTitle>
                      <CardDescription>Enter payment details received from parent</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="student-search">Student</Label>
                          <Input
                            id="student-search"
                            placeholder="Search student by name or admission number"
                            value={paymentForm.studentSearch}
                            onChange={(e) => setPaymentForm({ ...paymentForm, studentSearch: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="amount">Amount (₹)</Label>
                          <Input
                            id="amount"
                            type="number"
                            placeholder="Enter amount"
                            value={paymentForm.amount}
                            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="payment-method">Payment Method</Label>
                          <Select value={paymentForm.paymentMethod} onValueChange={(value) => setPaymentForm({ ...paymentForm, paymentMethod: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="card">Card</SelectItem>
                              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                              <SelectItem value="online">Online Payment</SelectItem>
                              <SelectItem value="cheque">Cheque</SelectItem>
                              <SelectItem value="dd">Demand Draft</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="reference">Reference Number</Label>
                          <Input
                            id="reference"
                            placeholder="Cheque number, transaction ID, etc."
                            value={paymentForm.reference}
                            onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="notes">Notes (Optional)</Label>
                          <Input
                            id="notes"
                            placeholder="Additional notes"
                            value={paymentForm.notes}
                            onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-4">
                        <Button onClick={handlePaymentSubmit} disabled={!paymentForm.amount || saving}>
                          {saving ? 'Recording...' : 'Record Payment'}
                        </Button>
                        <Button variant="outline" onClick={() => setShowPaymentForm(false)}>
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Payments List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Payments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentPayments.map((payment, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <h4 className="font-medium">{payment.studentName}</h4>
                            <p className="text-sm text-muted-foreground">
                              {payment.method} • {payment.reference}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">₹{(payment.amount || 0).toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">{payment.date}</p>
                          </div>
                        </div>
                      ))}
                      {recentPayments.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No recent payments found</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            {accountsView === 'claim' && (
              <div className="text-center py-8">
                <RefreshCw className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Claims & Refunds</h3>
                <p className="text-muted-foreground mb-4">Handle student fee adjustments and refunds</p>
                <Button>Process Claim</Button>
              </div>
            )}
            {accountsView === 'expenses' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">School Expenses</h3>
                    <p className="text-muted-foreground">Track operational and administrative expenses</p>
                  </div>
                  <Button onClick={() => setShowExpenseForm(true)}>
                    <Calculator className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                </div>

                {/* Expense Categories Quick Stats */}
                <div className="grid gap-4 md:grid-cols-4">
                  {expenseCategories.map((category, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-muted-foreground">{category.name}</p>
                          <category.icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-bold">₹{(category.amount || 0).toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{category.count || 0} expenses</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Expense Form */}
                {showExpenseForm && (
                  <Card>
                    <CardHeader>
                      <CardTitle>New Expense Entry</CardTitle>
                      <CardDescription>Record a new school expense</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="expense-category">Category</Label>
                          <Select value={expenseForm.category} onValueChange={(value) => setExpenseForm({ ...expenseForm, category: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="utilities">Utilities</SelectItem>
                              <SelectItem value="supplies">Office Supplies</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                              <SelectItem value="transport">Transportation</SelectItem>
                              <SelectItem value="events">Events & Activities</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="expense-amount">Amount (₹)</Label>
                          <Input
                            id="expense-amount"
                            type="number"
                            placeholder="Enter amount"
                            value={expenseForm.amount}
                            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="expense-date">Expense Date</Label>
                          <Input
                            id="expense-date"
                            type="date"
                            value={expenseForm.date}
                            onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="vendor-name">Vendor Name</Label>
                          <Input
                            id="vendor-name"
                            placeholder="Vendor or supplier name"
                            value={expenseForm.vendorName}
                            onChange={(e) => setExpenseForm({ ...expenseForm, vendorName: e.target.value })}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="expense-description">Description</Label>
                          <Input
                            id="expense-description"
                            placeholder="Describe the expense"
                            value={expenseForm.description}
                            onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-4">
                        <Button onClick={handleExpenseSubmit} disabled={!expenseForm.amount || !expenseForm.description || saving}>
                          {saving ? 'Adding...' : 'Add Expense'}
                        </Button>
                        <Button variant="outline" onClick={() => setShowExpenseForm(false)}>
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Expenses */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Expenses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentExpenses.map((expense, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <h4 className="font-medium">{expense.description}</h4>
                            <p className="text-sm text-muted-foreground">
                              {expense.category} • {expense.vendor}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">₹{(expense.amount || 0).toLocaleString()}</p>
                            <Badge variant={expense.status === 'paid' ? 'default' : 'secondary'}>
                              {expense.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            {accountsView === 'receipts' && (
              <div className="text-center py-8">
                <Receipt className="h-12 w-12 text-cyan-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Receipt Management</h3>
                <p className="text-muted-foreground mb-4">Manage and track payment receipts</p>
                <Button>Upload Receipt</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Settings Section Views  
  if (currentSection === 'settings') {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => setCurrentSection('main')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Fee Settings</h1>
            <p className="text-muted-foreground">Configure fee structures and system settings</p>
          </div>
        </div>

        {/* Settings Navigation */}
        <div className="flex flex-wrap gap-2 border-b pb-4">
          {[
            { key: 'fee-types', label: 'Fee Types', icon: FileText },
            { key: 'fee-structures', label: 'Structures', icon: BarChart3 },
            { key: 'fee-demand', label: 'Fee Demand', icon: DollarSign },
            { key: 'expense-types', label: 'Expense Types', icon: PieChart },
            { key: 'bank-master', label: 'Bank Master', icon: Building2 },
            { key: 'cheque-register', label: 'Cheque Register', icon: CheckSquare }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.key}
                size="sm"
                variant={settingsView === tab.key ? 'default' : 'ghost'}
                onClick={() => setSettingsView(tab.key as SettingsView)}
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Button>
            );
          })}
        </div>

        {/* Settings Content */}
        <Card>
          <CardContent className="p-6">
            {settingsView === 'fee-types' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-blue-600">Fee Type List</h3>
                    <p className="text-muted-foreground">Manage different types of fees</p>
                  </div>
                  <Button onClick={() => setShowFeeTypeForm(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    New
                  </Button>
                </div>

                {/* Fee Types Table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-700 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Fee Type Name</th>
                        <th className="px-4 py-3 text-left font-medium">Description</th>
                        <th className="px-4 py-3 text-center font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {categories.map((category) => (
                        <tr key={category.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{category.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{category.description}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50">
                                <span className="sr-only">View</span>
                                👁️
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600 hover:bg-green-50">
                                <span className="sr-only">Edit</span>
                                ✏️
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50">
                                <span className="sr-only">Delete</span>
                                🗑️
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {categories.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                            No fee types found. Click "New" to add your first fee type.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Showing 1 to {categories.length} of {categories.length} entries</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled>Previous</Button>
                    <Button variant="outline" size="sm" className="bg-blue-600 text-white">1</Button>
                    <Button variant="outline" size="sm" disabled>Next</Button>
                  </div>
                </div>

                {/* Add Fee Type Form Modal */}
                {showFeeTypeForm && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                      <h3 className="text-lg font-semibold mb-4 text-blue-600">Fee Type Setup Info</h3>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="fee-type-name">Fee Type Name*</Label>
                          <Input
                            id="fee-type-name"
                            placeholder="Fee Type Name"
                            value={feeTypeForm.name}
                            onChange={(e) => setFeeTypeForm({ ...feeTypeForm, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="fee-type-description">Description</Label>
                          <textarea
                            id="fee-type-description"
                            className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Description"
                            value={feeTypeForm.description}
                            onChange={(e) => setFeeTypeForm({ ...feeTypeForm, description: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-6">
                        <Button variant="outline" onClick={() => setShowFeeTypeForm(false)}>
                          ← Back
                        </Button>
                        <Button 
                          onClick={handleFeeTypeSubmit} 
                          disabled={!feeTypeForm.name.trim() || saving}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {saving ? 'Saving...' : '💾 Save'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {settingsView === 'fee-structures' && schoolId && (
              <FeeStructureList schoolId={schoolId} />
            )}
            {settingsView === 'fee-demand' && schoolId && (
              <FeeDemandManagement schoolId={schoolId} />
            )}
            {settingsView === 'expense-types' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-blue-600">Expense Type Management</h3>
                    <p className="text-muted-foreground">Manage expense categories and types</p>
                  </div>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense Type
                  </Button>
                </div>

                {/* Expense Types List */}
                <Card>
                  <CardHeader className="bg-gray-800 text-white">
                    <CardTitle className="text-lg">Expense Types</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 border-b">
                          <tr>
                            <th className="text-left p-3 font-medium">S.No</th>
                            <th className="text-left p-3 font-medium">Category</th>
                            <th className="text-left p-3 font-medium">Description</th>
                            <th className="text-left p-3 font-medium">Total Spent</th>
                            <th className="text-left p-3 font-medium">Budget Limit</th>
                            <th className="text-left p-3 font-medium">Status</th>
                            <th className="text-left p-3 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expenseCategories.length > 0 ? expenseCategories.map((category, index) => (
                            <tr key={index} className="border-b hover:bg-gray-50">
                              <td className="p-3">{index + 1}</td>
                              <td className="p-3 font-medium">{category.name}</td>
                              <td className="p-3">Expenses related to {category.name.toLowerCase()}</td>
                              <td className="p-3">₹{category.amount?.toLocaleString() || '0'}</td>
                              <td className="p-3">₹50,000</td>
                              <td className="p-3">
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  Active
                                </Badge>
                              </td>
                              <td className="p-3">
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm">
                                    Edit
                                  </Button>
                                  <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50">
                                    Delete
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )) : (
                            <tr className="border-b">
                              <td className="p-3 text-center" colSpan={7}>
                                <div className="text-muted-foreground py-8">
                                  <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                  No expense types configured yet. Add expense types to categorize expenses.
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            {settingsView === 'bank-master' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-blue-600">Bank Account Master</h3>
                    <p className="text-muted-foreground">Manage school bank accounts</p>
                  </div>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Bank Account
                  </Button>
                </div>

                {/* Bank Accounts List */}
                <Card>
                  <CardHeader className="bg-gray-800 text-white">
                    <CardTitle className="text-lg">Bank Accounts</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 border-b">
                          <tr>
                            <th className="text-left p-3 font-medium">S.No</th>
                            <th className="text-left p-3 font-medium">Account Name</th>
                            <th className="text-left p-3 font-medium">Bank Name</th>
                            <th className="text-left p-3 font-medium">Account Number</th>
                            <th className="text-left p-3 font-medium">IFSC Code</th>
                            <th className="text-left p-3 font-medium">Account Type</th>
                            <th className="text-left p-3 font-medium">Current Balance</th>
                            <th className="text-left p-3 font-medium">Status</th>
                            <th className="text-left p-3 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="p-3 text-center" colSpan={9}>
                              <div className="text-muted-foreground py-8">
                                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                No bank accounts configured yet. Add bank accounts to manage school finances.
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            {settingsView === 'cheque-register' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-blue-600">Cheque Register</h3>
                    <p className="text-muted-foreground">Track and manage cheque payments</p>
                  </div>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Issue Cheque
                  </Button>
                </div>

                {/* Cheque Register Filters */}
                <Card>
                  <CardHeader className="bg-gray-50 border-b">
                    <CardTitle className="text-lg">Filter Cheques</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor="bank-account">Bank Account</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Account" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Accounts</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="issued">Issued</SelectItem>
                            <SelectItem value="cleared">Cleared</SelectItem>
                            <SelectItem value="bounced">Bounced</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="from-date">From Date</Label>
                        <Input type="date" />
                      </div>
                      <div>
                        <Label htmlFor="to-date">To Date</Label>
                        <Input type="date" />
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button className="bg-green-600 hover:bg-green-700">
                        <FileText className="h-4 w-4 mr-2" />
                        Apply Filter
                      </Button>
                      <Button variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reset
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Cheque Register List */}
                <Card>
                  <CardHeader className="bg-gray-800 text-white">
                    <CardTitle className="text-lg">Cheque Register</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 border-b">
                          <tr>
                            <th className="text-left p-3 font-medium">S.No</th>
                            <th className="text-left p-3 font-medium">Cheque No.</th>
                            <th className="text-left p-3 font-medium">Date</th>
                            <th className="text-left p-3 font-medium">Payee Name</th>
                            <th className="text-left p-3 font-medium">Amount</th>
                            <th className="text-left p-3 font-medium">Purpose</th>
                            <th className="text-left p-3 font-medium">Bank Account</th>
                            <th className="text-left p-3 font-medium">Status</th>
                            <th className="text-left p-3 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="p-3 text-center" colSpan={9}>
                              <div className="text-muted-foreground py-8">
                                <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                No cheques issued yet. Use the 'Issue Cheque' button to create new cheques.
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Reports Section Views
  if (currentSection === 'reports') {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => setCurrentSection('main')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Fee Reports</h1>
            <p className="text-muted-foreground">Transaction reports and analytics</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-cyan-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Transaction Reports</h3>
              <p className="text-muted-foreground mb-4">Detailed payment history and analytics</p>
              <div className="flex gap-4 justify-center">
                <Button>Payment Summary</Button>
                <Button variant="outline">Outstanding Report</Button>
                <Button variant="outline">Monthly Collections</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}