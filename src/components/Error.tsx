export default function ErrorPage({ title, message }: {title: string, message: string}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4">
        <div className="text-red-500 mb-4 text-6xl">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-24 w-24"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          {title}
        </h1>
        <p className="text-gray-600 text-center">
          {message}
        </p>
      </div>
  )
}