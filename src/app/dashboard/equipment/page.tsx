import { createClient } from '@/lib/supabase/server'
import EquipmentClient from './EquipmentClient'

export default async function EquipmentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  const { data: items } = await supabase
    .from('equipment_items')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false })

  return (
    <EquipmentClient
      items={(items ?? []) as any}
      isAdmin={isAdmin}
      userId={user.id}
    />
  )
}
