import { createClient } from '@/lib/supabase/server'
import AttendanceClient from './AttendanceClient'

export default async function AttendancePage() {
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
    <AttendanceClient
      userId={user.id}
      isAdmin={profile?.role === 'admin'}
    />
  )
}
