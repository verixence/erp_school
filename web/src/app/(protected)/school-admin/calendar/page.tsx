'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Plus, Edit, Trash2, CalendarDays, Clock, MapPin, Eye, EyeOff, Repeat, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/hooks/use-auth'

interface CalendarEvent {
  id: string
  title: string
  description: string | null
  event_date: string
  start_time: string | null
  end_time: string | null
  event_type: string
  is_published: boolean
  is_recurring: boolean
  recurrence_pattern: string | null
  recurrence_end_date: string | null
  color: string
  location: string | null
  created_at: string
  created_by_name: string
}

const EVENT_TYPES = [
  { value: 'academic', label: 'Academic', color: 'bg-blue-500' },
  { value: 'sports', label: 'Sports', color: 'bg-green-500' },
  { value: 'cultural', label: 'Cultural', color: 'bg-purple-500' },
  { value: 'meeting', label: 'Meeting', color: 'bg-orange-500' },
  { value: 'holiday', label: 'Holiday', color: 'bg-red-500' },
  { value: 'exam', label: 'Exam', color: 'bg-yellow-500' },
  { value: 'other', label: 'Other', color: 'bg-gray-500' }
]

const RECURRENCE_PATTERNS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' }
]

export default function CalendarManagement() {
  const { user, isLoading: authLoading } = useAuth()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_date: '',
    start_time: '',
    end_time: '',
    event_type: 'academic',
    location: '',
    color: '#3B82F6',
    is_published: false,
    is_recurring: false,
    recurrence_pattern: 'weekly',
    recurrence_end_date: ''
  })

  useEffect(() => {
    if (user?.school_id) {
      fetchEvents()
    }
  }, [user?.school_id])

  const fetchEvents = async () => {
    if (!user?.school_id) return

    try {
      const response = await fetch(`/api/admin/calendar/events?school_id=${user.school_id}`)
      if (response.ok) {
        const data = await response.json()
        setEvents(data.data || [])
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to fetch events')
      }
    } catch (error) {
      alert('Failed to fetch events')
    } finally {
      setLoading(false)
    }
  }

  const createEvent = async () => {
    if (!user?.school_id || !user?.id) {
      alert('Authentication required')
      return
    }

    try {
      const eventData = {
        ...newEvent,
        school_id: user.school_id,
        created_by: user.id,
        color: EVENT_TYPES.find(t => t.value === newEvent.event_type)?.color || '#3B82F6',
        start_time: newEvent.start_time || null,
        end_time: newEvent.end_time || null,
        description: newEvent.description || null,
        location: newEvent.location || null,
        recurrence_pattern: newEvent.is_recurring ? newEvent.recurrence_pattern : null,
        recurrence_end_date: newEvent.is_recurring ? newEvent.recurrence_end_date : null
      }

      const response = await fetch('/api/admin/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })

      if (response.ok) {
        alert('Event created successfully')
        setShowCreateEvent(false)
        resetForm()
        fetchEvents()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create event')
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create event')
    }
  }

  const updateEvent = async () => {
    if (!editingEvent || !user?.school_id) return

    try {
      const eventData = {
        ...newEvent,
        id: editingEvent.id,
        school_id: user.school_id,
        color: EVENT_TYPES.find(t => t.value === newEvent.event_type)?.color || newEvent.color,
        start_time: newEvent.start_time || null,
        end_time: newEvent.end_time || null,
        description: newEvent.description || null,
        location: newEvent.location || null,
        recurrence_pattern: newEvent.is_recurring ? newEvent.recurrence_pattern : null,
        recurrence_end_date: newEvent.is_recurring ? newEvent.recurrence_end_date : null
      }

      const response = await fetch('/api/admin/calendar/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })

      if (response.ok) {
        alert('Event updated successfully')
        setEditingEvent(null)
        resetForm()
        fetchEvents()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update event')
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update event')
    }
  }

  const deleteEvent = async (eventId: string) => {
    if (!user?.school_id) return
    if (!confirm('Are you sure you want to delete this event?')) return

    try {
      const response = await fetch(`/api/admin/calendar/events?id=${eventId}&school_id=${user.school_id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('Event deleted successfully')
        fetchEvents()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete event')
      }
    } catch (error) {
      alert('Failed to delete event')
    }
  }

  const toggleEventStatus = async (event: CalendarEvent) => {
    if (!user?.school_id) return

    try {
      const response = await fetch('/api/admin/calendar/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: event.id,
          school_id: user.school_id,
          is_published: !event.is_published
        })
      })

      if (response.ok) {
        alert(`Event ${!event.is_published ? 'published' : 'unpublished'} successfully`)
        fetchEvents()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update event status')
      }
    } catch (error) {
      alert('Failed to update event status')
    }
  }

  const resetForm = () => {
    setNewEvent({
      title: '',
      description: '',
      event_date: '',
      start_time: '',
      end_time: '',
      event_type: 'academic',
      location: '',
      color: '#3B82F6',
      is_published: false,
      is_recurring: false,
      recurrence_pattern: 'weekly',
      recurrence_end_date: ''
    })
  }

  const openEditDialog = (event: CalendarEvent) => {
    setEditingEvent(event)
    setNewEvent({
      title: event.title,
      description: event.description || '',
      event_date: event.event_date,
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      event_type: event.event_type,
      location: event.location || '',
      color: event.color,
      is_published: event.is_published,
      is_recurring: event.is_recurring,
      recurrence_pattern: event.recurrence_pattern || 'weekly',
      recurrence_end_date: event.recurrence_end_date || ''
    })
    setShowCreateEvent(true)
  }

  const getEventTypeBadge = (type: string) => {
    const eventType = EVENT_TYPES.find(t => t.value === type)
    return (
      <Badge variant="secondary" style={{ backgroundColor: eventType?.color + '20', color: eventType?.color }}>
        {eventType?.label || type}
      </Badge>
    )
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return null
    return new Date(`1970-01-01T${timeStr}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getUpcomingEvents = () => {
    const today = new Date()
    const nextWeek = new Date()
    nextWeek.setDate(today.getDate() + 7)
    
    return events.filter(event => {
      const eventDate = new Date(event.event_date)
      return eventDate >= today && eventDate <= nextWeek && event.is_published
    }).sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
  }

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days: (number | null)[] = []
    
    // Add empty cells for days before the month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add the days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    
    return days
  }

  const formatDateForCalendar = (date: Date, day: number) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return new Date(year, month, day).toISOString().split('T')[0]
  }

  const getEventsForDate = (dateStr: string) => {
    return events.filter(event => event.event_date === dateStr)
  }

  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0]
    return dateStr === today
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const CalendarGrid = () => {
    const days = getDaysInMonth(currentDate)
    
    return (
      <div className="bg-white rounded-lg border">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b">
          {dayNames.map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="h-32 border-r border-b last:border-r-0"></div>
            }

            const dateStr = formatDateForCalendar(currentDate, day)
            const dayEvents = getEventsForDate(dateStr)
            const isCurrentDay = isToday(dateStr)

            return (
              <div 
                key={day} 
                className={`h-32 border-r border-b last:border-r-0 p-1 cursor-pointer hover:bg-gray-50 ${
                  isCurrentDay ? 'bg-blue-50' : ''
                }`}
                onClick={() => {
                  setSelectedDate(dateStr)
                  setNewEvent(prev => ({ ...prev, event_date: dateStr }))
                  setShowCreateEvent(true)
                }}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isCurrentDay ? 'text-blue-600' : 'text-gray-900'
                }`}>
                  {day}
                </div>
                
                {/* Events for this day */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map(event => {
                    const eventType = EVENT_TYPES.find(t => t.value === event.event_type)
                    return (
                      <div
                        key={event.id}
                        className={`text-xs p-1 rounded text-white truncate cursor-pointer ${
                          eventType?.color || 'bg-gray-500'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditDialog(event)
                        }}
                        title={`${event.title}${event.start_time ? ` at ${formatTime(event.start_time)}` : ''}`}
                      >
                        {event.title}
                        {!event.is_published && ' (Draft)'}
                      </div>
                    )
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500 font-medium">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const EventsList = () => (
    <div className="grid grid-cols-1 gap-4">
      {events.map((event) => (
        <Card key={event.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {getEventTypeBadge(event.event_type)}
                <Badge variant={event.is_published ? 'default' : 'secondary'}>
                  {event.is_published ? 'Published' : 'Draft'}
                </Badge>
                {event.is_recurring && (
                  <Badge variant="outline">
                    <Repeat className="w-3 h-3 mr-1" />
                    Recurring
                  </Badge>
                )}
              </div>
              <div className="text-sm text-gray-500">
                {formatDate(event.event_date)}
              </div>
            </div>
            <CardTitle className="text-lg">{event.title}</CardTitle>
            <p className="text-xs text-gray-500">Created by {event.created_by_name}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {event.description && (
              <p className="text-gray-700 line-clamp-2">{event.description}</p>
            )}
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
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

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditDialog(event)}
                className="flex-1"
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleEventStatus(event)}
                className="flex-1"
              >
                {event.is_published ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-1" />
                    Unpublish
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-1" />
                    Publish
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteEvent(event.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

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
    return <div className="p-6">Loading calendar events...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Academic Calendar</h1>
          <p className="text-gray-600">Manage school events and academic calendar</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              <Calendar className="w-4 h-4 mr-1" />
              Calendar
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <CalendarDays className="w-4 h-4 mr-1" />
              List
            </Button>
          </div>
          
          <Dialog open={showCreateEvent} onOpenChange={setShowCreateEvent}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingEvent ? 'Edit Event' : 'Create New Event'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Event Title *</Label>
                    <Input
                      id="title"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                      placeholder="Enter event title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="event_type">Event Type *</Label>
                    <Select value={newEvent.event_type} onValueChange={(value) => setNewEvent({...newEvent, event_type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EVENT_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                    placeholder="Event description"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="event_date">Event Date *</Label>
                    <Input
                      id="event_date"
                      type="date"
                      value={newEvent.event_date}
                      onChange={(e) => setNewEvent({...newEvent, event_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={newEvent.start_time}
                      onChange={(e) => setNewEvent({...newEvent, start_time: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={newEvent.end_time}
                      onChange={(e) => setNewEvent({...newEvent, end_time: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                    placeholder="Event location"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="recurring"
                      checked={newEvent.is_recurring}
                      onCheckedChange={(checked) => setNewEvent({...newEvent, is_recurring: checked})}
                    />
                    <Label htmlFor="recurring">Recurring Event</Label>
                  </div>

                  {newEvent.is_recurring && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="recurrence_pattern">Recurrence Pattern</Label>
                        <Select value={newEvent.recurrence_pattern} onValueChange={(value) => setNewEvent({...newEvent, recurrence_pattern: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select pattern" />
                          </SelectTrigger>
                          <SelectContent>
                            {RECURRENCE_PATTERNS.map(pattern => (
                              <SelectItem key={pattern.value} value={pattern.value}>
                                {pattern.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="recurrence_end_date">Recurrence End Date</Label>
                        <Input
                          id="recurrence_end_date"
                          type="date"
                          value={newEvent.recurrence_end_date}
                          onChange={(e) => setNewEvent({...newEvent, recurrence_end_date: e.target.value})}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="published"
                    checked={newEvent.is_published}
                    onCheckedChange={(checked) => setNewEvent({...newEvent, is_published: checked})}
                  />
                  <Label htmlFor="published">Publish immediately</Label>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={editingEvent ? updateEvent : createEvent} 
                    className="flex-1"
                  >
                    {editingEvent ? 'Update Event' : 'Create Event'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowCreateEvent(false)
                      setEditingEvent(null)
                      resetForm()
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Events must be published to be visible to parents and students in their portals.
        </AlertDescription>
      </Alert>

      {/* Upcoming Events Summary */}
      {getUpcomingEvents().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Upcoming Events (Next 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getUpcomingEvents().slice(0, 5).map(event => (
                <div key={event.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    {getEventTypeBadge(event.event_type)}
                    <span className="font-medium">{event.title}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatDate(event.event_date)}
                    {event.start_time && ` at ${formatTime(event.start_time)}`}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar or List View */}
      {loading ? (
        <div className="text-center py-8">Loading events...</div>
      ) : viewMode === 'calendar' ? (
        <CalendarGrid />
      ) : (
        <EventsList />
      )}

      {events.length === 0 && !loading && (
        <Card className="text-center py-12">
          <CardContent>
            <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
            <p className="text-gray-600 mb-4">Create your first event to get started with the academic calendar.</p>
            <Button onClick={() => setShowCreateEvent(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Event
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 