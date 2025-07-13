'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight, User } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function StudentAttendanceRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect after 3 seconds
    const timer = setTimeout(() => {
      router.push('/student/attendance/enhanced');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full mx-4"
      >
        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
              <User className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Enhanced Attendance Available</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm">Your attendance interface has been enhanced!</span>
            </div>
            
            <p className="text-muted-foreground text-sm">
              We've upgraded your attendance system with better analytics, attendance grades, 
              notification history, and detailed tracking. You'll be automatically redirected to the new interface.
            </p>
            
            <div className="space-y-3">
              <Link href="/student/attendance/enhanced">
                <Button className="w-full" size="lg">
                  Go to Enhanced Attendance
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              
              <p className="text-xs text-muted-foreground">
                Redirecting automatically in 3 seconds...
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
} 