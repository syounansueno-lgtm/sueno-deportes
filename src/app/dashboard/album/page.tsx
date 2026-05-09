'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, X, ZoomIn } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Photo, Match } from '@/types'
import { SPORT_LABELS, SPORT_COLORS } from '@/types'

export default function AlbumPage() {
  const [photos, setPhotos] = useState<(Photo & { match?: Match })[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedMatch, setSelectedMatch] = useState<string>('all')
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [matchId, setMatchId] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)

      const [photosRes, matchesRes] = await Promise.all([
        supabase.from('photos').select('*, match:matches(*)').order('created_at', { ascending: false }),
        supabase.from('matches').select('*').order('match_date', { ascending: false }),
      ])
      setPhotos(photosRes.data ?? [])
      setMatches(matchesRes.data ?? [])
    }
    load()
  }, [])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${userId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(path, file)

    if (uploadError) {
      alert('アップロードに失敗しました')
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)

    const { data } = await supabase.from('photos').insert({
      url: publicUrl,
      caption: caption || null,
      match_id: matchId || null,
      uploaded_by: userId,
      taken_at: new Date().toISOString(),
    }).select('*, match:matches(*)').single()

    if (data) setPhotos(prev => [data, ...prev])
    setCaption('')
    setMatchId('')
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const filtered = selectedMatch === 'all'
    ? photos
    : selectedMatch === 'none'
    ? photos.filter(p => !p.match_id)
    : photos.filter(p => p.match_id === selectedMatch)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">写真アルバム</h1>

      {/* アップロードエリア */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">写真を追加する</p>
          <div className="flex flex-wrap gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
            <input
              type="text"
              placeholder="キャプション（任意）"
              className="border rounded-md px-3 py-2 text-sm flex-1 min-w-40"
              value={caption}
              onChange={e => setCaption(e.target.value)}
            />
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={matchId}
              onChange={e => setMatchId(e.target.value)}
            >
              <option value="">試合を選択（任意）</option>
              {matches.map(m => (
                <option key={m.id} value={m.id}>
                  {format(new Date(m.match_date), 'M/d', { locale: ja })} vs {m.opponent}（{SPORT_LABELS[m.sport].split('（')[0]}）
                </option>
              ))}
            </select>
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="bg-green-700 hover:bg-green-800"
            >
              <Upload size={16} className="mr-2" />
              {uploading ? 'アップロード中...' : '写真を選択'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* フィルター */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setSelectedMatch('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selectedMatch === 'all' ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          すべて ({photos.length})
        </button>
        {matches.slice(0, 8).map(m => (
          <button
            key={m.id}
            onClick={() => setSelectedMatch(m.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedMatch === m.id ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {format(new Date(m.match_date), 'M/d', { locale: ja })} vs {m.opponent}
          </button>
        ))}
      </div>

      {/* フォトグリッド */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>写真はまだありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(photo => (
            <div
              key={photo.id}
              className="relative group cursor-pointer aspect-square bg-gray-100 rounded-lg overflow-hidden"
              onClick={() => setPreview(photo.url)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.caption ?? ''}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <ZoomIn size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {photo.match && (
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                  <p className="text-white text-xs truncate">
                    vs {(photo.match as Match).opponent}
                  </p>
                </div>
              )}
              {photo.caption && !photo.match && (
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                  <p className="text-white text-xs truncate">{photo.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 拡大モーダル */}
      {preview && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setPreview(null)}
          >
            <X size={32} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
