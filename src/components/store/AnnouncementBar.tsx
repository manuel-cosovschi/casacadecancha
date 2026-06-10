import type { AnnouncementBarSettings } from '@/lib/types';

export function AnnouncementBar({ data }: { data: AnnouncementBarSettings }) {
  if (!data?.active) return null;
  const messages = (data.messages || []).filter((m) => m.active && m.text);
  if (messages.length === 0) return null;

  // Duplicamos para el efecto marquee continuo.
  const loop = [...messages, ...messages];

  return (
    <div className="overflow-hidden bg-navy text-cream">
      <div className="marquee-track py-2 text-xs font-semibold uppercase tracking-wide">
        {loop.map((m, i) => (
          <span key={i} className="mx-6 inline-flex items-center gap-2">
            <span className="text-celeste">●</span>
            {m.text}
          </span>
        ))}
      </div>
    </div>
  );
}
