import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PlayersClient from './PlayersClient'

export default async function PlayersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileRes, playersRes] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('players').select('*').eq('active', true).order('number', { ascending: true, nullsFirst: false }).order('name'),
  ])

  const isAdmin = ['admin', 'staff'].includes(profileRes.data?.role ?? '')
  const players = playersRes.data ?? []

  return <PlayersClient initialPlayers={players} isAdmin={isAdmin} />
}
