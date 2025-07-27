'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Search, Phone, Mail, MapPin, Calendar, FileText, Users, Plus, Share, Loader2, CheckCircle, Clock, UserX, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AdmissionEnquiry {
  id: string;
  application_no: string;
  student_name: string;
  surname?: string;
  date_of_birth: string;
  age?: number;
  nationality?: string;
  gender: string;
  admission_for: string;
  previous_institution_name?: string;
  father_name: string;
  father_qualification?: string;
  father_phone: string;
  father_organization?: string;
  father_designation?: string;
  mother_name: string;
  mother_qualification?: string;
  mother_phone?: string;
  mother_organization?: string;
  mother_designation?: string;
  residential_address: string;
  area: string;
  pincode: string;
  email_id?: string;
  how_did_you_know?: string;
  specify_if_any?: string;
  status: 'open' | 'in_progress' | 'completed' | 'rejected';
  created_at: string;
  comments?: string;
  counselor?: string;
}

export default function AdmissionEnquiryPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<AdmissionEnquiry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    student_name: '',
    surname: '',
    date_of_birth: '',
    age: '',
    nationality: '',
    gender: '',
    admission_for: '',
    previous_institution_name: '',
    father_name: '',
    father_qualification: '',
    father_phone: '',
    father_organization: '',
    father_designation: '',
    mother_name: '',
    mother_qualification: '',
    mother_phone: '',
    mother_organization: '',
    mother_designation: '',
    residential_address: '',
    area: '',
    pincode: '',
    email_id: '',
    how_did_you_know: '',
    specify_if_any: '',
    comments: '',
    counselor: ''
  });

  // Fetch admission enquiries
  const { data: enquiries = [], isLoading } = useQuery({
    queryKey: ['admission-enquiries', user?.school_id, searchTerm, statusFilter],
    queryFn: async () => {
      if (!user?.school_id) return [];

      let query = supabase
        .from('admission_enquiries')
        .select('*')
        .eq('school_id', user.school_id)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`student_name.ilike.%${searchTerm}%,father_name.ilike.%${searchTerm}%,application_no.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AdmissionEnquiry[];
    },
    enabled: !!user?.school_id,
  });

  // Create admission enquiry mutation
  const createEnquiryMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Generate application number
      const currentYear = new Date().getFullYear();
      const { data: existingEnquiries, error: countError } = await supabase
        .from('admission_enquiries')
        .select('application_no')
        .eq('school_id', user?.school_id)
        .like('application_no', `ADM${currentYear}%`)
        .order('application_no', { ascending: false })
        .limit(1);

      if (countError) throw countError;

      let nextNumber = 1;
      if (existingEnquiries && existingEnquiries.length > 0) {
        const lastAppNo = existingEnquiries[0].application_no;
        const lastNumber = parseInt(lastAppNo.slice(-3));
        nextNumber = lastNumber + 1;
      }

      const applicationNo = `ADM${currentYear}${nextNumber.toString().padStart(3, '0')}`;

      // Convert age to number if provided
      const processedData = {
        ...data,
        application_no: applicationNo,
        age: data.age ? parseInt(data.age) : null,
        school_id: user?.school_id,
        status: 'open',
        created_by: user?.id
      };

      const { data: result, error } = await supabase
        .from('admission_enquiries')
        .insert([processedData])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admission-enquiries'] });
      toast.success(`Admission enquiry created successfully! Application No: ${result.application_no}`);
      setIsFormOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create admission enquiry: ' + error.message);
    },
  });

  // Update enquiry status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, comments }: { id: string; status: string; comments?: string }) => {
      setUpdatingStatus(id);
      const { error } = await supabase
        .from('admission_enquiries')
        .update({ status, comments })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admission-enquiries'] });
      toast.success(`Status updated to "${variables.status.toUpperCase()}" successfully!`);
      setSelectedEnquiry(null);
      setUpdatingStatus(null);
    },
    onError: (error) => {
      toast.error('Failed to update status: ' + error.message);
      setUpdatingStatus(null);
    },
  });

  // Quick status update function
  const handleQuickStatusUpdate = async (enquiryId: string, newStatus: string) => {
    updateStatusMutation.mutate({
      id: enquiryId,
      status: newStatus
    });
  };

  const resetForm = () => {
    setFormData({
      student_name: '',
      surname: '',
      date_of_birth: '',
      age: '',
      nationality: '',
      gender: '',
      admission_for: '',
      previous_institution_name: '',
      father_name: '',
      father_qualification: '',
      father_phone: '',
      father_organization: '',
      father_designation: '',
      mother_name: '',
      mother_qualification: '',
      mother_phone: '',
      mother_organization: '',
      mother_designation: '',
      residential_address: '',
      area: '',
      pincode: '',
      email_id: '',
      how_did_you_know: '',
      specify_if_any: '',
      comments: '',
      counselor: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student_name || !formData.father_name || !formData.father_phone) {
      toast.error('Please fill in all required fields');
      return;
    }
    createEnquiryMutation.mutate(formData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'open': return 'Open';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  const capitalizeGender = (gender: string) => {
    return gender.charAt(0).toUpperCase() + gender.slice(1);
  };

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return '';
    
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    
    return age.toString();
  };

  // Auto-calculate age when date of birth changes
  useEffect(() => {
    if (formData.date_of_birth) {
      const calculatedAge = calculateAge(formData.date_of_birth);
      setFormData(prev => ({ ...prev, age: calculatedAge }));
    }
  }, [formData.date_of_birth]);

  const filteredEnquiries = enquiries.filter(enquiry => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        enquiry.student_name.toLowerCase().includes(search) ||
        enquiry.father_name.toLowerCase().includes(search) ||
        enquiry.application_no.toLowerCase().includes(search)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admission Enquiries</h1>
          <p className="text-gray-600 mt-2">Manage student admission applications and enquiries</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Enquiry
        </Button>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">All Enquiries</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Search & Filter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search by name, application number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status Filter</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enquiries List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Enquiries ({filteredEnquiries.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading enquiries...</div>
              ) : filteredEnquiries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No enquiries found. Create your first enquiry to get started.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Application #</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Parent Contact</TableHead>
                        <TableHead>Referral Source</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEnquiries.map((enquiry) => (
                        <TableRow key={enquiry.id}>
                          <TableCell className="font-mono text-sm">
                            {enquiry.application_no}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{enquiry.student_name} {enquiry.surname}</div>
                              <div className="text-sm text-gray-500">
                                {capitalizeGender(enquiry.gender)} • DOB: {format(new Date(enquiry.date_of_birth), 'dd/MM/yyyy')}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {enquiry.admission_for}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-sm">
                                <Users className="w-3 h-3" />
                                {enquiry.father_name}
                              </div>
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="w-3 h-3" />
                                {enquiry.father_phone}
                              </div>
                              {enquiry.email_id && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Mail className="w-3 h-3" />
                                  {enquiry.email_id}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {enquiry.how_did_you_know && (
                                <div className="flex items-center gap-1">
                                  <Share className="w-3 h-3" />
                                  {enquiry.how_did_you_know}
                                </div>
                              )}
                              {enquiry.specify_if_any && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {enquiry.specify_if_any}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(enquiry.status)}>
                              {getStatusDisplayName(enquiry.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(enquiry.created_at), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {/* Quick Status Update Buttons */}
                              {enquiry.status === 'open' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2"
                                  onClick={() => handleQuickStatusUpdate(enquiry.id, 'in_progress')}
                                  disabled={updatingStatus === enquiry.id}
                                  title="Start Processing"
                                >
                                  {updatingStatus === enquiry.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Clock className="h-3 w-3" />
                                  )}
                                </Button>
                              )}
                              
                              {enquiry.status === 'in_progress' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2 text-green-600 hover:text-green-700"
                                    onClick={() => handleQuickStatusUpdate(enquiry.id, 'completed')}
                                    disabled={updatingStatus === enquiry.id}
                                    title="Mark as Completed"
                                  >
                                    {updatingStatus === enquiry.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <CheckCircle className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2 text-red-600 hover:text-red-700"
                                    onClick={() => handleQuickStatusUpdate(enquiry.id, 'rejected')}
                                    disabled={updatingStatus === enquiry.id}
                                    title="Mark as Rejected"
                                  >
                                    <UserX className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                              
                              {/* View Details Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2"
                                onClick={() => setSelectedEnquiry(enquiry)}
                                title="View Full Details"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Enquiries</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{enquiries.length}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Enquiries</CardTitle>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {enquiries.filter(e => e.status === 'open').length}
                </div>
                <p className="text-xs text-muted-foreground">Pending review</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Admitted</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {enquiries.filter(e => e.status === 'completed').length}
                </div>
                <p className="text-xs text-muted-foreground">Successfully completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {enquiries.filter(e => {
                    const enquiryDate = new Date(e.created_at);
                    const now = new Date();
                    return enquiryDate.getMonth() === now.getMonth() && 
                           enquiryDate.getFullYear() === now.getFullYear();
                  }).length}
                </div>
                <p className="text-xs text-muted-foreground">New applications</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Enquiry Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Admission Enquiry</DialogTitle>
            <DialogDescription>
              Fill in the details for the new admission enquiry. Required fields are marked with *.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Student Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Student Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="student_name">Student Name *</Label>
                  <Input
                    id="student_name"
                    value={formData.student_name}
                    onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="surname">Surname</Label>
                  <Input
                    id="surname"
                    value={formData.surname}
                    onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="date_of_birth">Date of Birth *</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="age">Age (Auto-calculated)</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    disabled
                    className="bg-gray-50 text-gray-600"
                    placeholder="Select date of birth first"
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender *</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => setFormData({ ...formData, gender: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="nationality">Nationality</Label>
                  <Input
                    id="nationality"
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    placeholder="e.g., Indian, American"
                  />
                </div>
                <div>
                  <Label htmlFor="admission_for">Admission For (Grade) *</Label>
                  <Select
                    value={formData.admission_for}
                    onValueChange={(value) => setFormData({ ...formData, admission_for: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nursery">Nursery</SelectItem>
                      <SelectItem value="LKG">LKG</SelectItem>
                      <SelectItem value="UKG">UKG</SelectItem>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={`Grade ${i + 1}`}>Grade {i + 1}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="previous_institution_name">Previous School/Institution</Label>
                  <Input
                    id="previous_institution_name"
                    value={formData.previous_institution_name}
                    onChange={(e) => setFormData({ ...formData, previous_institution_name: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Parent Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Parent/Guardian Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="father_name">Father's Name *</Label>
                  <Input
                    id="father_name"
                    value={formData.father_name}
                    onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="father_qualification">Father's Qualification</Label>
                  <Input
                    id="father_qualification"
                    value={formData.father_qualification}
                    onChange={(e) => setFormData({ ...formData, father_qualification: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="father_phone">Father's Phone *</Label>
                  <Input
                    id="father_phone"
                    value={formData.father_phone}
                    onChange={(e) => setFormData({ ...formData, father_phone: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="father_organization">Father's Organization</Label>
                  <Input
                    id="father_organization"
                    value={formData.father_organization}
                    onChange={(e) => setFormData({ ...formData, father_organization: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="father_designation">Father's Designation</Label>
                  <Input
                    id="father_designation"
                    value={formData.father_designation}
                    onChange={(e) => setFormData({ ...formData, father_designation: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="mother_name">Mother's Name *</Label>
                  <Input
                    id="mother_name"
                    value={formData.mother_name}
                    onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="mother_qualification">Mother's Qualification</Label>
                  <Input
                    id="mother_qualification"
                    value={formData.mother_qualification}
                    onChange={(e) => setFormData({ ...formData, mother_qualification: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="mother_phone">Mother's Phone</Label>
                  <Input
                    id="mother_phone"
                    value={formData.mother_phone}
                    onChange={(e) => setFormData({ ...formData, mother_phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="mother_organization">Mother's Organization</Label>
                  <Input
                    id="mother_organization"
                    value={formData.mother_organization}
                    onChange={(e) => setFormData({ ...formData, mother_organization: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="mother_designation">Mother's Designation</Label>
                  <Input
                    id="mother_designation"
                    value={formData.mother_designation}
                    onChange={(e) => setFormData({ ...formData, mother_designation: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Contact & Address Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Contact & Address Information</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="email_id">Email Address</Label>
                  <Input
                    id="email_id"
                    type="email"
                    value={formData.email_id}
                    onChange={(e) => setFormData({ ...formData, email_id: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="residential_address">Residential Address *</Label>
                  <Textarea
                    id="residential_address"
                    value={formData.residential_address}
                    onChange={(e) => setFormData({ ...formData, residential_address: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="area">Area/City *</Label>
                    <Input
                      id="area"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="pincode">Pincode *</Label>
                    <Input
                      id="pincode"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Referral Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Share className="w-5 h-5" />
                Referral Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="how_did_you_know">How did you know about our school?</Label>
                  <Select
                    value={formData.how_did_you_know}
                    onValueChange={(value) => setFormData({ ...formData, how_did_you_know: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Website">Website</SelectItem>
                      <SelectItem value="Social Media">Social Media</SelectItem>
                      <SelectItem value="Google Search">Google Search</SelectItem>
                      <SelectItem value="Friend/Family Referral">Friend/Family Referral</SelectItem>
                      <SelectItem value="Newspaper Advertisement">Newspaper Advertisement</SelectItem>
                      <SelectItem value="School Event">School Event</SelectItem>
                      <SelectItem value="Walk-in">Walk-in</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="specify_if_any">Please specify (if Other or specific details)</Label>
                  <Input
                    id="specify_if_any"
                    value={formData.specify_if_any}
                    onChange={(e) => setFormData({ ...formData, specify_if_any: e.target.value })}
                    placeholder="e.g., Name of referrer, specific event, etc."
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Additional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="counselor">Assigned Counselor</Label>
                  <Input
                    id="counselor"
                    value={formData.counselor}
                    onChange={(e) => setFormData({ ...formData, counselor: e.target.value })}
                    placeholder="Staff member handling this enquiry"
                  />
                </div>
                <div></div>
                <div className="md:col-span-2">
                  <Label htmlFor="comments">Comments/Remarks</Label>
                  <Textarea
                    id="comments"
                    value={formData.comments}
                    onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                    placeholder="Any additional notes or comments..."
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createEnquiryMutation.isPending}>
                {createEnquiryMutation.isPending ? 'Creating...' : 'Create Enquiry'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View/Edit Enquiry Dialog */}
      {selectedEnquiry && (
        <Dialog open={!!selectedEnquiry} onOpenChange={() => setSelectedEnquiry(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Enquiry Details - {selectedEnquiry.application_no}</DialogTitle>
              <DialogDescription>
                View and update the admission enquiry details.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Status Update */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium text-gray-900">Application Status</h4>
                    <p className="text-sm text-gray-600">Current status and quick actions</p>
                  </div>
                  <Badge className={getStatusColor(selectedEnquiry.status)} variant="outline">
                    {selectedEnquiry.status.toUpperCase()}
                  </Badge>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {selectedEnquiry.status === 'open' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickStatusUpdate(selectedEnquiry.id, 'in_progress')}
                      disabled={updatingStatus === selectedEnquiry.id}
                      className="flex items-center gap-2"
                    >
                      {updatingStatus === selectedEnquiry.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                      Start Processing
                    </Button>
                  )}
                  
                  {selectedEnquiry.status === 'in_progress' && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleQuickStatusUpdate(selectedEnquiry.id, 'completed')}
                        disabled={updatingStatus === selectedEnquiry.id}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                      >
                        {updatingStatus === selectedEnquiry.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        Mark as Completed
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleQuickStatusUpdate(selectedEnquiry.id, 'rejected')}
                        disabled={updatingStatus === selectedEnquiry.id}
                        className="flex items-center gap-2"
                      >
                        {updatingStatus === selectedEnquiry.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserX className="h-4 w-4" />
                        )}
                        Reject Application
                      </Button>
                    </>
                  )}
                  
                  {selectedEnquiry.status === 'open' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleQuickStatusUpdate(selectedEnquiry.id, 'rejected')}
                      disabled={updatingStatus === selectedEnquiry.id}
                      className="flex items-center gap-2"
                    >
                      {updatingStatus === selectedEnquiry.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserX className="h-4 w-4" />
                      )}
                      Reject Application
                    </Button>
                  )}
                </div>
                
                {(selectedEnquiry.status === 'completed' || selectedEnquiry.status === 'rejected') && (
                  <div className="mt-3 p-3 bg-white rounded border">
                    <p className="text-sm text-gray-600">
                      <strong>Final Status:</strong> This application is {getStatusDisplayName(selectedEnquiry.status).toLowerCase()}.
                      {selectedEnquiry.status === 'completed' && ' Welcome to our school! 🎉'}
                      {selectedEnquiry.status === 'rejected' && ' Thank you for your interest.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Student Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Student Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div><strong>Name:</strong> {selectedEnquiry.student_name} {selectedEnquiry.surname}</div>
                    <div><strong>Date of Birth:</strong> {format(new Date(selectedEnquiry.date_of_birth), 'dd/MM/yyyy')}</div>
                    {selectedEnquiry.age && <div><strong>Age:</strong> {selectedEnquiry.age} years</div>}
                    <div><strong>Gender:</strong> {capitalizeGender(selectedEnquiry.gender)}</div>
                    {selectedEnquiry.nationality && <div><strong>Nationality:</strong> {selectedEnquiry.nationality}</div>}
                    <div><strong>Admission For:</strong> {selectedEnquiry.admission_for}</div>
                    {selectedEnquiry.previous_institution_name && (
                      <div><strong>Previous School:</strong> {selectedEnquiry.previous_institution_name}</div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Parent Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div><strong>Father:</strong> {selectedEnquiry.father_name}</div>
                    {selectedEnquiry.father_qualification && (
                      <div><strong>Father's Qualification:</strong> {selectedEnquiry.father_qualification}</div>
                    )}
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {selectedEnquiry.father_phone}
                    </div>
                    {selectedEnquiry.father_organization && (
                      <div><strong>Organization:</strong> {selectedEnquiry.father_organization}</div>
                    )}
                    {selectedEnquiry.father_designation && (
                      <div><strong>Designation:</strong> {selectedEnquiry.father_designation}</div>
                    )}
                    <div><strong>Mother:</strong> {selectedEnquiry.mother_name}</div>
                    {selectedEnquiry.mother_qualification && (
                      <div><strong>Mother's Qualification:</strong> {selectedEnquiry.mother_qualification}</div>
                    )}
                    {selectedEnquiry.mother_phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {selectedEnquiry.mother_phone}
                      </div>
                    )}
                    {selectedEnquiry.email_id && (
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {selectedEnquiry.email_id}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Address Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div>{selectedEnquiry.residential_address}</div>
                    <div>{selectedEnquiry.area} - {selectedEnquiry.pincode}</div>
                  </CardContent>
                </Card>

                {(selectedEnquiry.how_did_you_know || selectedEnquiry.specify_if_any) && (
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Share className="w-5 h-5" />
                        Referral Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedEnquiry.how_did_you_know && (
                        <div><strong>Source:</strong> {selectedEnquiry.how_did_you_know}</div>
                      )}
                      {selectedEnquiry.specify_if_any && (
                        <div><strong>Details:</strong> {selectedEnquiry.specify_if_any}</div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {(selectedEnquiry.comments || selectedEnquiry.counselor) && (
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-lg">Additional Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedEnquiry.counselor && (
                        <div><strong>Counselor:</strong> {selectedEnquiry.counselor}</div>
                      )}
                      {selectedEnquiry.comments && (
                        <div><strong>Comments:</strong> {selectedEnquiry.comments}</div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="text-sm text-gray-500">
                Created on {format(new Date(selectedEnquiry.created_at), 'dd/MM/yyyy HH:mm')}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedEnquiry(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 