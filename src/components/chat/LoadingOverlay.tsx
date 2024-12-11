import { Loader2 } from 'lucide-react';

export const LoadingOverlay = () => (
  <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
    <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
  </div>
);
