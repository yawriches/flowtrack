'use client'

import { Calendar } from 'lucide-react'

interface DateRangeFilterProps {
  startDate: string
  endDate: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  onReset: () => void
}

export default function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onReset,
}: DateRangeFilterProps) {
  const hasFilter = startDate || endDate

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3 mb-3">
        <Calendar size={16} className="text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Date Range</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        {hasFilter && (
          <div className="flex items-end">
            <button
              onClick={onReset}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
