import { Spinner } from '@/components/ui/spinner';

export default function LoadingSession() {
  return (
    <div className="flex flex-row items-center justify-center min-h-[60vh] gap-3 text-center text-muted-foreground">
      <Spinner/>
      <p className="text-xl font-medium">Loading session…</p>
    </div>
  );
}