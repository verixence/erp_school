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
  // Migration system removed - no longer needed
  return null;
} 