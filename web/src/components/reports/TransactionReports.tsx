'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Search, Calendar, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import TransactionCharts from './TransactionCharts';

interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  reference: string;
  payment_method: string;
  amount: number;
  debit: number;
  credit: number;
  balance: number;
  status: string;
  notes?: string;
  receipt_url?: string;
}

export default function TransactionReports({ schoolId }: { schoolId: string }) {
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState('all');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Quick date range filters
  const setDateRange = (range: string) => {
    const today = new Date();
    const to = today.toISOString().split('T')[0];
    let from = '';

    switch (range) {
      case 'today':
        from = to;
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        from = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        from = monthAgo.toISOString().split('T')[0];
        break;
      case 'quarter':
        const quarterAgo = new Date(today);
        quarterAgo.setMonth(today.getMonth() - 3);
        from = quarterAgo.toISOString().split('T')[0];
        break;
      case 'year':
        const yearAgo = new Date(today);
        yearAgo.setFullYear(today.getFullYear() - 1);
        from = yearAgo.toISOString().split('T')[0];
        break;
    }

    setFromDate(from);
    setToDate(to);
  };

  // Fetch transactions
  const { data: transactionData, isLoading } = useQuery({
    queryKey: ['transactions', schoolId, fromDate, toDate, type, category, paymentMethod, search, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        school_id: schoolId,
        from_date: fromDate,
        to_date: toDate,
        page: page.toString(),
        limit: '50'
      });

      if (type !== 'all') params.append('type', type);
      if (category) params.append('category', category);
      if (paymentMethod && paymentMethod !== 'all') params.append('payment_method', paymentMethod);
      if (search) params.append('search', search);

      const response = await fetch(`/api/admin/reports/transactions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    },
    enabled: !!schoolId
  });

  // Fetch chart data
  const { data: chartData } = useQuery({
    queryKey: ['transaction-charts', schoolId, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        school_id: schoolId,
        from_date: fromDate,
        to_date: toDate
      });

      const response = await fetch(`/api/admin/reports/charts?${params}`);
      if (!response.ok) throw new Error('Failed to fetch chart data');
      return response.json();
    },
    enabled: !!schoolId
  });

  const transactions = transactionData?.data || [];
  const summary = transactionData?.summary || {
    total_transactions: 0,
    total_income: 0,
    total_expenses: 0,
    net_balance: 0
  };
  const pagination = transactionData?.pagination || { page: 1, pages: 1, total: 0 };

  // Export functions
  const exportToCSV = () => {
    if (transactions.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Date', 'Type', 'Category', 'Description', 'Reference', 'Payment Method', 'Debit', 'Credit', 'Balance', 'Status'];
    const rows = transactions.map((t: Transaction) => [
      t.date,
      t.type,
      t.category,
      t.description,
      t.reference,
      t.payment_method,
      t.debit,
      t.credit,
      t.balance,
      t.status
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${fromDate}_to_${toDate}.csv`;
    a.click();
    toast.success('CSV exported successfully');
  };

  const exportToExcel = async () => {
    toast.info('Excel export coming soon');
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      completed: { variant: 'default', label: 'Completed', className: 'bg-green-500' },
      pending: { variant: 'secondary', label: 'Pending' },
      approved: { variant: 'default', label: 'Approved', className: 'bg-blue-500' },
      paid: { variant: 'default', label: 'Paid', className: 'bg-green-600' },
      rejected: { variant: 'destructive', label: 'Rejected' }
    };

    const config = variants[status] || variants.pending;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Income</p>
                <p className="text-3xl font-bold text-green-600">₹{summary.total_income.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Expenses</p>
                <p className="text-3xl font-bold text-red-600">₹{summary.total_expenses.toLocaleString()}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Net Balance</p>
                <p className={`text-3xl font-bold ${summary.net_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{summary.net_balance.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Transactions</p>
                <p className="text-3xl font-bold">{summary.total_transactions}</p>
              </div>
              <FileText className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {chartData && <TransactionCharts data={chartData} />}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transaction History</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportToExcel}>
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Quick Date Filters */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setDateRange('today')}>Today</Button>
              <Button variant="outline" size="sm" onClick={() => setDateRange('week')}>This Week</Button>
              <Button variant="outline" size="sm" onClick={() => setDateRange('month')}>This Month</Button>
              <Button variant="outline" size="sm" onClick={() => setDateRange('quarter')}>This Quarter</Button>
              <Button variant="outline" size="sm" onClick={() => setDateRange('year')}>This Year</Button>
            </div>

            {/* Advanced Filters */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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

              <div>
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by description or reference..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Transaction Table */}
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : transactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction: Transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(transaction.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'} className={transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {transaction.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{transaction.category}</TableCell>
                        <TableCell className="max-w-xs truncate">{transaction.description}</TableCell>
                        <TableCell className="font-mono text-sm">{transaction.reference}</TableCell>
                        <TableCell className="capitalize">{transaction.payment_method}</TableCell>
                        <TableCell className="text-right text-red-600 font-semibold">
                          {transaction.debit > 0 ? `₹${transaction.debit.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-semibold">
                          {transaction.credit > 0 ? `₹${transaction.credit.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ₹{transaction.balance.toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No transactions found for the selected filters.
                </div>
              )}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing page {pagination.page} of {pagination.pages} ({pagination.total} total)
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.pages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
