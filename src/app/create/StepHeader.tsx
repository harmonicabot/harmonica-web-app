import { MagicWand } from '@/components/icons';

export function StepHeader() {
  return (
    <div className="flex items-center justify-center mb-6">
      <div className="mr-4">
        <MagicWand />
      </div>
      <h1 className="text-3xl font-bold">New Session</h1>
    </div>
  );
} 