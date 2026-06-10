import type { AnnouncementBarSettings } from '@/lib/types';

export function AnnouncementBar({ data }: { data: AnnouncementBarSettings }) {
  if (!data?.active) return null;
  const messages = (data.messages || []).filter((m) => m.active && m.text);
  if (messages.length === 0) return null;

  const loop = [...messages, ...messages, ...messages];

  return (
    <div className="gradient-navy relative overflow-hidden text-cream">
      <div className="marquee-track py-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
        {loop.map((m, i) => (
          <span key={i} className="mx-5 inline-flex items-center gap-2.5">
            <span className="text-celeste">✦</span>
            {m.text}
          </span>
        ))}
      </div>
    </div>
  );
}
