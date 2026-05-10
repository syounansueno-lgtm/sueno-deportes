import { createClient } from '@/lib/supabase/server'
import AnnouncementsClient from './AnnouncementsClient'

export default async function AnnouncementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // データはクライアント側で取得するため、userId と isAdmin のみ渡す
  return (
    <AnnouncementsClient
      isAdmin={profile?.role === 'admin'}
      userId={user.id}
    />
  )
}
