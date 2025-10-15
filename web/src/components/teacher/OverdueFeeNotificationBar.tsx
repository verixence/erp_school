'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OverdueFeeNotificationBarProps {
  schoolId: string;
}

export default function OverdueFeeNotificationBar({ schoolId }: OverdueFeeNotificationBarProps) {
  const [overdueSummary, setOverdueSummary] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId || dismissed) return;

    const fetchOverdueFees = async () => {
      try {
        const response = await fetch(`/api/teacher/overdue-fees?school_id=${schoolId}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.summary.total_overdue_count > 0) {
            setOverdueSummary(result.summary);
          }
        }
      } catch (error) {
        console.error('Error fetching overdue fees:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverdueFees();

    // Refresh every 30 minutes
    const interval = setInterval(fetchOverdueFees, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [schoolId, dismissed]);

  if (loading || dismissed || !overdueSummary) {
    return null;
  }

  return (
    <div className="relative">
      <Alert variant="destructive" className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex-1 overflow-hidden">
            <div className="animate-scroll whitespace-nowrap inline-block">
              <span className="font-semibold">Fee Payment Reminder:</span>
              {' '}
              <span>
                {overdueSummary.total_overdue_count} student{overdueSummary.total_overdue_count > 1 ? 's have' : ' has'} overdue payments
              </span>
              {' • '}
              <span>
                Total Amount: ₹{overdueSummary.total_overdue_amount.toLocaleString()}
              </span>
              {' • '}
              <span>
                {overdueSummary.students_affected} student{overdueSummary.students_affected > 1 ? 's' : ''} affected
              </span>
              {Object.entries(overdueSummary.by_grade).map(([grade, data]: [string, any]) => (
                <span key={grade}>
                  {' • '}
                  {grade}: {data.count} overdue (₹{data.amount.toLocaleString()})
                </span>
              ))}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ml-4 h-6 w-6 p-0 hover:bg-red-100"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertDescription>
      </Alert>

      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }

        .animate-scroll {
          animation: scroll 30s linear infinite;
        }

        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
