'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface CarryForwardDuesProps {
  schoolId: string;
}

export default function CarryForwardDues({ schoolId }: CarryForwardDuesProps) {
  const [fromYear, setFromYear] = useState('2023-2024');
  const [toYear, setToYear] = useState('2024-2025');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const academicYears = [
    '2021-2022',
    '2022-2023',
    '2023-2024',
    '2024-2025',
    '2025-2026'
  ];

  const handleCarryForward = async () => {
    if (fromYear === toYear) {
      toast.error('From and To academic years must be different');
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/fees/carry-forward-dues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          school_id: schoolId,
          from_academic_year: fromYear,
          to_academic_year: toYear
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to carry forward dues');
      }

      setResult(data);

      if (data.carried_forward > 0) {
        toast.success(`Successfully carried forward ${data.carried_forward} fee demand(s)!`);
      } else {
        toast.info(data.message);
      }
    } catch (error: any) {
      console.error('Carry forward error:', error);
      toast.error(error.message || 'Failed to carry forward dues');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRight className="h-5 w-5" />
          Carry Forward Unpaid Dues
        </CardTitle>
        <CardDescription>
          Automatically carry forward unpaid fee balances from one academic year to the next
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Important</AlertTitle>
          <AlertDescription>
            This operation will create new fee demands in the target academic year for all students
            who have unpaid balances from the previous year. Only the outstanding balance will be
            carried forward.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <Label htmlFor="from_year">From Academic Year</Label>
            <Select value={fromYear} onValueChange={setFromYear}>
              <SelectTrigger id="from_year">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map(year => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-center">
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
          </div>

          <div>
            <Label htmlFor="to_year">To Academic Year</Label>
            <Select value={toYear} onValueChange={setToYear}>
              <SelectTrigger id="to_year">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map(year => (
                  <SelectItem key={year} value={year} disabled={year === fromYear}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleCarryForward}
          disabled={processing}
          className="w-full md:w-auto"
        >
          {processing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <ArrowRight className="h-4 w-4 mr-2" />
              Carry Forward Unpaid Dues
            </>
          )}
        </Button>

        {result && (
          <Alert className={result.carried_forward > 0 ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Operation Complete</AlertTitle>
            <AlertDescription className="space-y-2">
              <p className="font-medium">{result.message}</p>
              {result.carried_forward > 0 && (
                <div className="text-sm space-y-1 mt-2">
                  <p>• Fee Demands Carried Forward: <strong>{result.carried_forward}</strong></p>
                  <p>• Total Amount: <strong>₹{result.total_amount.toLocaleString()}</strong></p>
                  <p className="text-muted-foreground mt-2">
                    These demands have been created in {toYear} and can be viewed in the Fee Demand section.
                  </p>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-muted-foreground space-y-2 border-t pt-4">
          <p className="font-semibold">How it works:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Identifies all students with pending or partial payment status from the selected academic year</li>
            <li>Creates new fee demands in the target academic year with only the outstanding balance</li>
            <li>Skips students who already have demands carried forward to avoid duplicates</li>
            <li>Does not affect the original fee demands from the previous year</li>
            <li>The discount reason will indicate "Carried forward from [previous year]"</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
