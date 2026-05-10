'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Megaphone, Clock, Users, ShoppingBag, Library,
  Package, Phone, Calendar, LogOut, ChevronRight,
  Shield, Home, Menu, X, Image, BookOpen, Trophy, Banknote
} from 'lucide-react'
import type { Profile } from '@/types'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number }>
  adminOnly?: boolean
  staffOrAdminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'ホーム', icon: Home },
  { href: '/dashboard/announcements', label: '重要告知', icon: Megaphone },
  { href: '/dashboard/attendance', label: '勤怠・日報', icon: Clock },
  { href: '/dashboard/members', label: '会員管理', icon: Users },
  { href: '/dashboard/schedule', label: '予定・カレンダー', icon: Calendar },
  { href: '/dashboard/matches', label: '試合結果', icon: Trophy },
  { href: '/dashboard/merchandise', label: '物販・注文', icon: ShoppingBag },
  { href: '/dashboard/library', label: '共有ライブラリ', icon: Library },
  { href: '/dashboard/equipment', label: '忘れ物・備品', icon: Package },
  { href: '/dashboard/album', label: '写真アルバム', icon: Image },
  { href: '/dashboard/diary', label: '活動日記', icon: BookOpen },
  { href: '/dashboard/finance', label: '経理・会費', icon: Banknote, staffOrAdminOnly: true },
  { href: '/dashboard/emergency', label: '緊急連絡', icon: Phone, adminOnly: true },
]

type Props = {
  profile: Profile | null
  unreadBadge?: React.ReactNode
  /** @deprecated use unreadBadge */
  unreadCount?: number
}

export default function Sidebar({ profile, unreadBadge, unreadCount = 0 }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isAdmin = profile?.role === 'admin'
  const isStaff = profile?.role === 'staff'

  const navContent = (
    <>
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
          {/* モバイル：閉じるボタン */}
          <button
            className="ml-auto md:hidden text-gray-400 hover:text-white"
            onClick={() => setMobileOpen(false)}
            aria-label="メニューを閉じる"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* プロフィール */}
      {profile && (
        <Link href="/dashboard/profile" onClick={() => setMobileOpen(false)} className="block px-4 py-3 border-b border-gray-700 bg-gray-800 hover:bg-gray-750 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden">
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : profile.full_name.charAt(0)
              }
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
        </Link>
      )}

      {/* ナビゲーション */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV_ITEMS.filter(item => (!item.adminOnly || isAdmin) && (!item.staffOrAdminOnly || isAdmin || isStaff)).map(({ href, label, icon: Icon, adminOnly }) => {
          const active = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
          const isAnnouncements = href === '/dashboard/announcements'
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-green-600 text-white font-medium'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {isAnnouncements && (
                <Suspense fallback={null}>
                  {unreadBadge ?? (unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  ))}
                </Suspense>
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
    </>
  )

  return (
    <>
      {/* モバイル：トップバー */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-gray-900 text-white h-14 flex items-center px-4 shadow-md">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-gray-300 hover:text-white"
          aria-label="メニューを開く"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2 ml-3">
          <div className="w-7 h-7 bg-green-500 rounded flex items-center justify-center text-xs font-bold">V</div>
          <span className="text-sm font-bold">ヴェルディ相模原</span>
        </div>
        <span className="ml-auto">
          <Suspense fallback={null}>
            {unreadBadge ?? (unreadCount > 0 && (
              <Link href="/dashboard/announcements">
                <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </Link>
            ))}
          </Suspense>
        </span>
      </div>

      {/* モバイル：オーバーレイ */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* モバイル：スライドインサイドバー */}
      <aside
        className={`md:hidden fixed top-0 left-0 h-full w-72 bg-gray-900 text-white flex flex-col z-50 transform transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navContent}
      </aside>

      {/* デスクトップ：固定サイドバー */}
      <aside className="hidden md:flex w-64 bg-gray-900 text-white flex-col min-h-screen flex-shrink-0">
        {navContent}
      </aside>
    </>
  )
}
