export default function Loading() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto animate-pulse">
      <div className="h-4 bg-gray-100 rounded w-28 mb-5" />
      <div className="bg-green-200 rounded-2xl p-5 mb-5 h-24" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-200 mb-4 p-5">
          <div className="h-5 bg-gray-200 rounded w-32 mb-4" />
          <div className="h-16 bg-gray-100 rounded-xl" />
        </div>
      ))}
    </div>
  )
}
