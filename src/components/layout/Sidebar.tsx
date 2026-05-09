'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Calendar, Bell, Image, BookOpen, Users, BarChart3,
  User, LogOut, Home, ChevronRight
} from 'lucide-react'
import type { Profile } from '@/types'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'ホーム', icon: Home },
  { href: '/dashboard/schedule', label: '予定・出欠', icon: Calendar },
  { href: '/dashboard/announcements', label: 'お知らせ', icon: Bell },
  { href: '/dashboard/album', label: '写真アルバム', icon: Image },
  { href: '/dashboard/diary', label: '活動日記', icon: BookOpen },
]

const ADMIN_ITEMS = [
  { href: '/dashboard/members', label: '会員管理', icon: Users },
  { href: '/dashboard/finance', label: '経理・会費', icon: BarChart3 },
]

type Props = {
  profile: Profile | null
}

export default function Sidebar({ profile }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isAdmin = profile?.role === 'admin' || profile?.role === 'staff'

  return (
    <aside className="w-64 bg-green-900 text-white flex flex-col min-h-screen">
      {/* ヘッダー */}
      <div className="p-5 border-b border-green-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-lg flex-shrink-0">
            ⚽
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">スエニョデポルテス</p>
            <p className="text-green-300 text-xs truncate">会員専用</p>
          </div>
        </div>
      </div>

      {/* プロフィール */}
      {profile && (
        <div className="p-4 border-b border-green-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
              {profile.full_name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{profile.full_name}</p>
              <p className="text-green-400 text-xs">{
                profile.role === 'admin' ? '管理者' :
                profile.role === 'staff' ? 'スタッフ' :
                profile.role === 'player' ? '選手' :
                profile.role === 'parent' ? '保護者' : '会員'
              }</p>
            </div>
          </div>
        </div>
      )}

      {/* ナビゲーション */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-green-700 text-white font-medium'
                  : 'text-green-200 hover:bg-green-800 hover:text-white'
              }`}
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={14} />}
            </Link>
          )
        })}

        {/* 管理者メニュー */}
        {isAdmin && (
          <>
            <div className="pt-3 pb-1 px-3">
              <p className="text-green-500 text-xs font-medium uppercase tracking-wider">管理者</p>
            </div>
            {ADMIN_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    active
                      ? 'bg-green-700 text-white font-medium'
                      : 'text-green-200 hover:bg-green-800 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  <span className="flex-1">{label}</span>
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* フッター */}
      <div className="p-3 border-t border-green-800 space-y-1">
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-green-200 hover:bg-green-800 hover:text-white transition-colors"
        >
          <User size={18} />
          <span>プロフィール</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-green-200 hover:bg-red-800 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          <span>ログアウト</span>
        </button>
      </div>
    </aside>
  )
}
