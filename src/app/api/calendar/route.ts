import { NextResponse } from 'next/server'
import ical from 'node-ical'

const CALENDAR_ID = 'd21fb6677e816e22c5aeba620925f5e6edfffdcb5aaa5f99985467c3f2a9250e@group.calendar.google.com'
const ICS_URL = `https://calendar.google.com/calendar/ical/${encodeURIComponent(CALENDAR_ID)}/public/basic.ics`

export async function GET() {
  try {
    const data = await ical.async.fromURL(ICS_URL)
    const now = new Date()

    const upcoming = Object.values(data)
      .filter((e): e is ical.VEvent => !!e && e.type === 'VEVENT' && !!e.start && new Date(e.start) >= now)
      .map(e => ({
        id: String(e.uid ?? Math.random()),
        title: String(e.summary ?? '（タイトルなし）'),
        start_at: new Date(e.start).toISOString(),
        end_at: new Date(e.end ?? e.start).toISOString(),
        location: e.location ? String(e.location) : null,
        description: e.description ? String(e.description) : null,
        source: 'google',
      }))
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
      .slice(0, 50)

    return NextResponse.json({ events: upcoming })
  } catch (error) {
    console.error('Calendar fetch error:', error)
    return NextResponse.json({ events: [] })
  }
}
