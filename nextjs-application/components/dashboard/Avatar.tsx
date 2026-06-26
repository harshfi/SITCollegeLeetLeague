import { cn } from '@/lib/utils';

export function Avatar({
  src,
  name,
  className,
}: {
  src: string | null;
  name: string;
  className?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover bg-muted', className)}
      />
    );
  }
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium',
        className
      )}
    >
      {initials || '?'}
    </div>
  );
}
