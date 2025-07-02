'use client';

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Trash2, 
  School2, 
  Users, 
  Database,
  Clock,
  Shield,
  X,
  CheckCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

interface School {
  id: string;
  name: string;
  domain: string | null;
  status: string;
  created_at: string;
  total_capacity?: number | null;
}

interface DeleteSchoolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school: School | null;
  onConfirm: (schoolId: string, confirmationText: string) => Promise<void>;
  isDeleting?: boolean;
}

export function DeleteSchoolModal({
  open,
  onOpenChange,
  school,
  onConfirm,
  isDeleting = false
}: DeleteSchoolModalProps) {
  const [step, setStep] = useState<'warning' | 'confirmation' | 'final'>('warning');
  const [confirmationText, setConfirmationText] = useState('');
  const [schoolNameConfirm, setSchoolNameConfirm] = useState('');
  const [understood, setUnderstood] = useState(false);

  const resetState = () => {
    setStep('warning');
    setConfirmationText('');
    setSchoolNameConfirm('');
    setUnderstood(false);
  };

  const handleClose = () => {
    if (!isDeleting) {
      onOpenChange(false);
      resetState();
    }
  };

  const handleNext = () => {
    if (step === 'warning') {
      setStep('confirmation');
    } else if (step === 'confirmation') {
      setStep('final');
    }
  };

  const handleBack = () => {
    if (step === 'confirmation') {
      setStep('warning');
    } else if (step === 'final') {
      setStep('confirmation');
    }
  };

  const handleConfirm = async () => {
    if (school && confirmationText === 'DELETE' && schoolNameConfirm === school.name) {
      await onConfirm(school.id, confirmationText);
      resetState();
    }
  };

  const canProceedFromWarning = understood;
  const canProceedFromConfirmation = schoolNameConfirm === school?.name;
  const canConfirmDeletion = confirmationText === 'DELETE' && schoolNameConfirm === school?.name;

  if (!school) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
            <DialogTitle className="text-lg font-semibold text-destructive">
              {step === 'warning' && 'Delete School - Warning'}
              {step === 'confirmation' && 'Delete School - Confirmation'}
              {step === 'final' && 'Final Confirmation Required'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* School Info Card */}
          <div className="border rounded-lg p-3 bg-muted/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <School2 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{school.name}</h4>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <span>{school.domain || 'No domain'}</span>
                  <Badge variant={school.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                    {school.status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Step 1: Warning */}
          {step === 'warning' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="font-medium text-destructive">Permanent Deletion Warning</h4>
                    <p className="text-sm text-muted-foreground">
                      This action will permanently delete the school and <strong>ALL</strong> associated data including:
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>All users (admins, teachers, parents)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-muted-foreground" />
                  <span>All student records</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>Timetables & schedules</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <span>Exam data & results</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 dark:bg-amber-950/20 dark:border-amber-800">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800 dark:text-amber-200">Important Notes:</h4>
                    <ul className="text-sm text-amber-700 dark:text-amber-300 mt-1 space-y-1">
                      <li>• This action cannot be undone</li>
                      <li>• All user accounts will be permanently deleted</li>
                      <li>• Backup your data before proceeding</li>
                      <li>• Consider deactivating instead of deleting</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="understand"
                  checked={understood}
                  onChange={(e) => setUnderstood(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="understand" className="text-sm">
                  I understand this action is permanent and cannot be undone
                </Label>
              </div>
            </motion.div>
          )}

          {/* Step 2: School Name Confirmation */}
          {step === 'confirmation' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <DialogDescription>
                To confirm deletion, please type the school name exactly as shown below:
              </DialogDescription>
              
              <div className="bg-muted rounded-lg p-3 font-mono text-center">
                {school.name}
              </div>

              <div className="space-y-2">
                <Label htmlFor="schoolName">Type school name to confirm:</Label>
                <Input
                  id="schoolName"
                  value={schoolNameConfirm}
                  onChange={(e) => setSchoolNameConfirm(e.target.value)}
                  placeholder="Enter school name exactly"
                  className="font-mono"
                />
              </div>

              {schoolNameConfirm && schoolNameConfirm !== school.name && (
                <p className="text-sm text-destructive">School name does not match</p>
              )}
            </motion.div>
          )}

          {/* Step 3: Final Confirmation */}
          {step === 'final' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Trash2 className="w-4 h-4 text-destructive" />
                  <h4 className="font-medium text-destructive">Final Confirmation</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  You are about to permanently delete "{school.name}" and all its data.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deleteConfirm">Type "DELETE" to confirm:</Label>
                <Input
                  id="deleteConfirm"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="Type DELETE"
                  className="font-mono"
                />
              </div>

              {confirmationText && confirmationText !== 'DELETE' && (
                <p className="text-sm text-destructive">Please type "DELETE" exactly</p>
              )}
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <div>
              {step !== 'warning' && (
                <Button variant="outline" onClick={handleBack} disabled={isDeleting}>
                  Back
                </Button>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleClose} disabled={isDeleting}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              
              {step === 'warning' && (
                <Button
                  variant="destructive"
                  onClick={handleNext}
                  disabled={!canProceedFromWarning}
                >
                  Continue
                </Button>
              )}
              
              {step === 'confirmation' && (
                <Button
                  variant="destructive"
                  onClick={handleNext}
                  disabled={!canProceedFromConfirmation}
                >
                  Next
                </Button>
              )}
              
              {step === 'final' && (
                <Button
                  variant="destructive"
                  onClick={handleConfirm}
                  disabled={!canConfirmDeletion || isDeleting}
                  className="min-w-[120px]"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete School
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 