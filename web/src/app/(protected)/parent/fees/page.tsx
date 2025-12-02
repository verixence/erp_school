'use client';

import { useAuth } from '@/hooks/use-auth';
import { useChildren } from '@/hooks/use-parent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Wallet, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ParentFeesPage() {
  const { user } = useAuth();
  const { data: children, isLoading, error } = useChildren(user?.id);
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Fee Management</h1>
          <p className="text-muted-foreground mt-2">View and manage your children's fee details</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Fee Management</h1>
          <p className="text-muted-foreground mt-2">View and manage your children's fee details</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load children information. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!children || children.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Fee Management</h1>
          <p className="text-muted-foreground mt-2">View and manage your children's fee details</p>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No children found linked to your account. Please contact the school administration.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fee Management</h1>
        <p className="text-muted-foreground mt-2">
          Select a child to view their fee details and payment history
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {children.map((child: any) => (
          <Card
            key={child.id}
            className="hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => router.push(`/parent/fees/${child.id}`)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl mb-1">{child.full_name}</CardTitle>
                  <CardDescription>
                    {child.sections?.grade && child.sections?.section
                      ? `Grade ${child.sections.grade} - ${child.sections.section}`
                      : 'Grade information not available'}
                  </CardDescription>
                </div>
                <Wallet className="h-8 w-8 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {child.admission_number && (
                  <p className="text-sm text-muted-foreground">
                    Admission No: <span className="font-medium text-foreground">{child.admission_number}</span>
                  </p>
                )}
                <Button
                  className="w-full mt-4 group-hover:bg-primary/90"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/parent/fees/${child.id}`);
                  }}
                >
                  View Fee Details
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Click on any child's card to view detailed fee breakdown and payment history</p>
            <p>• All pending and overdue fees will be clearly marked</p>
            <p>• You can download receipts for all completed payments</p>
            <p>• Online payment options may be available depending on school settings</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
