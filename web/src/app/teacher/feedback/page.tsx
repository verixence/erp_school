'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter, MessageSquare, Reply, Clock, User, Mail, Phone, Calendar, Star, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Feedback {
  id: string
  subject: string
  message: string
  feedback_type: string
  status: 'pending' | 'in_progress' | 'resolved'
  priority: 'low' | 'medium' | 'high'
  created_at: string
  updated_at: string
  submitter: {
    name: string
    email: string
    phone?: string
    type: 'parent' | 'student' | 'teacher'
  }
  responses?: {
    id: string
    message: string
    created_at: string
    author: string
  }[]
}

const FEEDBACK_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'academic', label: 'Academic' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'facilities', label: 'Facilities' },
  { value: 'teaching', label: 'Teaching Methods' },
  { value: 'communication', label: 'Communication' },
  { value: 'extracurricular', label: 'Extracurricular' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'complaint', label: 'Complaint' },
  { value: 'other', label: 'Other' }
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending', color: '#F59E0B' },
  { value: 'in_progress', label: 'In Progress', color: '#3B82F6' },
  { value: 'resolved', label: 'Resolved', color: '#10B981' }
]

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All Priority' },
  { value: 'low', label: 'Low', color: '#6B7280' },
  { value: 'medium', label: 'Medium', color: '#F59E0B' },
  { value: 'high', label: 'High', color: '#EF4444' }
]

export default function TeacherFeedback() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedPriority, setSelectedPriority] = useState('all')
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [responseMessage, setResponseMessage] = useState('')
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false)

  useEffect(() => {
    fetchFeedbacks()
  }, [])

  const fetchFeedbacks = async () => {
    try {
      const response = await fetch('/api/admin/feedback')
      if (response.ok) {
        const data = await response.json()
        setFeedbacks(data.feedbacks || [])
      }
    } catch (error) {
      console.error('Failed to fetch feedbacks:', error)
      toast.error('Failed to load feedbacks')
    } finally {
      setLoading(false)
    }
  }

  const updateFeedbackStatus = async (feedbackId: string, status: string) => {
    try {
      const response = await fetch(`/api/admin/feedback/${feedbackId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      
      if (response.ok) {
        toast.success('Status updated successfully')
        fetchFeedbacks()
      } else {
        toast.error('Failed to update status')
      }
    } catch (error) {
      console.error('Failed to update status:', error)
      toast.error('Failed to update status')
    }
  }

  const submitResponse = async () => {
    if (!selectedFeedback || !responseMessage.trim()) return
    
    setIsSubmittingResponse(true)
    try {
      const response = await fetch(`/api/admin/feedback/${selectedFeedback.id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: responseMessage })
      })
      
      if (response.ok) {
        toast.success('Response sent successfully')
        setResponseMessage('')
        fetchFeedbacks()
        // Update status to in_progress if it was pending
        if (selectedFeedback.status === 'pending') {
          updateFeedbackStatus(selectedFeedback.id, 'in_progress')
        }
      } else {
        toast.error('Failed to send response')
      }
    } catch (error) {
      console.error('Failed to send response:', error)
      toast.error('Failed to send response')
    } finally {
      setIsSubmittingResponse(false)
    }
  }

  const openDetailModal = (feedback: Feedback) => {
    setSelectedFeedback(feedback)
    setResponseMessage('')
    setShowDetailModal(true)
  }

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status)
    if (!statusOption || status === 'all') return null
    
    return (
      <Badge 
        variant="outline" 
        style={{ 
          borderColor: statusOption.color,
          color: statusOption.color
        }}
      >
        {statusOption.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const priorityOption = PRIORITY_OPTIONS.find(p => p.value === priority)
    if (!priorityOption || priority === 'all') return null
    
    return (
      <Badge 
        variant="outline" 
        style={{ 
          borderColor: priorityOption.color,
          color: priorityOption.color
        }}
      >
        {priorityOption.label}
      </Badge>
    )
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
                         feedback.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         feedback.submitter.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = selectedType === 'all' || feedback.feedback_type === selectedType
    const matchesStatus = selectedStatus === 'all' || feedback.status === selectedStatus
    const matchesPriority = selectedPriority === 'all' || feedback.priority === selectedPriority
    
    return matchesSearch && matchesType && matchesStatus && matchesPriority
  })

  const stats = {
    total: feedbacks.length,
    pending: feedbacks.filter(f => f.status === 'pending').length,
    inProgress: feedbacks.filter(f => f.status === 'in_progress').length,
    resolved: feedbacks.filter(f => f.status === 'resolved').length,
    high: feedbacks.filter(f => f.priority === 'high').length
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feedback Management</h1>
          <p className="text-gray-600">Review and respond to feedback from parents and students</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
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
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-red-600">{stats.high}</p>
              </div>
              <Star className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search feedback..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Feedback Type" />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((priority) => (
                  <SelectItem key={priority.value} value={priority.value}>
                    {priority.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      <Card>
        <CardHeader>
          <CardTitle>Feedback ({filteredFeedbacks.length})</CardTitle>
        </CardHeader>
        <CardContent>
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
                          <User className="w-4 h-4" />
                          {feedback.submitter.name} ({feedback.submitter.type})
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {feedback.submitter.email}
                        </div>
                        
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
                    
                    <div className="flex gap-2 ml-4">
                      <Select value={feedback.status} onValueChange={(value) => updateFeedbackStatus(feedback.id, value)}>
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || selectedType !== 'all' || selectedStatus !== 'all' || selectedPriority !== 'all' 
                  ? 'No feedback found' 
                  : 'No feedback submitted yet'
                }
              </h3>
              <p className="text-gray-600">
                {searchTerm || selectedType !== 'all' || selectedStatus !== 'all' || selectedPriority !== 'all'
                  ? 'Try adjusting your search criteria.'
                  : 'Feedback from parents and students will appear here.'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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
                      <p className="text-sm font-medium text-gray-500">Submitted by</p>
                      <p className="text-lg">{selectedFeedback.submitter.name}</p>
                      <p className="text-sm text-gray-600">({selectedFeedback.submitter.type})</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Contact Information</p>
                      <p className="text-sm">{selectedFeedback.submitter.email}</p>
                      {selectedFeedback.submitter.phone && (
                        <p className="text-sm">{selectedFeedback.submitter.phone}</p>
                      )}
                    </div>
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
                    <p className="text-sm font-medium text-gray-500 mb-2">Message</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedFeedback.message}</p>
                  </div>
                </div>

                {/* Previous Responses */}
                {selectedFeedback.responses && selectedFeedback.responses.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Previous Responses</h3>
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
                )}

                {/* Response Form */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Send Response</h3>
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Type your response here..."
                      value={responseMessage}
                      onChange={(e) => setResponseMessage(e.target.value)}
                      rows={4}
                    />
                    
                    <div className="flex gap-2 justify-end">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowDetailModal(false)}
                      >
                        Close
                      </Button>
                      <Button 
                        onClick={submitResponse}
                        disabled={!responseMessage.trim() || isSubmittingResponse}
                      >
                        {isSubmittingResponse ? 'Sending...' : 'Send Response'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 