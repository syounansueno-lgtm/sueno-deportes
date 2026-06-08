import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TrainerClient from './TrainerClient'

export default async function TrainerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileRes, commentsRes, menusRes, questionsRes] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('trainer_comments').select('*').order('created_at', { ascending: false }),
    supabase.from('training_menus').select('*').order('created_at', { ascending: false }),
    supabase.from('trainer_questions').select('*, profiles(full_name)').order('created_at', { ascending: false }),
  ])

  const isAdmin = ['admin', 'staff'].includes(profileRes.data?.role ?? '')

  return (
    <TrainerClient
      initialComments={commentsRes.data ?? []}
      initialMenus={menusRes.data ?? []}
      initialQuestions={questionsRes.data ?? []}
      isAdmin={isAdmin}
      currentUserId={user.id}
    />
  )
}
