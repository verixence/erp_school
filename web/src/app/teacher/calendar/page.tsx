'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar as CalendarIcon, Clock, MapPin, Search, Filter, CalendarDays, Plus, Edit, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface CalendarEvent {
  id: string
  title: string
  description: string | null
  event_date: string
  start_time: string | null
  end_time: string | null
  event_type: string
  color: string
  location: string | null
  is_recurring: boolean
  recurrence_pattern: string | null
  status: 'draft' | 'published'
}

const EVENT_TYPES = [
  { value: 'all', label: 'All Events', color: '#6B7280' },
  { value: 'holiday', label: 'Holiday', color: '#EF4444' },
  { value: 'exam', label: 'Exam', color: '#DC2626' },
  { value: 'ptm', label: 'Parent-Teacher Meeting', color: '#7C3AED' },
  { value: 'activity', label: 'Activity', color: '#059669' },
  { value: 'assembly', label: 'Assembly', color: '#2563EB' },
  { value: 'sports', label: 'Sports', color: '#EA580C' },
  { value: 'cultural', label: 'Cultural', color: '#DB2777' },
  { value: 'academic', label: 'Academic', color: '#0D9488' },
  { value: 'other', label: 'Other', color: '#6B7280' }
]

export default function TeacherCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [formData, setFormData] = useState<{
    title: string
    description: string
    event_date: string
    start_time: string
    end_time: string
    event_type: string
    location: string
    status: 'draft' | 'published'
  }>({
    title: '',
    description: '',
    event_date: '',
    start_time: '',
    end_time: '',
    event_type: 'academic',
    location: '',
    status: 'draft'
  })

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/admin/calendar/events')
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events || [])
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
      toast.error('Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const createEvent = async () => {
    try {
      const eventTypeData = EVENT_TYPES.find(t => t.value === formData.event_type)
      const eventData = {
        ...formData,
        color: eventTypeData?.color || '#6B7280'
      }
      
      const response = await fetch('/api/admin/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })
      
      if (response.ok) {
        toast.success('Event created successfully')
        setShowCreateModal(false)
        resetForm()
        fetchEvents()
      } else {
        toast.error('Failed to create event')
      }
    } catch (error) {
      console.error('Failed to create event:', error)
      toast.error('Failed to create event')
    }
  }

  const updateEvent = async () => {
    if (!editingEvent) return
    
    try {
      const eventTypeData = EVENT_TYPES.find(t => t.value === formData.event_type)
      const eventData = {
        ...formData,
        color: eventTypeData?.color || '#6B7280'
      }
      
      const response = await fetch(`/api/admin/calendar/events/${editingEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })
      
      if (response.ok) {
        toast.success('Event updated successfully')
        setShowEditModal(false)
        setEditingEvent(null)
        resetForm()
        fetchEvents()
      } else {
        toast.error('Failed to update event')
      }
    } catch (error) {
      console.error('Failed to update event:', error)
      toast.error('Failed to update event')
    }
  }

  const deleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return
    }
    
    try {
      const response = await fetch(`/api/admin/calendar/events/${eventId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast.success('Event deleted successfully')
        fetchEvents()
      } else {
        toast.error('Failed to delete event')
      }
    } catch (error) {
      console.error('Failed to delete event:', error)
      toast.error('Failed to delete event')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_date: '',
      start_time: '',
      end_time: '',
      event_type: 'academic',
      location: '',
      status: 'draft'
    })
  }

  const openCreateModal = () => {
    resetForm()
    setShowCreateModal(true)
  }

  const openEditModal = (event: CalendarEvent) => {
    setEditingEvent(event)
    setFormData({
      title: event.title,
      description: event.description || '',
      event_date: event.event_date,
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      event_type: event.event_type,
      location: event.location || '',
      status: event.status
    })
    setShowEditModal(true)
  }

  const getEventTypeBadge = (type: string, color: string) => {
    const eventType = EVENT_TYPES.find(t => t.value === type)
    return (
      <Badge 
        variant="outline" 
        style={{ 
          borderColor: color,
          color: color
        }}
      >
        {eventType?.label || type}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    return status === 'published' ? (
      <Badge variant="default" className="bg-green-100 text-green-800">Published</Badge>
    ) : (
      <Badge variant="secondary">Draft</Badge>
    )
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return null
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const isUpcoming = (dateStr: string) => {
    const eventDate = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return eventDate >= today
  }

  const isToday = (dateStr: string) => {
    const eventDate = new Date(dateStr)
    const today = new Date()
    return eventDate.toDateString() === today.toDateString()
  }

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.location?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = selectedType === 'all' || event.event_type === selectedType
    
    const eventDate = new Date(event.event_date)
    const matchesMonth = eventDate.getMonth() === selectedMonth && eventDate.getFullYear() === selectedYear
    
    return matchesSearch && matchesType && matchesMonth
  })

  const upcomingEvents = events
    .filter(event => isUpcoming(event.event_date))
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
    .slice(0, 5)

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 3 }, (_, i) => currentYear - 1 + i)

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Academic Calendar Management</h1>
          <p className="text-gray-600">Create and manage school events and important dates</p>
        </div>
        <Button onClick={openCreateModal} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Event
        </Button>
      </div>

      {/* Upcoming Events Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Upcoming Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: event.color }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{event.title}</span>
                        {isToday(event.event_date) && (
                          <Badge variant="destructive" className="text-xs">Today</Badge>
                        )}
                        {getStatusBadge(event.status)}
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatDate(event.event_date)}
                        {event.start_time && ` at ${formatTime(event.start_time)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => openEditModal(event)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deleteEvent(event.id)} className="text-red-600 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No upcoming events scheduled.</p>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Events for {months[selectedMonth]} {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEvents.length > 0 ? (
            <div className="space-y-4">
              {filteredEvents
                .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
                .map((event) => (
                <div key={event.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: event.color }}
                        />
                        <h3 className="text-lg font-semibold">{event.title}</h3>
                        {getEventTypeBadge(event.event_type, event.color)}
                        {getStatusBadge(event.status)}
                        {isToday(event.event_date) && (
                          <Badge variant="destructive">Today</Badge>
                        )}
                      </div>
                      
                      {event.description && (
                        <p className="text-gray-700 mb-3">{event.description}</p>
                      )}
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4" />
                          {formatDate(event.event_date)}
                        </div>
                        
                        {(event.start_time || event.end_time) && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {event.start_time && formatTime(event.start_time)}
                            {event.start_time && event.end_time && ' - '}
                            {event.end_time && formatTime(event.end_time)}
                          </div>
                        )}
                        
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {event.location}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button size="sm" variant="outline" onClick={() => openEditModal(event)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deleteEvent(event.id)} className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CalendarIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || selectedType !== 'all' ? 'No events found' : 'No events for this month'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedType !== 'all' 
                  ? 'Try adjusting your search criteria.'
                  : 'Create your first event to get started.'
                }
              </p>
              {!searchTerm && selectedType === 'all' && (
                <Button onClick={openCreateModal}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Event
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Event Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Event Title *</label>
              <Input
                placeholder="Enter event title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Event Type</label>
              <Select value={formData.event_type} onValueChange={(value) => setFormData({ ...formData, event_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.filter(t => t.value !== 'all').map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Event Date *</label>
              <Input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Start Time</label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">End Time</label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              <Input
                placeholder="Event location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                placeholder="Event description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select value={formData.status} onValueChange={(value: 'draft' | 'published') => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
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
                onClick={createEvent}
                disabled={!formData.title.trim() || !formData.event_date}
                className="flex-1"
              >
                Create Event
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Event Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Event Title *</label>
              <Input
                placeholder="Enter event title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Event Type</label>
              <Select value={formData.event_type} onValueChange={(value) => setFormData({ ...formData, event_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.filter(t => t.value !== 'all').map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Event Date *</label>
              <Input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Start Time</label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">End Time</label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              <Input
                placeholder="Event location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                placeholder="Event description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select value={formData.status} onValueChange={(value: 'draft' | 'published') => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowEditModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={updateEvent}
                disabled={!formData.title.trim() || !formData.event_date}
                className="flex-1"
              >
                Update Event
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 