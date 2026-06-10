import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'horizontal' | 'stacked' | 'iso';
  theme?: 'dark' | 'light';
  className?: string;
}

/**
 * Logo de Casaca de Cancha: isotipo de tres franjas inclinadas
 * (dos blancas y una celeste sobre fondo azul marino).
 */
export function Logo({
  variant = 'horizontal',
  theme = 'dark',
  className,
}: LogoProps) {
  const textColor = theme === 'dark' ? 'text-cream' : 'text-navy';

  return (
    <div
      className={cn('flex items-center gap-2.5', className)}
      aria-label="Casaca de Cancha"
    >
      <Isotipo theme={theme} />
      {variant !== 'iso' && (
        <div
          className={cn(
            'leading-none',
            variant === 'stacked' ? 'flex flex-col' : 'flex flex-col',
            textColor,
          )}
        >
          <span className="font-display text-base font-extrabold uppercase tracking-tight">
            Casaca de Cancha
          </span>
          <span
            className={cn(
              'text-[10px] font-semibold uppercase tracking-[0.2em]',
              theme === 'dark' ? 'text-celeste' : 'text-navy/60',
            )}
          >
            Vestí fútbol
          </span>
        </div>
      )}
    </div>
  );
}

export function Isotipo({
  theme = 'dark',
  size = 40,
}: {
  theme?: 'dark' | 'light';
  size?: number;
}) {
  const bg = theme === 'dark' ? '#0B1F3A' : '#F6F1E8';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 rounded-[22%]"
      role="img"
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="10" fill={bg} />
      {/* Tres franjas inclinadas: dos cream y la tercera celeste (idéntico al logo) */}
      <polygon points="6,31 12,31 20,9 14,9" fill="#F6F1E8" />
      <polygon points="14,31 20,31 28,9 22,9" fill="#F6F1E8" />
      <polygon points="22,31 28,31 36,9 30,9" fill="#8CC8E8" />
    </svg>
  );
}
