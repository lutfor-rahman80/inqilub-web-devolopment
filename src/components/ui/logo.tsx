/** Organization logo (official colour logo, transparent background). */
export function Logo({ size = 48, className = "", alt = "ইনকিলাব যুব সংগঠনের লোগো" }: { size?: number; className?: string; alt?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={size <= 64 ? "/brand/logo-192.png" : "/brand/logo.png"}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
    />
  );
}
