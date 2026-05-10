export default function MembersLoading() {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 bg-gray-200 rounded-lg w-36" />
        <div className="h-9 bg-gray-200 rounded-lg w-28" />
      </div>
      <div className="h-10 bg-gray-200 rounded-lg mb-4" />
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
            <div className="h-6 bg-gray-200 rounded-full w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
