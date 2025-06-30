'use client';

import { useAuth } from '@/hooks/use-auth';
import { useChildren, useChildHomework } from '@/hooks/use-parent';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, Calendar, FileText } from 'lucide-react';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function ParentHomework() {
  const { user } = useAuth();
  const [selectedChild, setSelectedChild] = useState<string>('');
  
  const { data: children, isLoading: childrenLoading } = useChildren(user?.id);
  const { data: homework, isLoading: homeworkLoading } = useChildHomework(selectedChild);

  // Set default selected child when children load
  if (children && children.length > 0 && !selectedChild) {
    setSelectedChild(children[0].id);
  }

  const currentChild = children?.find(child => child.id === selectedChild);

  // Calculate homework stats
  const totalHomework = homework?.length || 0;
  const submittedHomework = homework?.filter(hw => 
    hw.homework_submissions && hw.homework_submissions.length > 0
  ).length || 0;
  const pendingHomework = totalHomework - submittedHomework;
  const overdueHomework = homework?.filter(hw => {
    const isOverdue = new Date(hw.due_date) < new Date();
    const isSubmitted = hw.homework_submissions && hw.homework_submissions.length > 0;
    return isOverdue && !isSubmitted;
  }).length || 0;

  if (childrenLoading) {
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
          <h1 className="text-3xl font-bold text-gray-900">Homework Assignments</h1>
          <p className="text-gray-600 mt-2">
            View homework assignments and submission status for your children.
          </p>
        </div>
        
        {/* Child Selector */}
        {children && children.length > 0 && (
          <div className="min-w-48">
            <Select value={selectedChild} onValueChange={setSelectedChild}>
              <SelectTrigger>
                <SelectValue placeholder="Select a child" />
              </SelectTrigger>
              <SelectContent>
                                 {children.map((child) => (
                   <SelectItem key={child.id} value={child.id}>
                     {child.full_name}
                   </SelectItem>
                 ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHomework}</div>
            <p className="text-xs text-muted-foreground">
              All assignments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{submittedHomework}</div>
            <p className="text-xs text-muted-foreground">
              Completed assignments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingHomework}</div>
            <p className="text-xs text-muted-foreground">
              Not yet submitted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <Users className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueHomework}</div>
            <p className="text-xs text-muted-foreground">
              Past due date
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Current Child Info */}
      {currentChild && (
        <Card>
          <CardHeader>
                       <CardTitle className="flex items-center gap-2">
             <Users className="h-5 w-5" />
             {currentChild.full_name} - Grade {currentChild.sections?.grade}
           </CardTitle>
          </CardHeader>
        </Card>
      )}

      {/* Homework Assignments */}
      <Card>
        <CardHeader>
          <CardTitle>Homework Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {homeworkLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : homework && homework.length > 0 ? (
            <div className="space-y-4">
              {homework.map((assignment) => {
                const isSubmitted = assignment.homework_submissions && assignment.homework_submissions.length > 0;
                const isOverdue = new Date(assignment.due_date) < new Date() && !isSubmitted;
                const submission = assignment.homework_submissions?.[0];

                return (
                  <div key={assignment.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{assignment.title}</h3>
                          <Badge 
                            variant={
                              isSubmitted ? 'default' : 
                              isOverdue ? 'destructive' : 'secondary'
                            }
                          >
                            {isSubmitted ? 'Submitted' : isOverdue ? 'Overdue' : 'Pending'}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-600 mb-3">{assignment.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-500">Subject:</span>
                            <p>{assignment.subject}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">Due Date:</span>
                            <p className={isOverdue ? 'text-red-600 font-medium' : ''}>
                              {format(new Date(assignment.due_date), 'MMMM do, yyyy')}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">Assigned:</span>
                            <p>{format(new Date(assignment.created_at), 'MMMM do, yyyy')}</p>
                          </div>
                        </div>

                        {/* Submission Details */}
                        {isSubmitted && submission && (
                          <div className="mt-4 p-3 bg-green-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="h-4 w-4 text-green-600" />
                              <span className="font-medium text-green-800">Submitted</span>
                            </div>
                            <div className="text-sm text-green-700">
                              <p>Submitted on: {format(new Date(submission.submitted_at), 'MMMM do, yyyy \'at\' h:mm a')}</p>
                              {submission.notes && (
                                <p className="mt-1">Notes: {submission.notes}</p>
                              )}
                              {submission.file_url && (
                                <a 
                                  href={submission.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 mt-2 text-blue-600 hover:text-blue-800"
                                >
                                  <FileText className="h-3 w-3" />
                                  View Submission
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Assignment Files */}
                        {assignment.file_url && (
                          <div className="mt-3">
                            <a 
                              href={assignment.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                            >
                              <FileText className="h-4 w-4" />
                              Download Assignment
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Homework Assignments</h3>
              <p className="text-gray-600">
                No homework assignments found for the selected child.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* No Children State */}
      {!childrenLoading && (!children || children.length === 0) && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Children Found</h3>
            <p className="text-gray-600">
              No children are currently linked to your account.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 