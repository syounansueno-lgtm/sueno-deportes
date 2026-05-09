export type Sport = 'soccer' | 'karate' | 'pickleball' | 'gymnastics'

export type UserRole = 'admin' | 'staff' | 'player' | 'parent' | 'member'

export type Profile = {
  id: string
  email: string
  full_name: string
  phone: string | null
  avatar_url: string | null
  role: UserRole
  sports: Sport[]
  jersey_number: string | null
  position: string | null
  birth_date: string | null
  stripe_customer_id: string | null
  membership_status: 'active' | 'inactive' | 'pending'
  created_at: string
}

export type Event = {
  id: string
  title: string
  description: string | null
  sport: Sport
  event_type: 'practice' | 'game' | 'tournament' | 'other'
  start_at: string
  end_at: string
  location: string | null
  created_by: string
  created_at: string
}

export type Attendance = {
  id: string
  event_id: string
  user_id: string
  status: 'attending' | 'absent' | 'undecided'
  comment: string | null
  responded_at: string
}

export type Announcement = {
  id: string
  title: string
  body: string
  sport: Sport | 'all'
  is_urgent: boolean
  author_id: string
  published_at: string
  created_at: string
}

export type Photo = {
  id: string
  url: string
  thumbnail_url: string | null
  caption: string | null
  match_id: string | null
  event_id: string | null
  uploaded_by: string
  taken_at: string | null
  created_at: string
}

export type Match = {
  id: string
  sport: Sport
  opponent: string
  match_date: string
  location: string | null
  score_us: number | null
  score_them: number | null
  result: 'win' | 'lose' | 'draw' | null
  notes: string | null
}

export type Payment = {
  id: string
  user_id: string
  amount: number
  fee_amount: number
  description: string
  status: 'paid' | 'pending' | 'failed' | 'refunded'
  stripe_payment_intent_id: string | null
  paid_at: string | null
  created_at: string
}

export type WordPressPost = {
  id: number
  title: { rendered: string }
  content: { rendered: string }
  excerpt: { rendered: string }
  date: string
  link: string
  featured_media: number
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string
    }>
  }
}

export const SPORT_LABELS: Record<Sport, string> = {
  soccer: 'サッカー（ヴェルディ相模原）',
  karate: '空手教室',
  pickleball: 'ピックルボール',
  gymnastics: '体操教室',
}

export const SPORT_COLORS: Record<Sport, string> = {
  soccer: 'bg-green-100 text-green-800',
  karate: 'bg-red-100 text-red-800',
  pickleball: 'bg-yellow-100 text-yellow-800',
  gymnastics: 'bg-blue-100 text-blue-800',
}
