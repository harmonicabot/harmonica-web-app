import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/clientUtils';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
  spinnerSize?: string;
}

export function LoadingSpinner({
  message = 'Loading…',
  className,
  spinnerSize = 'size-5',
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center text-muted-foreground',
        className,
      )}
    >
      <Spinner className={spinnerSize} />
      <p className="text-base font-medium">{message}</p>
    </div>
  );
}
