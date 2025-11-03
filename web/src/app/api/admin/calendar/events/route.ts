import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Helper function to create notifications when event is published using existing notification system
async function createEventNotifications(
  supabase: any,
  event: any,
  school_id: string
) {
  try {
    const eventDate = new Date(event.event_date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    const eventTime = event.start_time
      ? ` at ${new Date(`1970-01-01T${event.start_time}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })}`
      : '';

    const notificationTitle = `📅 New Event: ${event.title}`;
    const notificationMessage = `${event.title} is scheduled for ${eventDate}${eventTime}.${event.location ? ` Location: ${event.location}` : ''}`;

    // Use the existing bulk notification system with push notification support
    // This automatically creates in-app notifications AND queues push notifications
    const { data, error } = await supabase.rpc('create_bulk_notifications_with_push', {
      p_school_id: school_id,
      p_title: notificationTitle,
      p_message: notificationMessage,
      p_type: 'event',
      p_target_audience: 'all', // Send to both parents and teachers
      p_related_id: event.id,
      p_push_data: {
        type: 'calendar_event',
        event_id: event.id,
        event_type: event.event_type,
        event_date: event.event_date,
        screen: 'Calendar'
      }
    });

    if (error) {
      console.error('Error creating event notifications:', error);
      return;
    }

    const result = data ? (data as any[])[0] : null;
    if (result) {
      console.log(`✅ Event notification sent: ${result.notifications_created} in-app, ${result.push_notifications_queued} push notifications queued for "${event.title}"`);
    }
  } catch (error) {
    console.error('Error in createEventNotifications:', error);
  }
}

// Environment check
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// GET - Fetch calendar events for a school
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const school_id = searchParams.get('school_id');
    const published_only = searchParams.get('published_only') === 'true';
    const event_type = searchParams.get('event_type');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const month = searchParams.get('month'); // YYYY-MM format
    
    if (!school_id) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from('academic_calendar_events')
      .select(`
        *,
        created_by_user:users!academic_calendar_events_created_by_fkey(first_name, last_name)
      `)
      .eq('school_id', school_id);

    // Apply filters
    if (published_only) {
      query = query.eq('is_published', true);
    }

    if (event_type) {
      query = query.eq('event_type', event_type);
    }

    // Date range filtering
    if (start_date && end_date) {
      query = query.gte('event_date', start_date).lte('event_date', end_date);
    } else if (month) {
      // Filter by specific month (YYYY-MM)
      const [year, monthNum] = month.split('-');
      const startOfMonth = `${year}-${monthNum}-01`;
      const endOfMonth = new Date(parseInt(year), parseInt(monthNum), 0).toISOString().split('T')[0];
      query = query.gte('event_date', startOfMonth).lte('event_date', endOfMonth);
    }

    // Order by date and time
    query = query.order('event_date', { ascending: true })
                .order('start_time', { ascending: true });

    const { data: events, error } = await query;

    if (error) {
      console.error('Error fetching calendar events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch calendar events' },
        { status: 500 }
      );
    }

    // Transform the data
    const transformedEvents = events?.map(event => ({
      ...event,
      created_by_name: event.created_by_user ? 
        `${event.created_by_user.first_name} ${event.created_by_user.last_name}` : 
        'Unknown'
    })) || [];

    return NextResponse.json({
      success: true,
      data: transformedEvents
    });

  } catch (error) {
    console.error('Calendar events API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new calendar event
export async function POST(request: NextRequest) {
  try {
    const {
      school_id,
      title,
      description,
      event_date,
      start_time,
      end_time,
      event_type,
      is_published = false,
      is_recurring = false,
      recurrence_pattern,
      recurrence_end_date,
      color = '#3B82F6',
      location,
      created_by
    } = await request.json();

    // Validate required fields
    if (!school_id || !title || !event_date || !event_type || !created_by) {
      return NextResponse.json(
        { error: 'School ID, title, event date, event type, and created_by are required' },
        { status: 400 }
      );
    }

    // Validate title length
    if (title.length < 3 || title.length > 255) {
      return NextResponse.json(
        { error: 'Title must be between 3 and 255 characters' },
        { status: 400 }
      );
    }

    // Validate event_date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(event_date)) {
      return NextResponse.json(
        { error: 'Event date must be in YYYY-MM-DD format' },
        { status: 400 }
      );
    }

    // Validate event_type
    const validTypes = ['holiday', 'exam', 'ptm', 'activity', 'assembly', 'sports', 'cultural', 'academic', 'other'];
    if (!validTypes.includes(event_type)) {
      return NextResponse.json(
        { error: `Event type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate time format if provided
    const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (start_time && !timePattern.test(start_time)) {
      return NextResponse.json(
        { error: 'Start time must be in HH:MM format' },
        { status: 400 }
      );
    }

    if (end_time && !timePattern.test(end_time)) {
      return NextResponse.json(
        { error: 'End time must be in HH:MM format' },
        { status: 400 }
      );
    }

    // Validate time logic
    if (start_time && end_time && start_time >= end_time) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    // Validate color format (hex color)
    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
      return NextResponse.json(
        { error: 'Color must be a valid hex color code (e.g., #3B82F6)' },
        { status: 400 }
      );
    }

    // Validate recurrence fields
    if (is_recurring) {
      const validPatterns = ['weekly', 'monthly', 'yearly'];
      if (!recurrence_pattern || !validPatterns.includes(recurrence_pattern)) {
        return NextResponse.json(
          { error: `Recurrence pattern must be one of: ${validPatterns.join(', ')}` },
          { status: 400 }
        );
      }

      if (recurrence_end_date && !/^\d{4}-\d{2}-\d{2}$/.test(recurrence_end_date)) {
        return NextResponse.json(
          { error: 'Recurrence end date must be in YYYY-MM-DD format' },
          { status: 400 }
        );
      }

      if (recurrence_end_date && recurrence_end_date <= event_date) {
        return NextResponse.json(
          { error: 'Recurrence end date must be after event date' },
          { status: 400 }
        );
      }
    }

    // Create the event
    const { data: event, error } = await supabaseAdmin
      .from('academic_calendar_events')
      .insert({
        school_id,
        title: title.trim(),
        description: description?.trim() || null,
        event_date,
        start_time: start_time || null,
        end_time: end_time || null,
        event_type,
        is_published,
        is_recurring,
        recurrence_pattern: is_recurring ? recurrence_pattern : null,
        recurrence_end_date: is_recurring ? (recurrence_end_date || null) : null,
        color,
        location: location?.trim() || null,
        created_by
      })
      .select(`
        *,
        created_by_user:users!academic_calendar_events_created_by_fkey(first_name, last_name)
      `)
      .single();

    if (error) {
      console.error('Error creating calendar event:', error);
      return NextResponse.json(
        { error: 'Failed to create calendar event' },
        { status: 500 }
      );
    }

    // Transform the response
    const transformedEvent = {
      ...event,
      created_by_name: event.created_by_user ?
        `${event.created_by_user.first_name} ${event.created_by_user.last_name}` :
        'Unknown'
    };

    // If event is published immediately, create notifications
    if (is_published) {
      await createEventNotifications(supabaseAdmin, event, school_id);
    }

    return NextResponse.json({
      success: true,
      data: transformedEvent,
      message: 'Calendar event created successfully'
    });

  } catch (error) {
    console.error('Create calendar event API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update a calendar event
export async function PUT(request: NextRequest) {
  try {
    const {
      id,
      school_id,
      title,
      description,
      event_date,
      start_time,
      end_time,
      event_type,
      is_published,
      is_recurring,
      recurrence_pattern,
      recurrence_end_date,
      color,
      location
    } = await request.json();

    if (!id || !school_id) {
      return NextResponse.json(
        { error: 'Event ID and school ID are required' },
        { status: 400 }
      );
    }

    // Build update object with validation
    const updateData: any = {};
    
    if (title !== undefined) {
      if (title.length < 3 || title.length > 255) {
        return NextResponse.json(
          { error: 'Title must be between 3 and 255 characters' },
          { status: 400 }
        );
      }
      updateData.title = title.trim();
    }
    
    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }
    
    if (event_date !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(event_date)) {
        return NextResponse.json(
          { error: 'Event date must be in YYYY-MM-DD format' },
          { status: 400 }
        );
      }
      updateData.event_date = event_date;
    }
    
    if (start_time !== undefined) {
      const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (start_time && !timePattern.test(start_time)) {
        return NextResponse.json(
          { error: 'Start time must be in HH:MM format' },
          { status: 400 }
        );
      }
      updateData.start_time = start_time || null;
    }
    
    if (end_time !== undefined) {
      const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (end_time && !timePattern.test(end_time)) {
        return NextResponse.json(
          { error: 'End time must be in HH:MM format' },
          { status: 400 }
        );
      }
      updateData.end_time = end_time || null;
    }
    
    if (event_type !== undefined) {
      const validTypes = ['holiday', 'exam', 'ptm', 'activity', 'assembly', 'sports', 'cultural', 'academic', 'other'];
      if (!validTypes.includes(event_type)) {
        return NextResponse.json(
          { error: `Event type must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.event_type = event_type;
    }
    
    if (is_published !== undefined) {
      updateData.is_published = Boolean(is_published);
    }
    
    if (is_recurring !== undefined) {
      updateData.is_recurring = Boolean(is_recurring);
    }
    
    if (recurrence_pattern !== undefined) {
      updateData.recurrence_pattern = recurrence_pattern || null;
    }
    
    if (recurrence_end_date !== undefined) {
      updateData.recurrence_end_date = recurrence_end_date || null;
    }
    
    if (color !== undefined) {
      if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
        return NextResponse.json(
          { error: 'Color must be a valid hex color code' },
          { status: 400 }
        );
      }
      updateData.color = color || '#3B82F6';
    }
    
    if (location !== undefined) {
      updateData.location = location?.trim() || null;
    }

    // Get the current event state before update to check if it's being published
    const { data: oldEvent } = await supabaseAdmin
      .from('academic_calendar_events')
      .select('is_published')
      .eq('id', id)
      .eq('school_id', school_id)
      .single();

    // Update the event
    const { data: event, error } = await supabaseAdmin
      .from('academic_calendar_events')
      .update(updateData)
      .eq('id', id)
      .eq('school_id', school_id)
      .select(`
        *,
        created_by_user:users!academic_calendar_events_created_by_fkey(first_name, last_name)
      `)
      .single();

    if (error) {
      console.error('Error updating calendar event:', error);
      return NextResponse.json(
        { error: 'Failed to update calendar event' },
        { status: 500 }
      );
    }

    if (!event) {
      return NextResponse.json(
        { error: 'Calendar event not found or access denied' },
        { status: 404 }
      );
    }

    // Transform the response
    const transformedEvent = {
      ...event,
      created_by_name: event.created_by_user ?
        `${event.created_by_user.first_name} ${event.created_by_user.last_name}` :
        'Unknown'
    };

    // If event was just published (changed from false to true), create notifications
    if (oldEvent && !oldEvent.is_published && event.is_published) {
      await createEventNotifications(supabaseAdmin, event, school_id);
    }

    return NextResponse.json({
      success: true,
      data: transformedEvent,
      message: 'Calendar event updated successfully'
    });

  } catch (error) {
    console.error('Update calendar event API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a calendar event
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const school_id = searchParams.get('school_id');

    if (!id || !school_id) {
      return NextResponse.json(
        { error: 'Event ID and school ID are required' },
        { status: 400 }
      );
    }

    // Get the event details before deletion
    const { data: event, error: fetchError } = await supabaseAdmin
      .from('academic_calendar_events')
      .select('id, title, event_type, event_date')
      .eq('id', id)
      .eq('school_id', school_id)
      .single();

    if (fetchError || !event) {
      return NextResponse.json(
        { error: 'Calendar event not found or access denied' },
        { status: 404 }
      );
    }

    // Delete the event
    const { error: deleteError } = await supabaseAdmin
      .from('academic_calendar_events')
      .delete()
      .eq('id', id)
      .eq('school_id', school_id);

    if (deleteError) {
      console.error('Error deleting calendar event:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete calendar event' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Calendar event "${event.title}" deleted successfully`
    });

  } catch (error) {
    console.error('Delete calendar event API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 