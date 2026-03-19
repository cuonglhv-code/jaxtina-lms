import { Skeleton } from '@/components/ui/Skeleton'

export default function CoursesLoading() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        {/* thead */}
        <div className="bg-gray-50 flex gap-4 px-5 py-3">
          {[160, 80, 80, 60, 80].map((w, i) => (
            <Skeleton key={i} className={`h-3 w-${w === 160 ? '40' : w === 80 ? '20' : w === 60 ? '16' : '20'}`} />
          ))}
        </div>
        {/* rows */}
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-t border-gray-50">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-8" />
            <div className="flex gap-1">
              <Skeleton className="w-7 h-7 rounded-md" />
              <Skeleton className="w-7 h-7 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
