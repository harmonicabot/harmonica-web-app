export default function SessionSkeleton() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-80 bg-gray-200 rounded animate-pulse" />
      </div>
      {/* Session summary/insights skeleton */}
      <div className="mb-8">
        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="h-24 w-full bg-gray-200 rounded animate-pulse mb-4" />
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-16 w-full bg-gray-200 rounded animate-pulse" />
      </div>
      {/* Participant responses skeleton */}
      <div className="bg-gray-200 border rounded shadow-sm">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 border-b last:border-b-0 flex items-center px-6">
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mr-4" />
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
} 