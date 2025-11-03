'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarDays, Clock, MapPin, ChevronRight } from 'lucide-react'
import Link from 'next/link'

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
}

interface UpcomingEventsWidgetProps {
  schoolId: string
  userRole: 'parent' | 'teacher'
  limit?: number
}

export function UpcomingEventsWidget({ schoolId, userRole, limit = 5 }: UpcomingEventsWidgetProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUpcomingEvents()
  }, [schoolId])

  const fetchUpcomingEvents = async () => {
    try {
      const response = await fetch(`/api/admin/calendar/events?school_id=${schoolId}&published_only=true`)
      if (response.ok) {
        const data = await response.json()
        const allEvents = data.data || []

        // Filter upcoming events
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const upcoming = allEvents
          .filter((event: CalendarEvent) => {
            const eventDate = new Date(event.event_date)
            return eventDate >= today
          })
          .sort((a: CalendarEvent, b: CalendarEvent) =>
            new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
          )
          .slice(0, limit)

        setEvents(upcoming)
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow'
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      })
    }
  }

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return null
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const isToday = (dateStr: string) => {
    const eventDate = new Date(dateStr)
    const today = new Date()
    return eventDate.toDateString() === today.toDateString()
  }

  const isTomorrow = (dateStr: string) => {
    const eventDate = new Date(dateStr)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return eventDate.toDateString() === tomorrow.toDateString()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="w-5 h-5" />
            Upcoming Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">Loading events...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="w-5 h-5" />
            Upcoming Events
          </CardTitle>
          <Link href={`/${userRole}/calendar`}>
            <Button variant="ghost" size="sm">
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8">
            <CalendarDays className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No upcoming events</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
              >
                {/* Color indicator */}
                <div
                  className="w-1 h-full rounded-full flex-shrink-0"
                  style={{ backgroundColor: event.color }}
                />

                {/* Event details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-medium text-sm line-clamp-1">{event.title}</h4>
                    {(isToday(event.event_date) || isTomorrow(event.event_date)) && (
                      <Badge
                        variant={isToday(event.event_date) ? 'destructive' : 'default'}
                        className="text-xs flex-shrink-0"
                      >
                        {formatDate(event.event_date)}
                      </Badge>
                    )}
                  </div>

                  {event.description && (
                    <p className="text-xs text-gray-600 line-clamp-1 mb-2">
                      {event.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {!isToday(event.event_date) && !isTomorrow(event.event_date) && (
                      <div className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {formatDate(event.event_date)}
                      </div>
                    )}
                    {event.start_time && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(event.start_time)}
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
