'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, MessageSquare, Filter, Eye, CheckCircle, Clock, XCircle, Star } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/hooks/use-auth'

interface FeedbackItem {
  id: string
  type: 'complaint' | 'feedback' | 'suggestion'
  subject: string
  description: string
  submitted_by_name: string | null
  submitted_by_email: string | null
  is_anonymous: boolean
  status: 'new' | 'in_review' | 'resolved' | 'closed'
  admin_notes: string | null
  created_at: string
  updated_at: string
  resolved_by_name: string | null
  resolved_at: string | null
}

interface FeedbackStats {
  total_feedback: number
  new_feedback: number
  in_review: number
  resolved: number
  complaints: number
  suggestions: number
}

export default function FeedbackManagement() {
  const { user, isLoading: authLoading } = useAuth()
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [stats, setStats] = useState<FeedbackStats | null>(null)
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(false)
  const [filter, setFilter] = useState({
    type: 'all',
    status: 'all'
  })

  const [adminNotes, setAdminNotes] = useState('')

  useEffect(() => {
    if (user?.school_id) {
      fetchFeedback()
    }
  }, [filter, user?.school_id])

  const fetchFeedback = async () => {
    if (!user?.school_id) return

    try {
      const params = new URLSearchParams()
      params.append('school_id', user.school_id)
      if (filter.type !== 'all') params.append('type', filter.type)
      if (filter.status !== 'all') params.append('status', filter.status)

      const response = await fetch(`/api/admin/feedback?${params}`)
      if (response.ok) {
        const data = await response.json()
        setFeedback(data.data || [])
        // Calculate stats from the data
        const feedbackData = data.data || []
        const statsData = {
          total_feedback: feedbackData.length,
          new_feedback: feedbackData.filter((f: FeedbackItem) => f.status === 'new').length,
          in_review: feedbackData.filter((f: FeedbackItem) => f.status === 'in_review').length,
          resolved: feedbackData.filter((f: FeedbackItem) => f.status === 'resolved').length,
          complaints: feedbackData.filter((f: FeedbackItem) => f.type === 'complaint').length,
          suggestions: feedbackData.filter((f: FeedbackItem) => f.type === 'suggestion').length
        }
        setStats(statsData)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to fetch feedback')
      }
    } catch (error) {
      alert('Failed to fetch feedback')
    } finally {
      setLoading(false)
    }
  }

  const updateFeedbackStatus = async (id: string, newStatus: string, notes?: string) => {
    if (!user?.school_id || !user?.id) return

    try {
      const response = await fetch('/api/admin/feedback', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          school_id: user.school_id,
          status: newStatus,
          admin_notes: notes || null,
          resolved_by: newStatus === 'resolved' ? user.id : null
        })
      })

      if (response.ok) {
        alert('Feedback status updated successfully')
        fetchFeedback()
        setShowDetails(false)
        setAdminNotes('')
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update feedback')
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update feedback')
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      new: { variant: 'destructive' as const, icon: AlertCircle, color: 'text-red-600' },
      in_review: { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
      resolved: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      closed: { variant: 'outline' as const, icon: XCircle, color: 'text-gray-600' }
    }

    const config = variants[status as keyof typeof variants] || variants.new
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    )
  }

  const getTypeBadge = (type: string) => {
    const variants = {
      complaint: { variant: 'destructive' as const, color: 'text-red-600' },
      feedback: { variant: 'default' as const, color: 'text-blue-600' },
      suggestion: { variant: 'secondary' as const, color: 'text-green-600' }
    }

    const config = variants[type as keyof typeof variants] || variants.feedback

    return (
      <Badge variant={config.variant} className={config.color}>
        {type.toUpperCase()}
      </Badge>
    )
  }

  const openFeedbackDetails = (feedbackItem: FeedbackItem) => {
    setSelectedFeedback(feedbackItem)
    setAdminNotes(feedbackItem.admin_notes || '')
    setShowDetails(true)
  }

  if (authLoading || (!user && !authLoading)) {
    return <div className="p-6">Loading...</div>
  }

  if (!user?.school_id) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            School access required. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (loading) {
    return <div className="p-6">Loading feedback...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feedback Management</h1>
          <p className="text-gray-600">View and manage feedback submissions from your school community</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.total_feedback}</div>
              <div className="text-sm text-gray-600">Total Feedback</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{stats.new_feedback}</div>
              <div className="text-sm text-gray-600">New</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.in_review}</div>
              <div className="text-sm text-gray-600">In Review</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
              <div className="text-sm text-gray-600">Resolved</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{stats.complaints}</div>
              <div className="text-sm text-gray-600">Complaints</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{stats.suggestions}</div>
              <div className="text-sm text-gray-600">Suggestions</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Select value={filter.type} onValueChange={(value) => setFilter({...filter, type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="complaint">Complaints</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                  <SelectItem value="suggestion">Suggestions</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={filter.status} onValueChange={(value) => setFilter({...filter, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      <div className="grid grid-cols-1 gap-4">
        {feedback.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openFeedbackDetails(item)}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getTypeBadge(item.type)}
                  {getStatusBadge(item.status)}
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(item.created_at).toLocaleDateString()}
                </div>
              </div>
              <CardTitle className="text-lg">{item.subject}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 line-clamp-2 mb-2">{item.description}</p>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div>
                  Submitted by: {item.is_anonymous ? 'Anonymous' : (item.submitted_by_name || 'Unknown')}
                </div>
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-1" />
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {feedback.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No feedback yet</h3>
            <p className="text-gray-600">When community members submit feedback, it will appear here.</p>
          </CardContent>
        </Card>
      )}

      {/* Feedback Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedFeedback && (
                <>
                  {getTypeBadge(selectedFeedback.type)}
                  {getStatusBadge(selectedFeedback.status)}
                  <span className="ml-2">{selectedFeedback.subject}</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">Description</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedFeedback.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900">Submitted by</h4>
                  <p className="text-gray-700">
                    {selectedFeedback.is_anonymous ? 'Anonymous' : (selectedFeedback.submitted_by_name || 'Unknown')}
                  </p>
                  {selectedFeedback.submitted_by_email && !selectedFeedback.is_anonymous && (
                    <p className="text-sm text-gray-500">{selectedFeedback.submitted_by_email}</p>
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Submitted on</h4>
                  <p className="text-gray-700">{new Date(selectedFeedback.created_at).toLocaleString()}</p>
                </div>
              </div>

              {selectedFeedback.resolved_by_name && (
                <div>
                  <h4 className="font-medium text-gray-900">Resolved by</h4>
                  <p className="text-gray-700">{selectedFeedback.resolved_by_name}</p>
                  {selectedFeedback.resolved_at && (
                    <p className="text-sm text-gray-500">
                      {new Date(selectedFeedback.resolved_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              <div>
                <h4 className="font-medium text-gray-900">Admin Notes</h4>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes for this feedback..."
                  rows={3}
                />
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">Update Status</h4>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateFeedbackStatus(selectedFeedback.id, 'new', adminNotes)}
                    disabled={selectedFeedback.status === 'new'}
                  >
                    Mark as New
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateFeedbackStatus(selectedFeedback.id, 'in_review', adminNotes)}
                    disabled={selectedFeedback.status === 'in_review'}
                  >
                    In Review
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateFeedbackStatus(selectedFeedback.id, 'resolved', adminNotes)}
                    disabled={selectedFeedback.status === 'resolved'}
                  >
                    Resolved
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateFeedbackStatus(selectedFeedback.id, 'closed', adminNotes)}
                    disabled={selectedFeedback.status === 'closed'}
                  >
                    Closed
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 