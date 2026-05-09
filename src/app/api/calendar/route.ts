import { NextResponse } from 'next/server'

const CALENDAR_ID = 'd21fb6677e816e22c5aeba620925f5e6edfffdcb5aaa5f99985467c3f2a9250e@group.calendar.google.com'
const ICS_URL = `https://calendar.google.com/calendar/ical/${encodeURIComponent(CALENDAR_ID)}/public/basic.ics`

function parseICS(text: string) {
  const events: {
    id: string
    title: string
    start_at: string
    end_at: string
    location: string | null
    description: string | null
    source: string
  }[] = []

  // 行継続（スペース/タブで始まる行を前の行に結合）
  const unfolded = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '')
  const lines = unfolded.split(/\r?\n/)

  let inEvent = false
  let current: Record<string, string> = {}

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true
      current = {}
    } else if (line === 'END:VEVENT') {
      inEvent = false
      if (current.DTSTART && current.SUMMARY) {
        const start = parseDate(current.DTSTART)
        const end = current.DTEND ? parseDate(current.DTEND) : new Date(start.getTime() + 3600000)
        events.push({
          id: current.UID ?? String(Math.random()),
          title: unescape(current.SUMMARY ?? ''),
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          location: current.LOCATION ? unescape(current.LOCATION) : null,
          description: current.DESCRIPTION ? unescape(current.DESCRIPTION) : null,
          source: 'google',
        })
      }
    } else if (inEvent) {
      const colonIdx = line.indexOf(':')
      if (colonIdx > 0) {
        const key = line.substring(0, colonIdx).split(';')[0]
        const value = line.substring(colonIdx + 1)
        current[key] = value
      }
    }
  }

  return events
}

function parseDate(str: string): Date {
  // DATE形式: 20260510
  if (/^\d{8}$/.test(str)) {
    const y = parseInt(str.slice(0, 4))
    const m = parseInt(str.slice(4, 6)) - 1
    const d = parseInt(str.slice(6, 8))
    return new Date(y, m, d)
  }
  // DATETIME形式: 20260510T180000Z or 20260510T180000
  if (/^\d{8}T\d{6}/.test(str)) {
    const y = parseInt(str.slice(0, 4))
    const m = parseInt(str.slice(4, 6)) - 1
    const d = parseInt(str.slice(6, 8))
    const h = parseInt(str.slice(9, 11))
    const min = parseInt(str.slice(11, 13))
    const s = parseInt(str.slice(13, 15))
    if (str.endsWith('Z')) return new Date(Date.UTC(y, m, d, h, min, s))
    return new Date(y, m, d, h, min, s)
  }
  return new Date(str)
}

function unescape(str: string): string {
  return str.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\')
}

export async function GET() {
  try {
    const res = await fetch(ICS_URL, { next: { revalidate: 3600 } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const events = parseICS(text)
      .filter(e => new Date(e.start_at) >= today)
      .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
      .slice(0, 50)

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Calendar fetch error:', error)
    return NextResponse.json({ events: [], error: String(error) })
  }
}
