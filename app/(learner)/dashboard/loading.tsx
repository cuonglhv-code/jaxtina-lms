import { Skeleton } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-100 p-5 space-y-2">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Section label */}
      <Skeleton className="h-3 w-24 mt-6" />

      {/* Course cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-100 p-5 space-y-3">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-1.5 w-full rounded-full" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-7 w-full rounded-md" />
          </div>
        ))}
      </div>

      {/* Section label */}
      <Skeleton className="h-3 w-28 mt-6" />

      {/* Activity list */}
      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden divide-y divide-gray-50">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3 px-4">
            <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
