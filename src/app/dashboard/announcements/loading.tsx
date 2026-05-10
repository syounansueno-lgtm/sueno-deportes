export default function AnnouncementsLoading() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-8 bg-gray-200 rounded-lg w-36 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-52" />
        </div>
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border-2 border-gray-200 p-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-gray-200 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
