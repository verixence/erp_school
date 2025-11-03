'use client';

import { useAuth } from '@/hooks/use-auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Wallet,
  Download,
  Eye,
  Loader2,
  FileText
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { generatePayslipPDF } from '@/lib/generate-payslip-pdf';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function TeacherPayslipsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);

  // Fetch payslips using direct Supabase
  const { data: payslips = [], isLoading } = useQuery({
    queryKey: ['teacher-payslips', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_payslips')
        .select('*')
        .eq('teacher_id', user?.id)
        .in('status', ['sent', 'viewed'])
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  const markAsViewed = async (payslipId: string) => {
    try {
      await supabase
        .from('teacher_payslips')
        .update({
          status: 'viewed',
          viewed_at: new Date().toISOString()
        })
        .eq('id', payslipId);

      queryClient.invalidateQueries({ queryKey: ['teacher-payslips'] });
    } catch (error) {
      console.error('Error marking payslip as viewed:', error);
    }
  };

  const handleViewPayslip = (payslip: any) => {
    setSelectedPayslip(payslip);
    if (payslip.status === 'sent') {
      markAsViewed(payslip.id);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Wallet className="h-8 w-8" />
          My Payslips
        </h1>
        <p className="text-muted-foreground mt-2">
          View and download your salary payslips
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Salary History</CardTitle>
          <CardDescription>
            {payslips.length} payslip(s) available
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            </div>
          ) : payslips.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">
                No payslips available yet
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Your payslips will appear here once they are shared by the administration
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {payslips.map((payslip: any) => (
                <div
                  key={payslip.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-lg">
                          {MONTHS[payslip.month - 1]} {payslip.year}
                        </h3>
                        {payslip.status === 'viewed' && (
                          <Badge className="bg-green-100 text-green-800">Viewed</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>Gross: ₹{parseFloat(payslip.gross_salary).toLocaleString()}</span>
                        <span>•</span>
                        <span className="font-medium text-foreground">
                          Net Pay: ₹{parseFloat(payslip.net_salary).toLocaleString()}
                        </span>
                      </div>
                      {payslip.sent_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Issued on {new Date(payslip.sent_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          // Fetch school name
                          const { data: schoolData } = await supabase
                            .from('schools')
                            .select('name')
                            .eq('id', user?.school_id)
                            .single();

                          generatePayslipPDF({
                            teacher_name: `${user?.first_name} ${user?.last_name}`,
                            employee_id: user?.employee_id || 'N/A',
                            month: payslip.month,
                            year: payslip.year,
                            basic_salary: parseFloat(payslip.basic_salary),
                            allowances: {
                              hra: parseFloat(payslip.allowances?.hra || 0),
                              da: parseFloat(payslip.allowances?.da || 0),
                              ta: parseFloat(payslip.allowances?.ta || 0),
                              other: parseFloat(payslip.allowances?.other || 0),
                            },
                            deductions: {
                              pf: parseFloat(payslip.deductions?.pf || 0),
                              tax: parseFloat(payslip.deductions?.tax || 0),
                              other: parseFloat(payslip.deductions?.other || 0),
                            },
                            gross_salary: parseFloat(payslip.gross_salary),
                            net_salary: parseFloat(payslip.net_salary),
                            school_name: schoolData?.name,
                            sent_at: payslip.sent_at,
                          });
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download PDF
                      </Button>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            onClick={() => handleViewPayslip(payslip)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>
                            Payslip - {MONTHS[payslip.month - 1]} {payslip.year}
                          </DialogTitle>
                          <DialogDescription>
                            Salary breakdown and payment details
                          </DialogDescription>
                        </DialogHeader>

                        {selectedPayslip && (
                          <div className="space-y-4">
                            {/* Earnings */}
                            <div className="border rounded-lg p-4">
                              <h3 className="font-medium mb-3">Earnings</h3>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span>Basic Salary</span>
                                  <span>₹{parseFloat(selectedPayslip.basic_salary).toLocaleString()}</span>
                                </div>
                                {selectedPayslip.allowances?.hra > 0 && (
                                  <div className="flex justify-between">
                                    <span>HRA</span>
                                    <span>₹{parseFloat(selectedPayslip.allowances.hra).toLocaleString()}</span>
                                  </div>
                                )}
                                {selectedPayslip.allowances?.da > 0 && (
                                  <div className="flex justify-between">
                                    <span>DA</span>
                                    <span>₹{parseFloat(selectedPayslip.allowances.da).toLocaleString()}</span>
                                  </div>
                                )}
                                {selectedPayslip.allowances?.ta > 0 && (
                                  <div className="flex justify-between">
                                    <span>TA</span>
                                    <span>₹{parseFloat(selectedPayslip.allowances.ta).toLocaleString()}</span>
                                  </div>
                                )}
                                <div className="flex justify-between font-medium pt-2 border-t">
                                  <span>Gross Salary</span>
                                  <span>₹{parseFloat(selectedPayslip.gross_salary).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>

                            {/* Deductions */}
                            <div className="border rounded-lg p-4">
                              <h3 className="font-medium mb-3">Deductions</h3>
                              <div className="space-y-2 text-sm">
                                {selectedPayslip.deductions?.pf > 0 && (
                                  <div className="flex justify-between">
                                    <span>PF</span>
                                    <span className="text-red-600">
                                      -₹{parseFloat(selectedPayslip.deductions.pf).toLocaleString()}
                                    </span>
                                  </div>
                                )}
                                {selectedPayslip.deductions?.tax > 0 && (
                                  <div className="flex justify-between">
                                    <span>Tax</span>
                                    <span className="text-red-600">
                                      -₹{parseFloat(selectedPayslip.deductions.tax).toLocaleString()}
                                    </span>
                                  </div>
                                )}
                                {selectedPayslip.deductions?.other > 0 && (
                                  <div className="flex justify-between">
                                    <span>Other Deductions</span>
                                    <span className="text-red-600">
                                      -₹{parseFloat(selectedPayslip.deductions.other).toLocaleString()}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between font-medium pt-2 border-t">
                                  <span>Total Deductions</span>
                                  <span className="text-red-600">
                                    -₹{(parseFloat(selectedPayslip.gross_salary) - parseFloat(selectedPayslip.net_salary)).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Net Pay */}
                            <div className="border-2 border-primary rounded-lg p-4 bg-primary/5">
                              <div className="flex justify-between items-center">
                                <span className="text-lg font-semibold">Net Pay</span>
                                <span className="text-2xl font-bold text-primary">
                                  ₹{parseFloat(selectedPayslip.net_salary).toLocaleString()}
                                </span>
                              </div>
                            </div>

                            {selectedPayslip.notes && (
                              <div className="border rounded-lg p-4 bg-muted/50">
                                <h3 className="font-medium mb-2">Notes</h3>
                                <p className="text-sm text-muted-foreground">
                                  {selectedPayslip.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
