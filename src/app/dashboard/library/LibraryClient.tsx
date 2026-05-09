'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { FileText, Upload, Download, Folder, Plus, X, Search, FileImage, Film, File } from 'lucide-react'

type LibraryFile = {
  id: string
  title: string
  description: string | null
  file_url: string
  file_name: string
  file_type: string | null
  category: string
  uploaded_by: string | null
  created_at: string
  profiles?: { full_name: string } | null
}

type Props = {
  files: LibraryFile[]
  isAdmin: boolean
  userId: string
}

const CATEGORIES: { key: string; label: string; emoji: string }[] = [
  { key: 'all', label: 'すべて', emoji: '📁' },
  { key: 'manual', label: 'マニュアル', emoji: '📋' },
  { key: 'practice', label: '練習メニュー', emoji: '⚽' },
  { key: 'form', label: '書類・フォーム', emoji: '📝' },
  { key: 'minutes', label: '議事録', emoji: '📄' },
  { key: 'other', label: 'その他', emoji: '📂' },
]

function fileIcon(type: string | null) {
  if (!type) return <File size={24} className="text-gray-400" />
  if (type.includes('image')) return <FileImage size={24} className="text-blue-400" />
  if (type.includes('video')) return <Film size={24} className="text-purple-400" />
  if (type.includes('pdf')) return <FileText size={24} className="text-red-400" />
  return <File size={24} className="text-gray-400" />
}

export default function LibraryClient({ files: initFiles, isAdmin, userId }: Props) {
  const supabase = createClient()
  const [files, setFiles] = useState(initFiles)
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: 'other',
  })

  const filtered = files.filter(f => {
    const matchCat = category === 'all' || f.category === category
    const matchQuery = !query || f.title.includes(query) || (f.description ?? '').includes(query)
    return matchCat && matchQuery
  })

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    const file = fileInputRef.current?.files?.[0]
    if (!file || !uploadForm.title) return

    setUploading(true)
    setUploadProgress('アップロード中...')

    const ext = file.name.split('.').pop()
    const path = `library/${Date.now()}_${file.name}`

    const { data: storageData, error: storageError } = await supabase.storage
      .from('library')
      .upload(path, file)

    if (storageError) {
      setUploadProgress('アップロード失敗: ' + storageError.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('library').getPublicUrl(path)

    const { data, error } = await supabase
      .from('library_files')
      .insert({
        title: uploadForm.title,
        description: uploadForm.description || null,
        file_url: publicUrl,
        file_name: file.name,
        file_type: file.type,
        category: uploadForm.category,
        uploaded_by: userId,
      })
      .select('*, profiles(full_name)')
      .single()

    if (!error && data) {
      setFiles(prev => [data, ...prev])
      setUploadForm({ title: '', description: '', category: 'other' })
      setShowUpload(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    setUploadProgress('')
    setUploading(false)
  }

  async function deleteFile(fileId: string, fileUrl: string) {
    if (!confirm('このファイルを削除しますか？')) return
    await supabase.from('library_files').delete().eq('id', fileId)
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">共有ライブラリ</h1>
          <p className="text-sm text-gray-500 mt-0.5">マニュアル・練習メニュー・書類を共有</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
          >
            {showUpload ? <X size={16} /> : <Upload size={16} />}
            {showUpload ? 'キャンセル' : 'アップロード'}
          </button>
        )}
      </div>

      {/* アップロードフォーム */}
      {showUpload && isAdmin && (
        <form onSubmit={handleUpload} className="bg-white rounded-xl border-2 border-green-400 p-5 mb-5">
          <h3 className="font-bold text-gray-800 mb-3">ファイルをアップロード</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">タイトル</label>
              <input
                required
                type="text"
                value={uploadForm.title}
                onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="例：練習メニュー2026年5月版"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">説明（任意）</label>
              <input
                type="text"
                value={uploadForm.description}
                onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="ファイルの内容を簡単に説明"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 block mb-1">カテゴリ</label>
                <select value={uploadForm.category} onChange={e => setUploadForm(f => ({ ...f, category: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="manual">マニュアル</option>
                  <option value="practice">練習メニュー</option>
                  <option value="form">書類・フォーム</option>
                  <option value="minutes">議事録</option>
                  <option value="other">その他</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 block mb-1">ファイル</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            {uploadProgress && <p className="text-sm text-blue-600">{uploadProgress}</p>}
            <button type="submit" disabled={uploading} className="w-full py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50">
              {uploading ? 'アップロード中...' : 'アップロード'}
            </button>
          </div>
        </form>
      )}

      {/* カテゴリタブ */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              category === cat.key
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span>{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* 検索 */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="ファイル名で検索..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* ファイル一覧 */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <Folder size={48} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">ファイルがありません</p>
          {isAdmin && <p className="text-sm text-gray-300 mt-1">アップロードボタンから追加できます</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(file => {
            const cat = CATEGORIES.find(c => c.key === file.category)
            return (
              <div key={file.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 hover:shadow-sm transition-shadow">
                <div className="flex-shrink-0">
                  {fileIcon(file.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{file.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {cat && cat.key !== 'all' && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {cat.emoji} {cat.label}
                      </span>
                    )}
                    {file.description && (
                      <span className="text-xs text-gray-400 truncate">{file.description}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(new Date(file.created_at), 'M月d日', { locale: ja })}
                    {file.profiles?.full_name && ` • ${file.profiles.full_name}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={file.file_name}
                    className="flex items-center gap-1.5 bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Download size={14} />
                    開く
                  </a>
                  {isAdmin && (
                    <button
                      onClick={() => deleteFile(file.id, file.file_url)}
                      className="text-gray-300 hover:text-red-400 p-1 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
