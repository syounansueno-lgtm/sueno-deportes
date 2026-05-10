export default function AttendanceLoading() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto animate-pulse">
      <div className="h-8 bg-gray-200 rounded-lg w-40 mb-6" />
      {/* タブ */}
      <div className="flex gap-2 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-9 bg-gray-200 rounded-lg flex-1" />
        ))}
      </div>
      {/* 打刻カード */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="h-6 bg-gray-200 rounded w-32 mx-auto mb-4" />
        <div className="h-16 bg-gray-200 rounded-xl mb-4" />
        <div className="h-16 bg-gray-200 rounded-xl" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="h-14 bg-gray-200 rounded-xl" />
      </div>
    </div>
  )
}
