export default function DashboardSkeleton() {
  return (
    <div className="p-8">
      {/* Banner skeleton */}
      <div className="h-20 w-full bg-gray-200 rounded animate-pulse mb-10" />
      {/* 'Your Sessions' heading skeleton */}
      <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-6" />
      {/* Projects row skeleton */}
      <div className="flex flex-wrap gap-4 mb-10">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="w-64 h-14 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
      {/* Table skeleton */}
      <div className="h-32 w-full bg-gray-200 rounded animate-pulse" />
    </div>
  );
} 