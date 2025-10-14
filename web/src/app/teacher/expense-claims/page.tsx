'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import ExpenseClaimForm from '@/components/fees/ExpenseClaimForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function TeacherExpenseClaimsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Get schoolId from user
  const schoolId = (user as any)?.school_id || '';
  const userId = user?.id || '';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!schoolId || !userId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-500">Unable to load school information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/teacher')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Receipt className="h-8 w-8 text-blue-600" />
            Expense Claims
          </h1>
          <p className="text-gray-600 mt-2">
            Submit and track your expense reimbursement claims
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Receipt className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">How to submit an expense claim</h3>
              <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
                <li>Fill in your expense details including date, category, and amount</li>
                <li>Upload a clear photo or PDF of the receipt (required for approval)</li>
                <li>Provide your bank details for reimbursement</li>
                <li>Submit and track the status of your claim</li>
                <li>Once approved, the amount will be credited to your account</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expense Claim Form Component */}
      <ExpenseClaimForm schoolId={schoolId} userId={userId} />
    </div>
  );
}
