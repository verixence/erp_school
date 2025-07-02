'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { BookOpen, ArrowLeft, Plus, Calendar, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';

interface Homework {
  id: string;
  school_id: string;
  section: string;
  subject: string;
  title: string;
  description?: string;
  due_date: string;
  file_url?: string;
  created_by: string;
  created_at: string;
}

interface HomeworkItemProps {
  homework: Homework;
}

function HomeworkItem({ homework }: HomeworkItemProps) {
  const dueDate = new Date(homework.due_date);
  const isOverdue = dueDate < new Date();
  
  return (
    <Card className="mb-4">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {homework.title}
            </h3>
            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
              <span>{homework.section}</span>
              <span>•</span>
              <span>{homework.subject}</span>
            </div>
            {homework.description && (
              <p className="text-gray-700 mb-3">{homework.description}</p>
            )}
          </div>
          <Badge variant={isOverdue ? "destructive" : "default"}>
            {isOverdue ? 'Overdue' : 'Active'}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-1" />
            Due: {dueDate.toLocaleDateString()}
          </div>
          {homework.file_url && (
            <div className="flex items-center text-sm text-gray-600">
              <FileText className="w-4 h-4 mr-1" />
              Attachment
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TeacherHomework() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  const { data: homework = [], isLoading: homeworkLoading } = useQuery({
    queryKey: ['teacher-homework', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('homeworks')
        .select('*')
        .eq('created_by', user.id)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as Homework[];
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'teacher')) {
      router.replace('/not-authorized');
    }
  }, [user, isLoading, router]);

  if (isLoading || homeworkLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || user.role !== 'teacher') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center">
                <BookOpen className="w-8 h-8 text-blue-600 mr-3" />
                <h1 className="text-xl font-semibold text-gray-900">Homework</h1>
              </div>
            </div>
            <Button 
              onClick={() => router.push('/teacher/homework/new')}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-md"
              size="lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {homework.length > 0 ? (
          homework.map(item => (
            <HomeworkItem key={item.id} homework={item} />
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No homework assignments</h3>
              <p className="text-gray-600 mb-4">You haven't created any homework assignments yet.</p>
              <Button 
                onClick={() => router.push('/teacher/homework/new')}
                className="bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-md"
                size="lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Homework
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 