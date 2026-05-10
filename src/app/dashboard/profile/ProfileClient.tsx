'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, Camera, Eye, EyeOff, User } from 'lucide-react'
import { SPORT_LABELS, type Sport, type Profile } from '@/types'

const SPORTS: Sport[] = ['soccer', 'karate', 'pickleball', 'gymnastics']

type Props = {
  profile: Profile
  email: string
}

export default function ProfileClient({ profile, email }: Props) {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    full_name: profile.full_name ?? '',
    phone: profile.phone ?? '',
    sports: profile.sports ?? [] as Sport[],
    jersey_number: profile.jersey_number ?? '',
    position: profile.position ?? '',
    birth_date: profile.birth_date ?? '',
  })
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')
  const [avatarUploading, setAvatarUploading] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // パスワード変更
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState('')

  function toggleSport(sport: Sport) {
    setForm(prev => ({
      ...prev,
      sports: prev.sports.includes(sport)
        ? prev.sports.filter(s => s !== sport)
        : [...prev.sports, sport],
    }))
    setSaved(false)
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setError('画像は2MB以下にしてください')
      return
    }

    setAvatarUploading(true)
    setError('')

    const ext = file.name.split('.').pop()
    const path = `avatars/${profile.id}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError('画像のアップロードに失敗しました')
      setAvatarUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(path)

    const urlWithCache = `${publicUrl}?t=${Date.now()}`
    setAvatarUrl(urlWithCache)

    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id)
    setAvatarUploading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)

    if (!form.full_name.trim()) {
      setError('お名前を入力してください')
      setSaving(false)
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        sports: form.sports,
        jersey_number: form.jersey_number.trim() || null,
        position: form.position.trim() || null,
        birth_date: form.birth_date || null,
      })
      .eq('id', profile.id)

    if (updateError) {
      setError('保存に失敗しました。もう一度お試しください。')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    setPwSaved(false)

    if (pwForm.next.length < 8) {
      setPwError('新しいパスワードは8文字以上で入力してください')
      return
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError('新しいパスワードが一致しません')
      return
    }

    setPwSaving(true)

    // 現在のパスワードで再認証
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: pwForm.current,
    })

    if (signInError) {
      setPwError('現在のパスワードが正しくありません')
      setPwSaving(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: pwForm.next })

    if (updateError) {
      setPwError('パスワードの変更に失敗しました')
    } else {
      setPwSaved(true)
      setPwForm({ current: '', next: '', confirm: '' })
      setTimeout(() => setPwSaved(false), 3000)
    }
    setPwSaving(false)
  }

  const roleLabel: Record<string, string> = {
    admin: '管理者', staff: 'スタッフ', player: '選手', parent: '保護者', member: '会員',
  }
  const statusLabel: Record<string, string> = {
    active: '有効', inactive: '無効', pending: '審査中',
  }
  const statusColor: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-500',
    pending: 'bg-yellow-100 text-yellow-700',
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">プロフィール編集</h1>

      {/* アバター */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-3xl font-bold text-green-700 overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="アバター" className="w-full h-full object-cover" />
              ) : (
                <User size={36} className="text-green-400" />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700 transition-colors shadow"
              aria-label="写真を変更"
            >
              <Camera size={13} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <p className="font-bold text-gray-800 text-lg">{profile.full_name}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                {roleLabel[profile.role] ?? profile.role}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColor[profile.membership_status] ?? ''}`}>
                {statusLabel[profile.membership_status] ?? ''}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{email}</p>
            {avatarUploading && (
              <p className="text-xs text-green-600 mt-1">アップロード中...</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">JPG・PNG・WebP、2MB以下</p>
          </div>
        </div>
      </div>

      {/* 基本情報フォーム */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200 p-6 mb-4 space-y-4">
        <h2 className="font-bold text-gray-800 mb-2">基本情報</h2>

        <div className="space-y-2">
          <Label htmlFor="full_name">
            お名前 <span className="text-red-500 text-xs">*</span>
          </Label>
          <Input
            id="full_name"
            value={form.full_name}
            onChange={e => { setForm(p => ({ ...p, full_name: e.target.value })); setSaved(false) }}
            placeholder="山田 太郎"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">電話番号</Label>
          <Input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={e => { setForm(p => ({ ...p, phone: e.target.value })); setSaved(false) }}
            placeholder="090-1234-5678"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="birth_date">生年月日</Label>
          <Input
            id="birth_date"
            type="date"
            value={form.birth_date}
            onChange={e => { setForm(p => ({ ...p, birth_date: e.target.value })); setSaved(false) }}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="jersey_number">背番号</Label>
            <Input
              id="jersey_number"
              value={form.jersey_number}
              onChange={e => { setForm(p => ({ ...p, jersey_number: e.target.value })); setSaved(false) }}
              placeholder="10"
              maxLength={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">ポジション</Label>
            <Input
              id="position"
              value={form.position}
              onChange={e => { setForm(p => ({ ...p, position: e.target.value })); setSaved(false) }}
              placeholder="MF"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>参加する競技</Label>
          <div className="grid grid-cols-2 gap-2">
            {SPORTS.map(sport => (
              <button
                key={sport}
                type="button"
                onClick={() => toggleSport(sport)}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors text-left ${
                  form.sports.includes(sport)
                    ? 'border-green-600 bg-green-50 text-green-800'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                {form.sports.includes(sport) ? '✓ ' : ''}{SPORT_LABELS[sport].split('（')[0]}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>
        )}

        <Button
          type="submit"
          className="w-full bg-green-700 hover:bg-green-800"
          disabled={saving}
        >
          {saved ? (
            <span className="flex items-center justify-center gap-2">
              <CheckCircle2 size={16} /> 保存しました
            </span>
          ) : saving ? '保存中...' : '変更を保存する'}
        </Button>
      </form>

      {/* パスワード変更フォーム */}
      <form onSubmit={handlePasswordChange} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-bold text-gray-800 mb-2">パスワード変更</h2>

        {(['current', 'next', 'confirm'] as const).map((key) => {
          const labels = { current: '現在のパスワード', next: '新しいパスワード', confirm: '新しいパスワード（確認）' }
          const placeholders = { current: '現在のパスワード', next: '8文字以上', confirm: 'パスワードを再入力' }
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={`pw-${key}`}>{labels[key]}</Label>
              <div className="relative">
                <Input
                  id={`pw-${key}`}
                  type={showPw[key] ? 'text' : 'password'}
                  value={pwForm[key]}
                  onChange={e => { setPwForm(p => ({ ...p, [key]: e.target.value })); setPwSaved(false) }}
                  placeholder={placeholders[key]}
                  className="pr-10"
                  autoComplete={key === 'current' ? 'current-password' : 'new-password'}
                  minLength={key !== 'current' ? 8 : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => ({ ...p, [key]: !p[key] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPw[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )
        })}

        {pwError && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{pwError}</p>
        )}

        <Button
          type="submit"
          variant="outline"
          className="w-full border-green-700 text-green-700 hover:bg-green-50"
          disabled={pwSaving || !pwForm.current || !pwForm.next || !pwForm.confirm}
        >
          {pwSaved ? (
            <span className="flex items-center justify-center gap-2">
              <CheckCircle2 size={16} /> パスワードを変更しました
            </span>
          ) : pwSaving ? '変更中...' : 'パスワードを変更する'}
        </Button>
      </form>
    </div>
  )
}
