import { createClient } from '@/lib/supabase/server'
import LibraryClient from './LibraryClient'

export default async function LibraryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  const { data: files } = await supabase
    .from('library_files')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false })

  return (
    <LibraryClient
      files={(files ?? []) as any}
      isAdmin={isAdmin}
      userId={user.id}
    />
  )
}
