'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  TrendingUp,
  AlertTriangle,
  Clock,
  DollarSign,
  Grid3x3,
  ArrowRightLeft,
  FileText,
  Settings,
  PackagePlus,
  PackageMinus,
  PackageCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase-client';
import InventoryCategoryList from '@/components/inventory/InventoryCategoryList';
import InventoryItemList from '@/components/inventory/InventoryItemList';
import InventoryIssuanceList from '@/components/inventory/InventoryIssuanceList';
import InventoryTransactionHistory from '@/components/inventory/InventoryTransactionHistory';

type Section = 'dashboard' | 'items' | 'issuances' | 'transactions' | 'settings';

export default function InventoryManagementPage() {
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('school_id')
          .eq('id', user.id)
          .single();

        if (userData?.school_id) {
          setSchoolId(userData.school_id);
        }
      }
    };

    fetchUser();
  }, []);

  // Fetch dashboard data
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['inventory-dashboard', schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      const res = await fetch(`/api/admin/inventory/dashboard?school_id=${schoolId}`);
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      return res.json();
    },
    enabled: !!schoolId,
  });

  if (!schoolId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Inventory Management
          </h1>
          <p className="text-gray-600">
            Track and manage school inventory, issuances, and stock levels
          </p>
        </div>

        {/* Navigation Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Button
            variant={activeSection === 'dashboard' ? 'default' : 'outline'}
            onClick={() => setActiveSection('dashboard')}
            className="h-24 flex flex-col items-center justify-center gap-2"
          >
            <Grid3x3 className="h-8 w-8" />
            <span className="text-sm font-medium">Dashboard</span>
          </Button>

          <Button
            variant={activeSection === 'items' ? 'default' : 'outline'}
            onClick={() => setActiveSection('items')}
            className="h-24 flex flex-col items-center justify-center gap-2"
          >
            <Package className="h-8 w-8" />
            <span className="text-sm font-medium">Items</span>
          </Button>

          <Button
            variant={activeSection === 'issuances' ? 'default' : 'outline'}
            onClick={() => setActiveSection('issuances')}
            className="h-24 flex flex-col items-center justify-center gap-2"
          >
            <ArrowRightLeft className="h-8 w-8" />
            <span className="text-sm font-medium">Issuances</span>
          </Button>

          <Button
            variant={activeSection === 'transactions' ? 'default' : 'outline'}
            onClick={() => setActiveSection('transactions')}
            className="h-24 flex flex-col items-center justify-center gap-2"
          >
            <FileText className="h-8 w-8" />
            <span className="text-sm font-medium">Transactions</span>
          </Button>

          <Button
            variant={activeSection === 'settings' ? 'default' : 'outline'}
            onClick={() => setActiveSection('settings')}
            className="h-24 flex flex-col items-center justify-center gap-2"
          >
            <Settings className="h-8 w-8" />
            <span className="text-sm font-medium">Settings</span>
          </Button>
        </div>

        {/* Dashboard Section */}
        {activeSection === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Total Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {dashboardData?.summary?.totalItems || 0}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Low Stock Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {dashboardData?.summary?.lowStockCount || 0}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <PackageCheck className="h-4 w-4" />
                    Active Issuances
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {dashboardData?.summary?.activeIssuances || 0}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Overdue Returns
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {dashboardData?.summary?.overdueIssuances || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Total Value Card */}
            <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Total Inventory Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">
                  ₹{dashboardData?.summary?.totalValue?.toLocaleString() || 0}
                </div>
              </CardContent>
            </Card>

            {/* Low Stock Alerts */}
            {dashboardData?.lowStockItems && dashboardData.lowStockItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-600">
                    <AlertTriangle className="h-5 w-5" />
                    Low Stock Alerts
                  </CardTitle>
                  <CardDescription>
                    Items that are below minimum stock level
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dashboardData.lowStockItems.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-200"
                      >
                        <span className="font-medium">{item.name}</span>
                        <span className="text-sm">
                          Current: {item.current_stock} | Min: {item.minimum_stock_level}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Overdue Issuances */}
            {dashboardData?.overdueIssuances && dashboardData.overdueIssuances.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <Clock className="h-5 w-5" />
                    Overdue Returns
                  </CardTitle>
                  <CardDescription>Items that should have been returned</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dashboardData.overdueIssuances.map((issuance: any) => (
                      <div
                        key={issuance.id}
                        className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200"
                      >
                        <div>
                          <div className="font-medium">{issuance.item?.name}</div>
                          <div className="text-sm text-gray-600">
                            Issued to: {issuance.issued_to_name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-red-600">
                            Due: {new Date(issuance.expected_return_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Transactions */}
            {dashboardData?.recentTransactions && dashboardData.recentTransactions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Recent Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dashboardData.recentTransactions.map((transaction: any) => (
                      <div
                        key={transaction.id}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{transaction.item?.name}</div>
                          <div className="text-sm text-gray-600">
                            {transaction.transaction_type.charAt(0).toUpperCase() +
                              transaction.transaction_type.slice(1)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {transaction.transaction_type === 'issue' ||
                            transaction.transaction_type === 'damage' ||
                            transaction.transaction_type === 'loss'
                              ? '-'
                              : '+'}
                            {transaction.quantity}
                          </div>
                          <div className="text-sm text-gray-600">
                            {new Date(transaction.transaction_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Items Section */}
        {activeSection === 'items' && <InventoryItemList schoolId={schoolId} />}

        {/* Issuances Section */}
        {activeSection === 'issuances' && <InventoryIssuanceList schoolId={schoolId} />}

        {/* Transactions Section */}
        {activeSection === 'transactions' && (
          <InventoryTransactionHistory schoolId={schoolId} />
        )}

        {/* Settings Section */}
        {activeSection === 'settings' && <InventoryCategoryList schoolId={schoolId} />}
      </div>
    </div>
  );
}
