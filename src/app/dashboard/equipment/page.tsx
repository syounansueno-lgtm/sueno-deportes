import { Package } from 'lucide-react'

export default function EquipmentPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Package size={28} className="text-green-600" />
        <h1 className="text-2xl font-bold text-gray-900">忘れ物・備品管理</h1>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <Package size={48} className="text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 font-medium">近日実装予定</p>
        <p className="text-sm text-gray-400 mt-1">忘れ物・備品の登録・管理機能</p>
      </div>
    </div>
  )
}
