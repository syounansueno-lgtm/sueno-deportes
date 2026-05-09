import { createClient } from '@/lib/supabase/server'
import ScheduleClient from './ScheduleClient'

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isAdmin = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    isAdmin = profile?.role === 'admin' || profile?.role === 'staff'
  }

  return <ScheduleClient isAdmin={isAdmin} />
}
