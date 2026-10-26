import Image from "next/image";

import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";

interface LogoProps {
  /** `full`: siglas, sistema e institución. `compact`: siglas y sistema. `mark`: solo siglas. */
  variant?: "full" | "compact" | "mark";
  /** `inverse` sobre fondos de color primario. */
  tone?: "default" | "inverse";
  className?: string;
}

/**
 * Identidad institucional. Usa el logo oficial declarado en `config/brand.ts`; mientras no
 * exista, un logotipo tipográfico provisional: las siglas en la serif de los títulos dentro
 * de un marco, como un sello, junto al nombre del sistema. Nunca un icono genérico.
 */
export function Logo({ variant = "compact", tone = "default", className }: LogoProps) {
  const inverse = tone === "inverse";
  const showNames = variant !== "mark";

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-3", className)}>
      {BRAND.logo ? (
        <OfficialLogo inverse={inverse} />
      ) : (
        <span
          aria-hidden={showNames || undefined}
          className={cn(
            "inline-flex h-9 shrink-0 items-center border-2 px-1.5 font-serif text-subtitle leading-none font-semibold tracking-widest",
            inverse ? "border-on-primary text-on-primary" : "border-primary-ink text-primary-ink",
          )}
        >
          {BRAND.institutionShortName}
        </span>
      )}
      {showNames ? (
        <span className="grid min-w-0 leading-tight">
          <span
            className={cn(
              "truncate text-label font-semibold",
              inverse ? "text-on-primary" : "text-fg",
            )}
          >
            {BRAND.appName}
          </span>
          <span
            className={cn(
              "truncate text-small",
              inverse ? "text-on-primary" : "text-fg-muted",
              variant === "compact" && "sr-only",
            )}
          >
            {BRAND.institutionName}
          </span>
        </span>
      ) : (
        <span className="sr-only">
          {BRAND.institutionShortName} · {BRAND.appName}
        </span>
      )}
    </span>
  );
}

function OfficialLogo({ inverse }: { inverse: boolean }) {
  const logo = BRAND.logo;
  const onDark = BRAND.logoOnDark ?? logo;
  if (!logo || !onDark) {
    return null;
  }
  const alt = BRAND.institutionName;
  if (inverse) {
    return (
      <Image
        src={onDark.src}
        width={onDark.width}
        height={onDark.height}
        alt={alt}
        className="h-9 w-auto"
      />
    );
  }
  return (
    <>
      <Image
        src={logo.src}
        width={logo.width}
        height={logo.height}
        alt={alt}
        className="h-9 w-auto dark:hidden"
      />
      <Image
        src={onDark.src}
        width={onDark.width}
        height={onDark.height}
        alt={alt}
        className="hidden h-9 w-auto dark:block"
      />
    </>
  );
}
