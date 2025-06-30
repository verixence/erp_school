'use client';

import { useAuth } from '@/hooks/use-auth';
import { useStudentHomework } from '../../../../../../common/src/api/student';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BookOpen, Calendar, Clock, FileText, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { format, isAfter, isBefore, differenceInDays } from 'date-fns';
import type { Homework } from '../../../../../../common/src/api/types';

type HomeworkWithSubmissions = Homework & { homework_submissions: any[] };

export default function StudentHomework() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue' | 'completed'>('all');
  const [selectedHomework, setSelectedHomework] = useState<HomeworkWithSubmissions | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  
  const { data: homework, isLoading } = useStudentHomework(user?.id);

  const getHomeworkStatus = (dueDate: string, homework: HomeworkWithSubmissions) => {
    // Check if homework is submitted
    if (homework.homework_submissions && homework.homework_submissions.length > 0) {
      return 'completed';
    }
    
    const due = new Date(dueDate);
    const now = new Date();
    
    if (isBefore(due, now)) {
      return 'overdue';
    } else if (differenceInDays(due, now) <= 2) {
      return 'due_soon';
    } else {
      return 'pending';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'due_soon':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Due Soon</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'overdue':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'due_soon':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'pending':
        return <BookOpen className="w-4 h-4 text-blue-600" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const filteredHomework = homework?.filter(hw => {
    const status = getHomeworkStatus(hw.due_date, hw);
    if (filter === 'all') return true;
    if (filter === 'pending') return status === 'pending' || status === 'due_soon';
    if (filter === 'overdue') return status === 'overdue';
    if (filter === 'completed') return status === 'completed';
    return true;
  }) || [];

  const stats = {
    total: homework?.length || 0,
    pending: homework?.filter(hw => {
      const status = getHomeworkStatus(hw.due_date, hw);
      return status === 'pending' || status === 'due_soon';
    }).length || 0,
    overdue: homework?.filter(hw => getHomeworkStatus(hw.due_date, hw) === 'overdue').length || 0,
    completed: homework?.filter(hw => getHomeworkStatus(hw.due_date, hw) === 'completed').length || 0
  };

  const handleViewDetails = (hw: HomeworkWithSubmissions) => {
    setSelectedHomework(hw);
    setShowDetailDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Homework</h1>
          <p className="text-gray-600 mt-2">
            View your homework assignments and track due dates.
          </p>
        </div>
        
        {/* Filter */}
        <Select value={filter} onValueChange={(value: 'all' | 'pending' | 'overdue' | 'completed') => setFilter(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Homework</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All homework</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Due soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">Past due</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Submitted</p>
          </CardContent>
        </Card>
      </div>

      {/* Homework List */}
      <Card>
        <CardHeader>
          <CardTitle>Homework Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredHomework.length > 0 ? (
            <div className="space-y-4">
              {filteredHomework.map((hw) => {
                const status = getHomeworkStatus(hw.due_date, hw);
                const daysUntilDue = differenceInDays(new Date(hw.due_date), new Date());
                
                return (
                  <div key={hw.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusIcon(status)}
                          <h3 className="text-lg font-medium text-gray-900">{hw.title}</h3>
                          {getStatusBadge(status)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <BookOpen className="w-4 h-4" />
                            <span>{hw.subject}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>Due: {format(new Date(hw.due_date), 'MMM d, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>
                              {status === 'overdue' 
                                ? `${Math.abs(daysUntilDue)} days overdue`
                                : daysUntilDue === 0 
                                ? 'Due today'
                                : `${daysUntilDue} days left`
                              }
                            </span>
                          </div>
                        </div>
                        
                        {hw.description && (
                          <p className="text-gray-700 mb-3 line-clamp-2">{hw.description}</p>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(hw)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                          
                          {hw.file_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(hw.file_url!, '_blank')}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Attachment
                            </Button>
                          )}
                          
                          <Button
                            variant={status === 'overdue' ? 'default' : 'outline'}
                            size="sm"
                            disabled={status === 'completed'}
                          >
                            {status === 'completed' ? 'Submitted' : 'Submit Work'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter === 'all' ? 'No Homework Assignments' : `No ${filter} homework`}
              </h3>
              <p className="text-gray-600">
                {filter === 'all' 
                  ? 'No homework has been assigned yet.' 
                  : `You don't have any ${filter} homework assignments.`
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Homework Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          {selectedHomework && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getStatusIcon(getHomeworkStatus(selectedHomework.due_date, selectedHomework))}
                  {selectedHomework.title}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Status and Meta Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Subject</h4>
                    <p className="text-gray-600">{selectedHomework.subject}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Due Date</h4>
                    <p className="text-gray-600">{format(new Date(selectedHomework.due_date), 'EEEE, MMMM d, yyyy')}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Status</h4>
                    {getStatusBadge(getHomeworkStatus(selectedHomework.due_date, selectedHomework))}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Assigned</h4>
                    <p className="text-gray-600">{format(new Date(selectedHomework.created_at), 'MMM d, yyyy')}</p>
                  </div>
                </div>
                
                {/* Description */}
                {selectedHomework.description && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedHomework.description}</p>
                    </div>
                  </div>
                )}
                
                {/* Attachment */}
                {selectedHomework.file_url && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Attachment</h4>
                    <Button
                      variant="outline"
                      onClick={() => window.open(selectedHomework.file_url!, '_blank')}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Download Attachment
                    </Button>
                  </div>
                )}
                
                {/* Submission Section */}
                <div className="border-t pt-6">
                  <h4 className="font-medium text-gray-900 mb-4">Submission</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800 mb-3">
                      Online submission system is coming soon. For now, please submit your work in class.
                    </p>
                    <Button disabled>
                      <FileText className="w-4 h-4 mr-2" />
                      Submit Online (Coming Soon)
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Tips */}
      {homework && homework.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Study Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2 text-green-600">✅ Good Habits</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Start early to avoid last-minute rush</li>
                  <li>• Break large assignments into smaller tasks</li>
                  <li>• Set daily study goals</li>
                  <li>• Ask questions when you're stuck</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2 text-red-600">⚠️ Avoid</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Procrastinating until the due date</li>
                  <li>• Skipping difficult parts</li>
                  <li>• Working without breaks</li>
                  <li>• Not reviewing your work</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 