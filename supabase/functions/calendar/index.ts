import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { google } from "npm:googleapis@126.0.1";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, interviewId } = await req.json();

    switch (action) {
      case 'schedule':
        return await scheduleInterview(interviewId);
      case 'update':
        return await updateInterview(interviewId);
      case 'cancel':
        return await cancelInterview(interviewId);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

async function getInterviewDetails(interviewId: string) {
  const { data, error } = await supabase
    .from('interviews')
    .select(`
      *,
      candidate:candidates(*),
      interviewer:users(*)
    `)
    .eq('id', interviewId)
    .single();

  if (error) throw error;
  return data;
}

async function scheduleInterview(interviewId: string) {
  const interview = await getInterviewDetails(interviewId);
  
  const oauth2Client = new google.auth.OAuth2(
    Deno.env.get('GOOGLE_CLIENT_ID'),
    Deno.env.get('GOOGLE_CLIENT_SECRET'),
    Deno.env.get('GOOGLE_REDIRECT_URI')
  );

  // Set credentials from the interviewer's stored tokens
  const { data: tokens } = await supabase
    .from('user_oauth_tokens')
    .select('access_token, refresh_token')
    .eq('user_id', interview.interviewer_id)
    .single();

  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Create calendar event
  const event = {
    summary: `Interview with ${interview.candidate.first_name} ${interview.candidate.last_name}`,
    description: `Technical interview for ${interview.candidate.position_applied} position`,
    start: {
      dateTime: interview.start_time,
      timeZone: 'UTC',
    },
    end: {
      dateTime: interview.end_time,
      timeZone: 'UTC',
    },
    attendees: [
      { email: interview.candidate.email },
      { email: interview.interviewer.email },
    ],
    conferenceData: {
      createRequest: {
        requestId: interview.id,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
    conferenceDataVersion: 1,
  });

  // Update interview with calendar event details
  await supabase
    .from('interviews')
    .update({
      calendar_event_id: response.data.id,
      meeting_link: response.data.hangoutLink,
      status: 'scheduled',
    })
    .eq('id', interviewId);

  // Send email notifications
  await sendInterviewNotifications(interview, 'scheduled');

  return new Response(
    JSON.stringify({ success: true, eventId: response.data.id }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function updateInterview(interviewId: string) {
  const interview = await getInterviewDetails(interviewId);
  
  const oauth2Client = new google.auth.OAuth2(
    Deno.env.get('GOOGLE_CLIENT_ID'),
    Deno.env.get('GOOGLE_CLIENT_SECRET'),
    Deno.env.get('GOOGLE_REDIRECT_URI')
  );

  // Update calendar event
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  const event = {
    summary: `Interview with ${interview.candidate.first_name} ${interview.candidate.last_name}`,
    start: {
      dateTime: interview.start_time,
      timeZone: 'UTC',
    },
    end: {
      dateTime: interview.end_time,
      timeZone: 'UTC',
    },
  };

  await calendar.events.update({
    calendarId: 'primary',
    eventId: interview.calendar_event_id,
    requestBody: event,
  });

  // Send update notifications
  await sendInterviewNotifications(interview, 'updated');

  return new Response(
    JSON.stringify({ success: true }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function cancelInterview(interviewId: string) {
  const interview = await getInterviewDetails(interviewId);
  
  const oauth2Client = new google.auth.OAuth2(
    Deno.env.get('GOOGLE_CLIENT_ID'),
    Deno.env.get('GOOGLE_CLIENT_SECRET'),
    Deno.env.get('GOOGLE_REDIRECT_URI')
  );

  // Delete calendar event
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  await calendar.events.delete({
    calendarId: 'primary',
    eventId: interview.calendar_event_id,
  });

  // Update interview status
  await supabase
    .from('interviews')
    .update({
      status: 'cancelled',
      calendar_event_id: null,
      meeting_link: null,
    })
    .eq('id', interviewId);

  // Send cancellation notifications
  await sendInterviewNotifications(interview, 'cancelled');

  return new Response(
    JSON.stringify({ success: true }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

async function sendInterviewNotifications(interview: any, action: 'scheduled' | 'updated' | 'cancelled') {
  const senderEmail = Deno.env.get('SENDGRID_FROM_EMAIL');
  if (!senderEmail) {
    throw new Error('SENDGRID_FROM_EMAIL is required');
  }

  const templates = {
    scheduled: {
      subject: 'Interview Scheduled',
      body: `Your interview has been scheduled for ${new Date(interview.start_time).toLocaleString()}.\n\nMeeting link: ${interview.meeting_link}`,
    },
    updated: {
      subject: 'Interview Updated',
      body: `Your interview has been rescheduled to ${new Date(interview.start_time).toLocaleString()}.\n\nMeeting link: ${interview.meeting_link}`,
    },
    cancelled: {
      subject: 'Interview Cancelled',
      body: `Your interview scheduled for ${new Date(interview.start_time).toLocaleString()} has been cancelled.`,
    },
  };

  const template = templates[action];

  // Send to candidate
  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email: interview.candidate.email }],
      }],
      from: { email: senderEmail },
      subject: template.subject,
      content: [{ type: 'text/plain', value: template.body }],
    }),
  });

  // Send to interviewer
  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email: interview.interviewer.email }],
      }],
      from: { email: senderEmail },
      subject: template.subject,
      content: [{ type: 'text/plain', value: template.body }],
    }),
  });
}
