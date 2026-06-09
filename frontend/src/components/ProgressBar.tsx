interface ProgressBarProps {
  value: number; // 0-100
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

function getColorClass(value: number): string {
  if (value >= 85) return 'bg-success';
  if (value >= 60) return 'bg-warning';
  return 'bg-danger';
}

export function ProgressBar({
  value,
  size = 'md',
  showLabel = false,
  className = '',
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const heightClass = size === 'sm' ? 'h-1.5' : 'h-2.5';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex-1 ${heightClass} bg-neutral-light rounded-full overflow-hidden`}>
        <div
          className={`${heightClass} rounded-full transition-all duration-500 ease-out ${getColorClass(clamped)}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-text-secondary min-w-[36px] text-right">
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
