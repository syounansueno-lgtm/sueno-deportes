import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MatchesClient from './MatchesClient'

export default async function MatchesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileRes, matchesRes] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('matches').select('*').order('match_date', { ascending: false }),
  ])

  const isAdmin = ['admin', 'staff'].includes(profileRes.data?.role ?? '')
  const matches = matchesRes.data ?? []

  // 写真枚数を並列取得
  const photoCountMap: Record<string, number> = {}
  if (matches.length > 0) {
    const photoRes = await supabase
      .from('album_photos')
      .select('related_match_id')
      .in('related_match_id', matches.map(m => m.id))
      .not('related_match_id', 'is', null)

    if (photoRes.data) {
      for (const p of photoRes.data) {
        if (p.related_match_id) {
          photoCountMap[p.related_match_id] = (photoCountMap[p.related_match_id] ?? 0) + 1
        }
      }
    }
  }

  return <MatchesClient initialMatches={matches} initialPhotoCount={photoCountMap} isAdmin={isAdmin} />
}
