'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Edit, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import FeeStructureModal from './FeeStructureModal';

interface FeeStructureSummary {
  grade: string;
  academic_year: string;
  total_amount: number;
  fee_count: number;
  fee_types: string[];
}

interface FeeStructureListProps {
  schoolId: string;
}

export default function FeeStructureList({ schoolId }: FeeStructureListProps) {
  const [summaries, setSummaries] = useState<FeeStructureSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/fees/structures/summary?school_id=${schoolId}`);
      if (response.ok) {
        const data = await response.json();
        setSummaries(data.data || []);
      } else {
        toast.error('Failed to load fee structures');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load fee structures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (schoolId) {
      loadData();
    }
  }, [schoolId]);

  const handleView = (grade: string, year: string) => {
    setSelectedGrade(grade);
    setSelectedYear(year);
    setModalMode('view');
    setShowModal(true);
  };

  const handleEdit = (grade: string, year: string) => {
    setSelectedGrade(grade);
    setSelectedYear(year);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleSync = async () => {
    toast.info('Syncing fee structures...');
    await loadData();
    toast.success('Fee structures synced successfully');
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedGrade(null);
    setSelectedYear(null);
    loadData(); // Reload data when modal closes
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Fee Structure Configuration List</h3>
          <p className="text-sm text-muted-foreground">View and manage fee structures for each class</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="bg-green-600 text-white hover:bg-green-700"
            onClick={handleSync}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync Fees
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              setSelectedGrade(null);
              setSelectedYear(null);
              setModalMode('edit');
              setShowModal(true);
            }}
          >
            + New
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700 text-white">
                <tr>
                  <th className="px-4 py-3 text-center font-medium">Sl No</th>
                  <th className="px-4 py-3 text-left font-medium">Class</th>
                  <th className="px-4 py-3 text-left font-medium">Academic Year</th>
                  <th className="px-4 py-3 text-right font-medium">Total Amount</th>
                  <th className="px-4 py-3 text-center font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {summaries.map((summary, index) => (
                  <tr key={`${summary.grade}-${summary.academic_year}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-center">{index + 1}</td>
                    <td className="px-4 py-3 font-medium">Class {summary.grade}</td>
                    <td className="px-4 py-3">{summary.academic_year}</td>
                    <td className="px-4 py-3 text-right font-mono">{summary.total_amount.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                          onClick={() => handleView(summary.grade, summary.academic_year)}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-green-600 hover:bg-green-50"
                          onClick={() => handleEdit(summary.grade, summary.academic_year)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {summaries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No fee structures found. Click "New" to create a fee structure.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>Showing 1 to {summaries.length} of {summaries.length} entries</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button variant="outline" size="sm" className="bg-blue-600 text-white">
            1
          </Button>
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        </div>
      </div>

      {/* Modal for viewing/editing fee structure */}
      {showModal && (
        <FeeStructureModal
          schoolId={schoolId}
          grade={selectedGrade}
          academicYear={selectedYear}
          mode={modalMode}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
