'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar as CalendarIcon, Clock, MapPin, Search, Filter, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

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

export default function ParentCalendar() {
  const { user } = useAuth()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [currentDate, setCurrentDate] = useState(new Date())
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
      const response = await fetch(`/api/admin/calendar/events?school_id=${user.school_id}&published_only=true`)
      if (response.ok) {
        const data = await response.json()
        setEvents(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
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

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (number | null)[] = []

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

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

  const isTodayDate = (dateStr: string) => {
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

    // Update filter month/year when navigating
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setMonth(currentDate.getMonth() - 1)
    } else {
      newDate.setMonth(currentDate.getMonth() + 1)
    }
    setSelectedMonth(newDate.getMonth())
    setSelectedYear(newDate.getFullYear())
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const CalendarGrid = () => {
    const days = getDaysInMonth(currentDate)

    return (
      <div className="bg-white rounded-lg border">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">
            {months[currentDate.getMonth()]} {currentDate.getFullYear()}
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
              onClick={() => {
                const today = new Date()
                setCurrentDate(today)
                setSelectedMonth(today.getMonth())
                setSelectedYear(today.getFullYear())
              }}
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
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {dayNames.map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-600 border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="h-32 border-r border-b last:border-r-0 bg-gray-50"></div>
            }

            const dateStr = formatDateForCalendar(currentDate, day)
            const dayEvents = getEventsForDate(dateStr)
            const isCurrentDay = isTodayDate(dateStr)

            return (
              <div
                key={day}
                className={`h-32 border-r border-b last:border-r-0 p-1 ${
                  isCurrentDay ? 'bg-blue-50' : 'bg-white'
                }`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isCurrentDay ? 'text-blue-600 font-bold' : 'text-gray-900'
                }`}>
                  {day}
                </div>

                {/* Events for this day */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      className="text-xs p-1 rounded text-white truncate"
                      style={{ backgroundColor: event.color }}
                      title={`${event.title}${event.start_time ? ` at ${formatTime(event.start_time)}` : ''}`}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500 font-medium pl-1">
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
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">
        {months[selectedMonth]} {selectedYear} Events
        {filteredEvents.length > 0 && (
          <span className="text-sm font-normal text-gray-600 ml-2">
            ({filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''})
          </span>
        )}
      </h2>

      {filteredEvents.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <CalendarIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No events found
            </h3>
            <p className="text-gray-600">
              {searchTerm
                ? 'Try adjusting your search or filter criteria.'
                : `No events scheduled for ${months[selectedMonth]} ${selectedYear}.`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        filteredEvents
          .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
          .map((event) => (
          <Card key={event.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: event.color }}
                    />
                    <h3 className="text-lg font-semibold">{event.title}</h3>
                    {getEventTypeBadge(event.event_type, event.color)}
                    {isToday(event.event_date) && (
                      <Badge variant="destructive">Today</Badge>
                    )}
                    {event.is_recurring && (
                      <Badge variant="outline" className="text-purple-600">
                        Recurring
                      </Badge>
                    )}
                  </div>

                  {event.description && (
                    <p className="text-gray-700">{event.description}</p>
                  )}

                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="w-4 h-4" />
                      {formatDate(event.event_date)}
                    </div>
                    {(event.start_time || event.end_time) && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatTime(event.start_time)}
                        {event.end_time && ` - ${formatTime(event.end_time)}`}
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
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )

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

        <div className="flex items-center border rounded-lg p-1">
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('calendar')}
          >
            <CalendarIcon className="w-4 h-4 mr-1" />
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
                <div key={event.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: event.color }}
                  />
                  <div className="flex-1">
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
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No upcoming events scheduled.</p>
          )}
        </CardContent>
      </Card>

      {/* Filters - Only show in list view */}
      {viewMode === 'list' && (
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: type.color }}
                        />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
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
                  <SelectValue />
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
      )}

      {/* Calendar or List View */}
      {viewMode === 'calendar' ? (
        <CalendarGrid />
      ) : (
        <EventsList />
      )}
    </div>
  )
}
