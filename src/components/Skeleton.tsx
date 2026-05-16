interface SkeletonProps {
  className?: string;
  variant?: 'line' | 'circle' | 'card';
  count?: number;
}

export function Skeleton({ className = '', variant = 'line', count = 1 }: SkeletonProps) {
  const baseClass = 'animate-shimmer rounded';

  const variantClass = {
    line: 'h-4 w-full',
    circle: 'h-10 w-10 rounded-full',
    card: 'h-24 w-full rounded-lg',
  };

  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${baseClass} ${variantClass[variant]} ${className}`}
        />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="animate-shimmer h-4 rounded flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 px-4 py-4 border-t border-border">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div
              key={colIdx}
              className="animate-shimmer h-4 rounded flex-1"
              style={{ maxWidth: colIdx === 0 ? '200px' : undefined }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
