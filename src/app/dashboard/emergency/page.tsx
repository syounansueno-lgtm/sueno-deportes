import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Phone, Shield } from 'lucide-react'

export default async function EmergencyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <Shield size={48} className="text-red-300 mx-auto mb-4" />
          <p className="font-bold text-red-700">管理者専用ページです</p>
        </div>
      </div>
    )
  }

  const { data: admins } = await supabase
    .from('profiles')
    .select('id, full_name, phone, email, role')
    .in('role', ['admin', 'staff'])
    .order('role')

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Phone size={28} className="text-red-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">緊急連絡先</h1>
          <p className="text-sm text-red-600">管理者専用</p>
        </div>
      </div>

      <div className="space-y-3">
        {(admins ?? []).map((a: any) => (
          <div key={a.id} className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-900">{a.full_name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    a.role === 'admin' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {a.role === 'admin' ? '管理者' : 'スタッフ'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{a.email}</p>
              </div>
              {a.phone && (
                <a
                  href={`tel:${a.phone}`}
                  className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-green-600 transition-colors"
                >
                  <Phone size={16} />
                  {a.phone}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
