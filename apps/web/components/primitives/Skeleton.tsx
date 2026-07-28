type Props = {
  className?: string;
};

export function Skeleton({ className = "h-4 w-full" }: Props) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-surface-raised motion-reduce:animate-none ${className}`}
    />
  );
}
