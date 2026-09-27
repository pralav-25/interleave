/* oxlint-disable nextjs/no-img-element -- Reuse the exact local PNG from the installable app manifest. */
export function AppLogo({
  size = 28,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      className={`app-logo ${className}`.trim()}
      src="/icons/icon-512.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
    />
  );
}
