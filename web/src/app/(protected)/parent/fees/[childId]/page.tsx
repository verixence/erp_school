'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
  useChildFeeDemands,
  useChildFeeSummary,
  useChildPaymentHistory,
  usePaymentGatewayStatus,
  useChildren,
} from '@/hooks/use-parent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Clock,
  Wallet,
  Download,
  Calendar,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { FeePaymentModal } from '@/components/parent/FeePaymentModal';

export default function ChildFeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const childId = params.childId as string;
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | undefined>();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Fetch data
  const { data: children } = useChildren(user?.id);
  const { data: feeDemands, isLoading: demandsLoading, refetch: refetchDemands } = useChildFeeDemands(childId, selectedAcademicYear);
  const { data: feeSummary, isLoading: summaryLoading, refetch: refetchSummary } = useChildFeeSummary(childId, selectedAcademicYear);
  const { data: paymentHistory, isLoading: historyLoading, refetch: refetchHistory } = useChildPaymentHistory(childId, selectedAcademicYear);
  const { data: gatewayStatus } = usePaymentGatewayStatus();

  // Handle payment success
  const handlePaymentSuccess = () => {
    refetchDemands();
    refetchSummary();
    refetchHistory();
  };

  // Find current child
  const currentChild = children?.find((c: any) => c.id === childId);

  const isLoading = demandsLoading || summaryLoading || historyLoading;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Get payment status badge
  const getStatusBadge = (status: string, isOverdue: boolean) => {
    if (isOverdue) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">Paid</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-500">Partial</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/parent/fees')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{currentChild?.full_name || 'Student'}</h1>
          <p className="text-muted-foreground">
            {currentChild?.sections?.grade && currentChild?.sections?.section
              ? `Grade ${currentChild.sections.grade} - ${currentChild.sections.section}`
              : 'Fee Details'}
            {currentChild?.admission_number && ` • ${currentChild.admission_number}`}
          </p>
        </div>
      </div>

      {/* Overdue Alert */}
      {feeSummary && feeSummary.overdue_count > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Attention:</strong> You have {feeSummary.overdue_count} overdue fee(s) totaling{' '}
            {formatCurrency(feeSummary.overdue_amount)}. Please clear them as soon as possible.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Demand</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(feeSummary?.total_demand || 0)}
            </div>
            {feeSummary && feeSummary.total_discount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Discount: {formatCurrency(feeSummary.total_discount)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Amount Paid</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(feeSummary?.total_paid || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {feeSummary?.paid_count || 0} fee(s) paid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Balance Due</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(feeSummary?.total_balance || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {feeSummary?.pending_count || 0} pending • {feeSummary?.partial_count || 0} partial
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Next Due Date</CardDescription>
          </CardHeader>
          <CardContent>
            {feeSummary?.next_due_date ? (
              <>
                <div className="text-2xl font-bold">
                  {format(new Date(feeSummary.next_due_date), 'dd MMM')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(feeSummary.next_due_amount)}
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No pending dues</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pay Now Button */}
      {gatewayStatus?.enabled && feeSummary && feeSummary.total_balance > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg mb-1">Online Payment Available</h3>
                <p className="text-sm text-muted-foreground">
                  Pay your fees securely online using {gatewayStatus.gateway?.gateway_provider}
                </p>
              </div>
              <Button size="lg" className="gap-2" onClick={() => setIsPaymentModalOpen(true)}>
                <CreditCard className="h-5 w-5" />
                Pay Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fee Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Breakdown</CardTitle>
          <CardDescription>Detailed breakdown of all fee demands</CardDescription>
        </CardHeader>
        <CardContent>
          {feeDemands && feeDemands.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fee Type</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Demand Amount</TableHead>
                  <TableHead className="text-right">Paid Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeDemands.map((demand: any) => (
                  <TableRow key={demand.id} className={demand.is_overdue ? 'bg-red-50' : ''}>
                    <TableCell className="font-medium">
                      {demand.fee_structure?.fee_category?.name || 'Fee'}
                      {demand.fee_structure?.fee_category?.is_mandatory && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Mandatory
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {demand.due_date ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className={demand.is_overdue ? 'text-red-600 font-medium' : ''}>
                            {format(new Date(demand.due_date), 'dd MMM yyyy')}
                          </span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(demand.demand_amount)}
                      {demand.adjustment_amount > 0 && demand.adjustment_type === 'discount' && (
                        <div className="text-xs text-green-600">
                          -{formatCurrency(demand.adjustment_amount)} discount
                        </div>
                      )}
                      {demand.adjustment_amount > 0 && demand.adjustment_type === 'increase' && (
                        <div className="text-xs text-orange-600">
                          +{formatCurrency(demand.adjustment_amount)} additional charge
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(demand.paid_amount)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(demand.balance_amount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(demand.payment_status, demand.is_overdue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No fee demands found for this student.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>All payment receipts and transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentHistory && paymentHistory.receipts && paymentHistory.receipts.length > 0 ? (
            <div className="space-y-4">
              {paymentHistory.receipts.map((receipt: any) => (
                <div
                  key={receipt.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium">Receipt #{receipt.receipt_no}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {format(new Date(receipt.receipt_date), 'dd MMM yyyy, hh:mm a')}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Payment Method: {receipt.payment_method?.toUpperCase() || 'N/A'}
                        {receipt.reference_number && ` • Ref: ${receipt.reference_number}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{formatCurrency(receipt.total_amount)}</div>
                    <Button variant="ghost" size="sm" className="mt-2">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No payment history available.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            Need Help?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Fees marked in red are overdue and need immediate attention</p>
          <p>• You can download receipts for all completed payments</p>
          <p>• For any fee-related queries, please contact the school office</p>
          {gatewayStatus?.enabled && (
            <p>• Online payment is available - click "Pay Now" to proceed with secure payment</p>
          )}
        </CardContent>
      </Card>

      {/* Payment Modal */}
      {gatewayStatus?.enabled && feeDemands && currentChild && (
        <FeePaymentModal
          open={isPaymentModalOpen}
          onOpenChange={setIsPaymentModalOpen}
          studentId={childId}
          studentName={currentChild.full_name || 'Student'}
          feeDemands={feeDemands}
          gatewayProvider={gatewayStatus.gateway?.gateway_provider || 'Razorpay'}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
