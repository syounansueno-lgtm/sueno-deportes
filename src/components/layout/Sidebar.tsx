'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Megaphone, Clock, Users, ShoppingBag, Library,
  Package, Phone, Calendar, LogOut, ChevronRight,
  Shield, Home
} from 'lucide-react'
import type { Profile } from '@/types'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number }>
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'ホーム', icon: Home },
  { href: '/dashboard/announcements', label: '重要告知', icon: Megaphone },
  { href: '/dashboard/attendance', label: '勤怠・日報', icon: Clock },
  { href: '/dashboard/members', label: '会員管理', icon: Users },
  { href: '/dashboard/schedule', label: '予定・カレンダー', icon: Calendar },
  { href: '/dashboard/merchandise', label: '物販・注文', icon: ShoppingBag },
  { href: '/dashboard/library', label: '共有ライブラリ', icon: Library },
  { href: '/dashboard/equipment', label: '忘れ物・備品', icon: Package },
  { href: '/dashboard/emergency', label: '緊急連絡', icon: Phone, adminOnly: true },
]

type Props = {
  profile: Profile | null
  unreadCount?: number
}

export default function Sidebar({ profile, unreadCount = 0 }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col min-h-screen">
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-lg flex-shrink-0 font-bold">
            V
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm">ヴェルディ相模原</p>
            <p className="text-gray-400 text-xs">スタッフ管理システム</p>
          </div>
        </div>
      </div>

      {/* プロフィール */}
      {profile && (
        <div className="px-4 py-3 border-b border-gray-700 bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
              {profile.full_name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{profile.full_name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                {profile.role === 'admin' && (
                  <Shield size={10} className="text-yellow-400" />
                )}
                <p className="text-xs text-gray-400">
                  {profile.role === 'admin' ? '管理者' :
                   profile.role === 'staff' ? 'スタッフ' :
                   profile.role === 'player' ? '選手' : '会員'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ナビゲーション */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV_ITEMS.filter(item => !item.adminOnly || isAdmin).map(({ href, label, icon: Icon, adminOnly }) => {
          const active = pathname.startsWith(href)
          const isAnnouncements = href === '/dashboard/announcements'
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-green-600 text-white font-medium'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {isAnnouncements && unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
              {adminOnly && (
                <Shield size={12} className="text-yellow-400 opacity-70" />
              )}
              {active && !isAnnouncements && <ChevronRight size={14} />}
            </Link>
          )
        })}
      </nav>

      {/* フッター */}
      <div className="p-3 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-red-900 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          <span>ログアウト</span>
        </button>
      </div>
    </aside>
  )
}
