'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, MessageSquare, Plus, Calendar, Clock, Reply, Mail, Phone, Star, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase-client'

interface Feedback {
  id: string
  subject: string
  message: string
  feedback_type: string
  status: 'pending' | 'in_progress' | 'resolved'
  priority: 'low' | 'medium' | 'high'
  created_at: string
  updated_at: string
  responses?: {
    id: string
    message: string
    created_at: string
    author: string
  }[]
}

const FEEDBACK_TYPES = [
  { value: 'academic', label: 'Academic Concern', description: 'Issues related to curriculum, homework, or academic progress' },
  { value: 'behavioral', label: 'Behavioral Concern', description: 'Issues related to student behavior or classroom conduct' },
  { value: 'facilities', label: 'Facilities & Infrastructure', description: 'Issues with school facilities, maintenance, or infrastructure' },
  { value: 'teaching', label: 'Teaching Methods', description: 'Feedback about teaching approaches or classroom management' },
  { value: 'communication', label: 'Communication', description: 'Issues with school-parent communication or information sharing' },
  { value: 'extracurricular', label: 'Extracurricular Activities', description: 'Feedback about sports, clubs, or other activities' },
  { value: 'suggestion', label: 'Suggestion', description: 'Ideas for improvement or new initiatives' },
  { value: 'complaint', label: 'General Complaint', description: 'General concerns or complaints' },
  { value: 'other', label: 'Other', description: 'Any other feedback or concerns' }
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low Priority', description: 'Non-urgent matters that can be addressed in due course' },
  { value: 'medium', label: 'Medium Priority', description: 'Important matters that need attention' },
  { value: 'high', label: 'High Priority', description: 'Urgent matters requiring immediate attention' }
]

export default function ParentFeedback() {
  const { user } = useAuth()
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    feedback_type: 'academic',
    priority: 'medium'
  })

  useEffect(() => {
    fetchFeedbacks()
  }, [])

  const fetchFeedbacks = async () => {
    try {
      // Get session token for authorization
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('Authentication required')
        return
      }

      const response = await fetch('/api/feedback/my-feedback', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setFeedbacks(data.feedbacks || [])
      }
    } catch (error) {
      console.error('Failed to fetch feedbacks:', error)
      toast.error('Failed to load your feedback')
    } finally {
      setLoading(false)
    }
  }

  const submitFeedback = async () => {
    if (!formData.subject.trim() || !formData.message.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!user?.school_id) {
      toast.error('User school information not found')
      return
    }
    
    setIsSubmitting(true)
    try {
      // Transform the form data to match API expectations
      const submissionData = {
        school_id: user.school_id,
        type: formData.feedback_type,
        subject: formData.subject,
        description: formData.message,
        submitted_by: user.id
      }

      const response = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      })
      
      if (response.ok) {
        toast.success('Feedback submitted successfully')
        setShowCreateModal(false)
        resetForm()
        fetchFeedbacks()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to submit feedback')
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      toast.error('Failed to submit feedback')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      subject: '',
      message: '',
      feedback_type: 'academic',
      priority: 'medium'
    })
  }

  const openCreateModal = () => {
    resetForm()
    setShowCreateModal(true)
  }

  const openDetailModal = (feedback: Feedback) => {
    setSelectedFeedback(feedback)
    setShowDetailModal(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" style={{ borderColor: '#F59E0B', color: '#F59E0B' }}>Pending</Badge>
      case 'in_progress':
        return <Badge variant="outline" style={{ borderColor: '#3B82F6', color: '#3B82F6' }}>In Progress</Badge>
      case 'resolved':
        return <Badge variant="outline" style={{ borderColor: '#10B981', color: '#10B981' }}>Resolved</Badge>
      default:
        return null
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'low':
        return <Badge variant="outline" style={{ borderColor: '#6B7280', color: '#6B7280' }}>Low</Badge>
      case 'medium':
        return <Badge variant="outline" style={{ borderColor: '#F59E0B', color: '#F59E0B' }}>Medium</Badge>
      case 'high':
        return <Badge variant="outline" style={{ borderColor: '#EF4444', color: '#EF4444' }}>High</Badge>
      default:
        return null
    }
  }

  const getTypeLabel = (type: string) => {
    const typeOption = FEEDBACK_TYPES.find(t => t.value === type)
    return typeOption?.label || type
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredFeedbacks = feedbacks.filter(feedback => {
    const matchesSearch = feedback.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         feedback.message.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = selectedStatus === 'all' || feedback.status === selectedStatus
    
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: feedbacks.length,
    pending: feedbacks.filter(f => f.status === 'pending').length,
    inProgress: feedbacks.filter(f => f.status === 'in_progress').length,
    resolved: feedbacks.filter(f => f.status === 'resolved').length
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feedback & Support</h1>
          <p className="text-gray-600">Submit feedback, concerns, or suggestions to the school</p>
        </div>
        <Button onClick={openCreateModal} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Submit Feedback
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Submissions</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Your Feedback History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search your feedback..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Feedback List */}
          {filteredFeedbacks.length > 0 ? (
            <div className="space-y-4">
              {filteredFeedbacks
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((feedback) => (
                <div key={feedback.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetailModal(feedback)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{feedback.subject}</h3>
                        {getStatusBadge(feedback.status)}
                        {getPriorityBadge(feedback.priority)}
                        <Badge variant="outline">
                          {getTypeLabel(feedback.feedback_type)}
                        </Badge>
                      </div>
                      
                      <p className="text-gray-700 mb-3 line-clamp-2">{feedback.message}</p>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(feedback.created_at)}
                        </div>
                        
                        {feedback.responses && feedback.responses.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Reply className="w-4 h-4" />
                            {feedback.responses.length} response(s)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || selectedStatus !== 'all' 
                  ? 'No feedback found' 
                  : 'No feedback submitted yet'
                }
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedStatus !== 'all'
                  ? 'Try adjusting your search criteria.'
                  : 'Submit your first feedback to get started.'
                }
              </p>
              {!searchTerm && selectedStatus === 'all' && (
                <Button onClick={openCreateModal}>
                  <Plus className="w-4 h-4 mr-2" />
                  Submit Your First Feedback
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Feedback Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Subject *</label>
              <Input
                placeholder="Brief subject line"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Feedback Type</label>
              <Select value={formData.feedback_type} onValueChange={(value) => setFormData({ ...formData, feedback_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-sm text-gray-600">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Priority Level</label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      <div>
                        <div className="font-medium">{priority.label}</div>
                        <div className="text-sm text-gray-600">{priority.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Message *</label>
              <Textarea
                placeholder="Please provide details about your feedback, concern, or suggestion..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={4}
              />
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Your feedback will be reviewed by the school administration. 
                You will receive a response via the contact information in your profile.
              </p>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowCreateModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={submitFeedback}
                disabled={!formData.subject.trim() || !formData.message.trim() || isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          {selectedFeedback && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span>{selectedFeedback.subject}</span>
                  {getStatusBadge(selectedFeedback.status)}
                  {getPriorityBadge(selectedFeedback.priority)}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 overflow-y-auto max-h-[70vh]">
                {/* Feedback Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Type</p>
                      <p>{getTypeLabel(selectedFeedback.feedback_type)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Submitted on</p>
                      <p>{formatDate(selectedFeedback.created_at)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Your Message</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedFeedback.message}</p>
                  </div>
                </div>

                {/* Responses */}
                {selectedFeedback.responses && selectedFeedback.responses.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">School Responses</h3>
                    <div className="space-y-4">
                      {selectedFeedback.responses.map((response) => (
                        <div key={response.id} className="bg-blue-50 p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium">{response.author}</p>
                            <p className="text-sm text-gray-600">{formatDate(response.created_at)}</p>
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap">{response.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Clock className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Waiting for Response</h3>
                    <p className="text-gray-600">
                      The school will review your feedback and respond as soon as possible.
                    </p>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={() => setShowDetailModal(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 