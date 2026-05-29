export default function DashboardLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header Skeleton */}
      <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-3xl p-6 sm:p-8 lg:p-10">
        <div className="space-y-4">
          <div className="h-5 w-32 bg-white/20 rounded-full animate-pulse" />
          <div className="h-8 w-72 bg-white/20 rounded-xl animate-pulse" />
          <div className="h-4 w-96 bg-white/10 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-xl animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-8 w-20 bg-slate-100 rounded-lg animate-pulse" />
                <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 bg-slate-100 rounded-xl animate-pulse" />
          <div className="space-y-2">
            <div className="h-5 w-40 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-3 w-56 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[300px] bg-slate-50 rounded-2xl animate-pulse" />
          <div className="h-[300px] bg-slate-50 rounded-2xl animate-pulse" />
        </div>
      </div>

      {/* Bottom section Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex justify-between mb-6">
            <div className="h-5 w-40 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-slate-50/80 rounded-2xl">
                <div className="w-11 h-11 bg-slate-100 rounded-xl animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6">
              <div className="h-5 w-32 bg-slate-100 rounded-lg mb-4 animate-pulse" />
              <div className="space-y-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-14 bg-slate-50/80 rounded-xl animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
