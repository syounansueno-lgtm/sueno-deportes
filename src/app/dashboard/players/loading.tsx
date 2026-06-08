export default function Loading() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-32 mb-2" />
      <div className="h-4 bg-gray-100 rounded w-20 mb-6" />
      <div className="h-10 bg-gray-100 rounded-xl mb-4" />
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-gray-100">
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-24 mb-1.5" />
              <div className="h-3 bg-gray-100 rounded w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
