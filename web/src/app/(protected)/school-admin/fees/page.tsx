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
import ApplyPayment from '@/components/fees/ApplyPayment';
import ExpenseTypeList from '@/components/fees/accounts/ExpenseTypeList';
import BankMasterList from '@/components/fees/accounts/BankMasterList';
import ChequeBookList from '@/components/fees/accounts/ChequeBookList';
import AdminExpenseClaims from '@/components/fees/AdminExpenseClaims';
import AdminExpenseManagement from '@/components/fees/AdminExpenseManagement';
import TransactionReports from '@/components/reports/TransactionReports';
import FeeStatusExport from '@/components/fees/FeeStatusExport';
import CarryForwardDues from '@/components/fees/CarryForwardDues';

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
type SettingsView = 'fee-types' | 'fee-structures' | 'fee-demand' | 'expense-types' | 'bank-master' | 'cheque-register' | 'export-fee-status' | 'carry-forward';
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
          <p>Loading finance dashboard...</p>
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
            <h1 className="text-3xl font-bold">Finance & Accounting</h1>
            <p className="text-muted-foreground">
              Comprehensive financial management and operations dashboard
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

        {/* Fee Collection Pie Charts */}
        {dashboardStats && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fee Collection Status</CardTitle>
                <CardDescription>Breakdown of total fees by payment status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-8">
                  {/* Pie Chart using conic-gradient */}
                  <div className="relative w-40 h-40 flex-shrink-0">
                    {(() => {
                      const total = dashboardStats.total_outstanding + dashboardStats.monthly_collections;
                      const collectedPercent = total > 0 ? (dashboardStats.monthly_collections / total) * 100 : 0;
                      return (
                        <>
                          <div
                            className="w-full h-full rounded-full"
                            style={{
                              background: `conic-gradient(
                                #22c55e 0% ${collectedPercent}%,
                                #ef4444 ${collectedPercent}% 100%
                              )`
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-background w-24 h-24 rounded-full flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{Math.round(collectedPercent)}%</div>
                                <div className="text-xs text-muted-foreground">Collected</div>
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  {/* Legend */}
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Collected</span>
                      </div>
                      <span className="text-sm font-semibold">₹{dashboardStats.monthly_collections.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm">Outstanding</span>
                      </div>
                      <span className="text-sm font-semibold">₹{dashboardStats.total_outstanding.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Student Fee Status</CardTitle>
                <CardDescription>Number of students by payment status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-8">
                  {/* Pie Chart using conic-gradient */}
                  <div className="relative w-40 h-40 flex-shrink-0">
                    {(() => {
                      const paidUp = dashboardStats.total_students - dashboardStats.pending_invoices;
                      const paidPercent = dashboardStats.total_students > 0
                        ? (paidUp / dashboardStats.total_students) * 100
                        : 0;
                      return (
                        <>
                          <div
                            className="w-full h-full rounded-full"
                            style={{
                              background: `conic-gradient(
                                #22c55e 0% ${paidPercent}%,
                                #f97316 ${paidPercent}% 100%
                              )`
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-background w-24 h-24 rounded-full flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{Math.round(paidPercent)}%</div>
                                <div className="text-xs text-muted-foreground">Paid Up</div>
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  {/* Legend */}
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Paid Up</span>
                      </div>
                      <span className="text-sm font-semibold">{dashboardStats.total_students - dashboardStats.pending_invoices}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span className="text-sm">Pending Payments</span>
                      </div>
                      <span className="text-sm font-semibold">{dashboardStats.pending_invoices}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => navigateToSection('settings', 'export-fee-status')}
              >
                <FileText className="h-6 w-6 text-indigo-600" />
                <span className="text-sm font-medium text-center">Export Fee Status</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => navigateToSection('settings', 'carry-forward')}
              >
                <TrendingUp className="h-6 w-6 text-purple-600" />
                <span className="text-sm font-medium text-center">Carry Forward Dues</span>
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
          <CardContent className="p-0">
            {accountsView === 'apply-payment' && schoolId && (
              <ApplyPayment schoolId={schoolId} />
            )}
            {accountsView === 'claim' && schoolId && (
              <AdminExpenseClaims schoolId={schoolId} />
            )}
            {accountsView === 'expenses' && schoolId && (
              <AdminExpenseManagement schoolId={schoolId} />
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
            { key: 'cheque-register', label: 'Cheque Register', icon: CheckSquare },
            { key: 'export-fee-status', label: 'Export Fee Status', icon: FileText },
            { key: 'carry-forward', label: 'Carry Forward Dues', icon: TrendingUp }
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
            {settingsView === 'expense-types' && schoolId && (
              <ExpenseTypeList schoolId={schoolId} />
            )}
            {settingsView === 'bank-master' && schoolId && (
              <BankMasterList schoolId={schoolId} />
            )}
            {settingsView === 'cheque-register' && schoolId && (
              <ChequeBookList schoolId={schoolId} />
            )}
            {settingsView === 'export-fee-status' && schoolId && (
              <FeeStatusExport schoolId={schoolId} />
            )}
            {settingsView === 'carry-forward' && schoolId && (
              <CarryForwardDues schoolId={schoolId} />
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
            <h1 className="text-3xl font-bold">Transaction Reports</h1>
            <p className="text-muted-foreground">Comprehensive financial reports and analytics</p>
          </div>
        </div>

        {schoolId && <TransactionReports schoolId={schoolId} />}
      </div>
    );
  }

  return null;
}