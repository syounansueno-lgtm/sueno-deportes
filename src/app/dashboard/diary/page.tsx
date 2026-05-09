import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ExternalLink } from 'lucide-react'
import type { WordPressPost } from '@/types'

async function getWordPressPosts(): Promise<WordPressPost[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/wp/v2/posts?per_page=20&_embed`,
      { next: { revalidate: 300 } } // 5分キャッシュ
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim()
}

export default async function DiaryPage() {
  const posts = await getWordPressPosts()

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">活動日記</h1>
        <a
          href={process.env.NEXT_PUBLIC_WORDPRESS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-green-700 hover:underline"
        >
          公式HP <ExternalLink size={14} />
        </a>
      </div>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-400">
            記事の読み込みに失敗しました
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map(post => {
            const thumbnail = post._embedded?.['wp:featuredmedia']?.[0]?.source_url
            const excerpt = stripHtml(post.excerpt.rendered).slice(0, 120)

            return (
              <a
                key={post.id}
                href={post.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <Card className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex">
                    {thumbnail && (
                      <div className="w-28 h-24 flex-shrink-0 bg-gray-100 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={thumbnail}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    )}
                    <div className="flex-1 p-4">
                      <p className="text-xs text-gray-400 mb-1">
                        {format(new Date(post.date), 'yyyy年M月d日', { locale: ja })}
                      </p>
                      <h2 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-green-700 transition-colors">
                        {stripHtml(post.title.rendered)}
                      </h2>
                      {excerpt && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{excerpt}...</p>
                      )}
                    </div>
                  </div>
                </Card>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
