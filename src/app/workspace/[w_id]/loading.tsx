export default function ProjectSkeleton() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-80 bg-gray-200 rounded animate-pulse" />
      </div>
      {/* Project summary/insights skeleton */}
      <div className="mb-8">
        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="h-24 w-full bg-gray-200 rounded animate-pulse mb-4" />
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-16 w-full bg-gray-200 rounded animate-pulse" />
      </div>
      {/* Sessions grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
} 