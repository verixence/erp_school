'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { useInitiatePayment, useVerifyPayment } from '@/hooks/use-parent';
import { AlertCircle, CheckCircle, CreditCard, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';

interface FeeDemand {
  id: string;
  demand_amount: number;
  paid_amount: number;
  balance_amount: number;
  discount_amount: number;
  payment_status: string;
  due_date: string | null;
  is_overdue: boolean;
  fee_structure?: {
    fee_category?: {
      name: string;
    };
  };
}

interface FeePaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  feeDemands: FeeDemand[];
  gatewayProvider: string;
  onPaymentSuccess?: () => void;
}

export function FeePaymentModal({
  open,
  onOpenChange,
  studentId,
  studentName,
  feeDemands,
  gatewayProvider,
  onPaymentSuccess,
}: FeePaymentModalProps) {
  const [selectedDemands, setSelectedDemands] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiatePayment = useInitiatePayment();
  const verifyPayment = useVerifyPayment();

  // Filter only unpaid/partial demands
  const payableFeeDemands = feeDemands.filter(
    (demand) => demand.payment_status !== 'paid' && demand.balance_amount > 0
  );

  // Auto-select overdue fees
  useEffect(() => {
    if (open) {
      const overdueDemands = payableFeeDemands
        .filter((demand) => demand.is_overdue)
        .map((demand) => demand.id);
      setSelectedDemands(new Set(overdueDemands));
      setError(null);
    }
  }, [open]);

  const toggleDemand = (demandId: string) => {
    const newSelected = new Set(selectedDemands);
    if (newSelected.has(demandId)) {
      newSelected.delete(demandId);
    } else {
      newSelected.add(demandId);
    }
    setSelectedDemands(newSelected);
  };

  const selectedDemandsData = payableFeeDemands.filter((demand) =>
    selectedDemands.has(demand.id)
  );

  const totalAmount = selectedDemandsData.reduce(
    (sum, demand) => sum + Number(demand.balance_amount),
    0
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handlePayment = async () => {
    if (selectedDemands.size === 0) {
      setError('Please select at least one fee to pay');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Step 1: Initiate payment
      const initiateResult = await initiatePayment.mutateAsync({
        student_id: studentId,
        fee_demand_ids: Array.from(selectedDemands),
        amount: totalAmount,
      });

      // Step 2: Load Razorpay/Stripe SDK and open checkout
      if (gatewayProvider.toLowerCase() === 'razorpay') {
        await loadRazorpayCheckout(initiateResult);
      } else if (gatewayProvider.toLowerCase() === 'stripe') {
        await loadStripeCheckout(initiateResult);
      } else {
        throw new Error(`Unsupported payment gateway: ${gatewayProvider}`);
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Failed to initiate payment. Please try again.');
      setIsProcessing(false);
    }
  };

  const loadRazorpayCheckout = async (paymentData: any) => {
    // Load Razorpay SDK
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
    });

    const options = {
      key: paymentData.gateway_key,
      amount: paymentData.total_amount * 100, // Razorpay expects paise
      currency: 'INR',
      name: 'School Fee Payment',
      description: `Fee payment for ${studentName}`,
      order_id: paymentData.gateway_order_id,
      handler: async (response: any) => {
        try {
          // Verify payment
          await verifyPayment.mutateAsync({
            transaction_id: paymentData.transaction_id,
            gateway_payment_id: response.razorpay_payment_id,
            gateway_signature: response.razorpay_signature,
            gateway_response: response,
          });

          setIsProcessing(false);
          onOpenChange(false);
          if (onPaymentSuccess) onPaymentSuccess();
        } catch (err: any) {
          console.error('Payment verification error:', err);
          setError('Payment verification failed. Please contact support.');
          setIsProcessing(false);
        }
      },
      modal: {
        ondismiss: () => {
          setIsProcessing(false);
          setError('Payment cancelled');
        },
      },
      prefill: {
        name: studentName,
      },
      theme: {
        color: '#3b82f6',
      },
    };

    const razorpay = new (window as any).Razorpay(options);
    razorpay.open();
  };

  const loadStripeCheckout = async (paymentData: any) => {
    // For Stripe, you would typically redirect to Stripe Checkout
    // or use Stripe Elements for embedded checkout
    setError('Stripe integration coming soon. Please contact support.');
    setIsProcessing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pay Fees - {studentName}
          </DialogTitle>
          <DialogDescription>
            Select the fees you want to pay and proceed with secure online payment.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {payableFeeDemands.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">All Fees Paid!</h3>
            <p className="text-muted-foreground">
              There are no pending fees for this student.
            </p>
          </div>
        ) : (
          <>
            {/* Fee Selection Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Fee Type</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payableFeeDemands.map((demand) => (
                    <TableRow
                      key={demand.id}
                      className={demand.is_overdue ? 'bg-red-50' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedDemands.has(demand.id)}
                          onCheckedChange={() => toggleDemand(demand.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {demand.fee_structure?.fee_category?.name || 'Fee'}
                      </TableCell>
                      <TableCell>
                        {demand.due_date ? (
                          <span className={demand.is_overdue ? 'text-red-600 font-medium' : ''}>
                            {format(new Date(demand.due_date), 'dd MMM yyyy')}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(demand.balance_amount)}
                      </TableCell>
                      <TableCell>
                        {demand.is_overdue ? (
                          <Badge variant="destructive">Overdue</Badge>
                        ) : demand.payment_status === 'partial' ? (
                          <Badge className="bg-yellow-500">Partial</Badge>
                        ) : (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Payment Summary */}
            {selectedDemands.size > 0 && (
              <div className="bg-accent/50 p-4 rounded-lg space-y-2">
                <h4 className="font-semibold mb-3">Payment Summary</h4>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Selected Fees</span>
                  <span>{selectedDemands.size} item(s)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Amount</span>
                  <span className="text-primary">{formatCurrency(totalAmount)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Payment will be processed securely through {gatewayProvider}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayment}
                disabled={selectedDemands.size === 0 || isProcessing}
                className="gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Pay {formatCurrency(totalAmount)}
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
