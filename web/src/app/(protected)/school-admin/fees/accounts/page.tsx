'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import ExpenseTypeList from '@/components/fees/accounts/ExpenseTypeList';
import BankMasterList from '@/components/fees/accounts/BankMasterList';
import ChequeBookList from '@/components/fees/accounts/ChequeBookList';
import { Building2, CreditCard, BookOpen } from 'lucide-react';

export default function AccountsSettingsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState('expense-types');

  // Set active tab from URL parameter on mount
  useEffect(() => {
    if (tabParam && ['expense-types', 'bank-master', 'cheque-books'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  if (!user?.school_id) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">School ID not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Accounts Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage expense types, bank accounts, and cheque books
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="expense-types" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Expense Types
          </TabsTrigger>
          <TabsTrigger value="bank-master" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Bank Master
          </TabsTrigger>
          <TabsTrigger value="cheque-books" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Cheque Books
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expense-types" className="mt-6">
          <ExpenseTypeList schoolId={user.school_id} />
        </TabsContent>

        <TabsContent value="bank-master" className="mt-6">
          <BankMasterList schoolId={user.school_id} />
        </TabsContent>

        <TabsContent value="cheque-books" className="mt-6">
          <ChequeBookList schoolId={user.school_id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
