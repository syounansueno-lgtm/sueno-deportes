export default function Loading() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-48 mb-2" />
      <div className="h-4 bg-gray-100 rounded w-32 mb-6" />
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 h-20" />
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-4 h-32" />
    </div>
  )
}
