import { memo } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullscreen?: boolean;
  inline?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

export const LoadingSpinner = memo(function LoadingSpinner({
  size = 'lg',
  fullscreen = false,
  inline = false,
  className = '',
}: LoadingSpinnerProps) {
  const color = fullscreen ? 'text-accent-400' : inline ? 'text-accent-400' : 'text-accent-400';
  const spinner = <Loader2 className={`animate-spin ${sizeMap[size]} ${color} ${className}`} />;

  if (fullscreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-bg">
        {spinner}
      </div>
    );
  }

  if (inline) {
    return <span className="inline-flex">{spinner}</span>;
  }

  return (
    <div className="flex justify-center items-center py-12">
      {spinner}
    </div>
  );
});
