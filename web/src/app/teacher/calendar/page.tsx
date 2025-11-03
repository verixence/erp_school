'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar as CalendarIcon, Clock, MapPin, Search, Filter, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'

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
  const { user } = useAuth()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    if (user?.school_id) {
      fetchEvents()
    }
  }, [user?.school_id])

  const fetchEvents = async () => {
    if (!user?.school_id) {
      setLoading(false)
      return
    }

    try {
      // Fetch only published events for teachers
      const response = await fetch(`/api/admin/calendar/events?school_id=${user.school_id}&published_only=true`)
      if (response.ok) {
        const data = await response.json()
        setEvents(data.data || [])
      } else {
        toast.error('Failed to load events')
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
      toast.error('Failed to load events')
    } finally {
      setLoading(false)
    }
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
          <h1 className="text-2xl font-bold">Academic Calendar</h1>
          <p className="text-gray-600">View school events and important dates</p>
        </div>
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
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatDate(event.event_date)}
                        {event.start_time && ` at ${formatTime(event.start_time)}`}
                      </p>
                    </div>
                  </div>
                  {getEventTypeBadge(event.event_type, event.color)}
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
              <p className="text-gray-600">
                {searchTerm || selectedType !== 'all'
                  ? 'Try adjusting your search criteria.'
                  : 'No events have been scheduled for this month yet.'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
