'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { AlertTriangle, Copy, Check, Clock } from 'lucide-react';
import { useAuth } from '../hooks/use-auth';

export function MigrationGuard() {
  const [showDialog, setShowDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const checkMigrations = async () => {
      try {
        const response = await fetch('/api/report-templates/migration-check');
        const result = await response.json();
        
        if (!result.migrationApplied) {
          setShowDialog(true);
        }
      } catch (error) {
        console.error('Migration check failed:', error);
        // Only show dialog for super admins as a safety measure
        if (user?.role === 'super_admin') {
          setShowDialog(true);
        }
      } finally {
        setChecking(false);
      }
    };

    if (user) {
      checkMigrations();
    }
  }, [user]);

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText('pnpm db:mcp');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy command:', err);
    }
  };

  const refreshPage = () => {
    window.location.reload();
  };

  if (checking || !user) {
    return null; // Don't show anything while checking or if no user
  }

  // Super Admin sees the technical migration dialog
  if (user.role === 'super_admin') {
    return (
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Database Migration Required
            </DialogTitle>
            <DialogDescription>
              The Template Catalogue feature requires database updates that haven't been applied yet.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                As a Super Admin, please run the migration command below to enable the Template Catalogue for all schools.
              </AlertDescription>
            </Alert>

            <div className="bg-gray-100 p-3 rounded-md font-mono text-sm">
              <div className="flex items-center justify-between">
                <code>pnpm db:mcp</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyCommand}
                  className="h-8 px-2"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <p><strong>What this does:</strong></p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li>Adds new columns to the report_templates table</li>
                <li>Creates RLS policies for template visibility</li>
                <li>Adds functions for template cloning</li>
                <li>Inserts sample public templates</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
                className="flex-1"
              >
                Continue Without Migration
              </Button>
              <Button
                onClick={refreshPage}
                className="flex-1"
              >
                I've Applied the Migration
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Other users (School Admin, Teachers, etc.) see a simpler message
  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            New Features Coming Soon
          </DialogTitle>
          <DialogDescription>
            The Template Catalogue feature is being deployed to your system.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Our system administrators are updating the platform to enable new template features. This process is handled automatically and doesn't require any action from you.
            </AlertDescription>
          </Alert>

          <div className="text-sm text-gray-600">
            <p><strong>What's coming:</strong></p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Browse public report card templates</li>
              <li>Clone and customize templates for your school</li>
              <li>Access board-specific design templates</li>
              <li>Enhanced report generation features</li>
            </ul>
          </div>

          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Need immediate access?</strong> Contact your system administrator or support team.
            </p>
          </div>

          <Button
            onClick={() => setShowDialog(false)}
            className="w-full"
          >
            Got it, I'll check back later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 