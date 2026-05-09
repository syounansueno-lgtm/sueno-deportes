import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Announcement } from '@/types'

export default async function AnnouncementsPage() {
  const supabase = await createClient()
  const { data: announcements } = await supabase
    .from('announcements')
    .select('*')
    .order('published_at', { ascending: false })

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">お知らせ</h1>

      {!announcements || announcements.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-400">
            お知らせはありません
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {(announcements as Announcement[]).map(a => (
            <Card key={a.id} className={a.is_urgent ? 'border-red-300 bg-red-50' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  {a.is_urgent && (
                    <Badge variant="destructive" className="flex-shrink-0 mt-0.5">緊急</Badge>
                  )}
                  <div className="flex-1">
                    <CardTitle className="text-base">{a.title}</CardTitle>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(a.published_at), 'yyyy年M月d日（E）HH:mm', { locale: ja })}
                      {a.sport !== 'all' && (
                        <span className="ml-2 text-green-700 font-medium">
                          {a.sport === 'soccer' ? 'サッカー' :
                           a.sport === 'karate' ? '空手' :
                           a.sport === 'pickleball' ? 'ピックルボール' : '体操'} 向け
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{a.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
