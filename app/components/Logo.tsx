type LogoMarkProps = {
  className?: string;
  variant?: "white" | "black";
};

/**
 * The actual brand stamp, cleaned up (denoised + thresholded to remove the
 * paper grain/background) but not redrawn — same artwork, just legible on
 * any surface. See public/logo-original.jpg for the source.
 *
 * Rendered white-on-dark-badge by default so it stays visible regardless of
 * the surrounding page background (same treatment as the favicon).
 */
export function LogoMark({ className = "h-8", variant = "white" }: LogoMarkProps) {
  const src = variant === "white" ? "/logo-white.png" : "/logo-black.png";

  if (variant === "black") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="EX1LES" className={className} />;
  }

  return (
    <span className={`inline-flex items-center justify-center rounded-xl bg-zinc-900 px-2 py-1.5 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="EX1LES" className="h-full w-auto object-contain" />
    </span>
  );
}

type LogoProps = {
  className?: string;
  markClassName?: string;
  textClassName?: string;
  variant?: "white" | "black";
  showText?: boolean;
};

export function Logo({
  className = "",
  markClassName = "h-7",
  textClassName = "text-sm",
  variant = "white",
  showText = true,
}: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={markClassName} variant={variant} />
      {showText && (
        <span className={`font-brand tracking-[0.35em] uppercase leading-none text-zinc-900 ${textClassName}`}>
          EX1LES
        </span>
      )}
    </span>
  );
}
