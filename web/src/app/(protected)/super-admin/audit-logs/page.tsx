'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/use-auth';
import { DataGrid, DataGridColumn } from '@/components/data-grid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Activity, 
  User, 
  Calendar, 
  Database, 
  Edit, 
  Plus, 
  Trash2,
  Eye,
  Filter,
  Download
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatDateTime } from '@/lib/utils';

interface AuditLog {
  id: string;
  school_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: any;
  new_data: any;
  metadata: any;
  created_at: string;
  users?: {
    email: string;
    role: string;
  };
  schools?: {
    name: string;
  };
}

export default function AuditLogsPage() {
  const { user } = useAuth();
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'insert':
        return <Plus className="w-4 h-4 text-green-600" />;
      case 'update':
        return <Edit className="w-4 h-4 text-blue-600" />;
      case 'delete':
        return <Trash2 className="w-4 h-4 text-red-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'insert':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'update':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delete':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const columns: DataGridColumn<AuditLog>[] = [
    {
      key: 'action',
      label: 'Action',
      render: (value, row) => (
        <div className="flex items-center space-x-2">
          {getActionIcon(value)}
          <Badge variant="outline" className={getActionColor(value)}>
            {value.toUpperCase()}
          </Badge>
        </div>
      ),
    },
    {
      key: 'entity_type',
      label: 'Entity',
      render: (value) => (
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium capitalize">{value}</span>
        </div>
      ),
    },
    {
      key: 'users',
      label: 'User',
      render: (value, row) => (
        <div className="flex items-center space-x-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="font-medium text-sm">{value?.email || 'System'}</p>
            <p className="text-xs text-muted-foreground capitalize">{value?.role || 'System'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'schools',
      label: 'School',
      render: (value) => (
        <span className="text-sm">{value?.name || 'Global'}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Timestamp',
      render: (value) => (
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">{formatDateTime(value)}</span>
        </div>
      ),
    },
  ];

  const handleRowClick = (log: AuditLog) => {
    setSelectedLog(log);
  };

  const renderDataDiff = (oldData: any, newData: any) => {
    if (!oldData && !newData) return null;

    const changes: { field: string; old?: any; new?: any }[] = [];
    
    if (oldData && newData) {
      // Update operation - show changed fields
      const allFields = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
      allFields.forEach(field => {
        if (JSON.stringify(oldData[field]) !== JSON.stringify(newData[field])) {
          changes.push({
            field,
            old: oldData[field],
            new: newData[field],
          });
        }
      });
    } else if (newData) {
      // Insert operation - show new data
      Object.entries(newData).forEach(([field, value]) => {
        if (field !== 'id' && field !== 'created_at' && field !== 'updated_at') {
          changes.push({ field, new: value });
        }
      });
    } else if (oldData) {
      // Delete operation - show old data
      Object.entries(oldData).forEach(([field, value]) => {
        if (field !== 'id' && field !== 'created_at' && field !== 'updated_at') {
          changes.push({ field, old: value });
        }
      });
    }

    return (
      <div className="space-y-3">
        {changes.map(({ field, old, new: newValue }) => (
          <div key={field} className="border rounded-lg p-3">
            <div className="font-medium text-sm mb-2 capitalize">
              {field.replace(/_/g, ' ')}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {old !== undefined && (
                <div>
                  <span className="text-muted-foreground">Old:</span>
                  <div className="bg-red-50 border border-red-200 rounded p-2 mt-1">
                    <code className="text-red-800">
                      {typeof old === 'object' ? JSON.stringify(old, null, 2) : String(old)}
                    </code>
                  </div>
                </div>
              )}
              {newValue !== undefined && (
                <div>
                  <span className="text-muted-foreground">New:</span>
                  <div className="bg-green-50 border border-green-200 rounded p-2 mt-1">
                    <code className="text-green-800">
                      {typeof newValue === 'object' ? JSON.stringify(newValue, null, 2) : String(newValue)}
                    </code>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/super-admin"
                className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Activity</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">247</div>
                <p className="text-xs text-muted-foreground">
                  +12% from yesterday
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Creates</CardTitle>
                <Plus className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">89</div>
                <p className="text-xs text-muted-foreground">
                  New records added
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Updates</CardTitle>
                <Edit className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">142</div>
                <p className="text-xs text-muted-foreground">
                  Records modified
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Deletes</CardTitle>
                <Trash2 className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">16</div>
                <p className="text-xs text-muted-foreground">
                  Records removed
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Audit Logs Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <DataGrid
            entity="audit_logs"
            title="System Audit Logs"
            description="Track all system activities and data changes"
            columns={columns}
            searchPlaceholder="Search by user, entity, or action..."
            onRowClick={handleRowClick}
            enableSelection={false}
            enableExport={true}
            enableColumnToggle={true}
            pageSize={20}
          />
        </motion.div>
      </div>

      {/* Audit Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Audit Log Details</span>
            </DialogTitle>
            <DialogDescription>
              {selectedLog && `${selectedLog.action.toUpperCase()} operation on ${selectedLog.entity_type}`}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Action</label>
                  <div className="flex items-center space-x-2 mt-1">
                    {getActionIcon(selectedLog.action)}
                    <Badge variant="outline" className={getActionColor(selectedLog.action)}>
                      {selectedLog.action.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Entity Type</label>
                  <p className="mt-1 capitalize">{selectedLog.entity_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User</label>
                  <p className="mt-1">{selectedLog.users?.email || 'System'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                  <p className="mt-1">{formatDateTime(selectedLog.created_at)}</p>
                </div>
              </div>

              {/* Data Changes */}
              {(selectedLog.old_data || selectedLog.new_data) && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data Changes</label>
                  <div className="mt-2">
                    {renderDataDiff(selectedLog.old_data, selectedLog.new_data)}
                  </div>
                </div>
              )}

              {/* Metadata */}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Metadata</label>
                  <div className="mt-2 bg-muted rounded-lg p-3">
                    <pre className="text-sm overflow-x-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 