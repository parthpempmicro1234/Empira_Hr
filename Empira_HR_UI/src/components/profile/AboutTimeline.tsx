import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Gift, UserCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { getEmployeeTimeline, type EmployeeTimelineEvent } from '../../services/timeline';

function cx(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(' ');
}

function formatEventType(type: string) {
  return String(type || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

function EventIcon({ type }: { type: string }) {
  const isAnniv = type === 'work_anniversary';
  const isJoined = type === 'joined';
  const bg = isAnniv ? 'bg-amber-500' : isJoined ? 'bg-emerald-500' : 'bg-slate-700';
  const Icon = isAnniv ? Gift : isJoined ? UserCheck : Calendar;
  return (
    <div
      className={cx(
        'absolute -left-12 top-0 z-10 flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-slate-900',
        bg
      )}
    >
      <Icon className="h-4 w-4 text-slate-900" />
    </div>
  );
}

function TimelineEventNode({ event }: { event: EmployeeTimelineEvent }) {
  return (
    <div className="relative ml-12 mb-8">
      <EventIcon type={event.type} />
      <div className="text-sm font-medium text-slate-200">{formatEventType(event.type)}</div>
      <div className="mb-3 text-[11px] text-slate-500">{formatDate(event.date)}</div>
      <div className="inline-block rounded-md border border-slate-800 bg-slate-800/40 px-4 py-2 text-xs font-medium text-slate-300 shadow-sm">
        {event.title}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="relative">
          <div className="relative z-10 -ml-2 mb-6 inline-flex items-center rounded bg-slate-500/20 px-2 py-0.5 text-[10px] font-medium text-slate-400">
            <span className="h-3 w-10 animate-pulse rounded bg-slate-800" />
          </div>
          <div className="relative ml-12 mb-8">
            <div className="absolute -left-12 top-0 z-10 h-8 w-8 animate-pulse rounded-full bg-slate-800 ring-4 ring-slate-900" />
            <div className="h-4 w-40 animate-pulse rounded bg-slate-800" />
            <div className="mt-2 h-3 w-28 animate-pulse rounded bg-slate-800/70" />
            <div className="mt-3 h-8 w-64 animate-pulse rounded bg-slate-800/50" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AboutTimeline({ employeeId = null }: { employeeId?: number | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ['timeline', employeeId ?? 'me'],
    queryFn: () => getEmployeeTimeline(typeof employeeId === 'number' ? employeeId : undefined),
  });

  const blocks = data?.timeline ?? [];
  const isEmpty = !isLoading && (!blocks.length || blocks.every((b) => !b.events?.length));

  const normalizedBlocks = useMemo(() => {
    // Keep stable rendering order (latest year first if backend already does, we won't reorder)
    return blocks;
  }, [blocks]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,60%)_1fr]">
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-sm">
        <div className="mb-4 text-sm font-semibold text-slate-100">Timeline</div>

        <div className="relative">
          <div aria-hidden="true" className="absolute left-6 top-0 bottom-0 w-px bg-slate-700" />

          {isLoading ? (
            <LoadingSkeleton />
          ) : isEmpty ? (
            <div className="grid place-items-center rounded-lg border border-slate-800 bg-slate-950/20 p-8 text-sm text-slate-400">
              No timeline events recorded yet.
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.08 } },
              }}
            >
              {normalizedBlocks.map((y) => (
                <motion.div
                  key={y.year}
                  variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >

                  {(y.events ?? []).map((e, idx) => (
                    <TimelineEventNode key={`${y.year}-${e.type}-${e.date}-${idx}`} event={e} />
                  ))}
                  <div className="relative z-10 -ml-0 mb-6 inline-flex items-center rounded bg-slate-100/20 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                    {y.year}
                  </div>
                </motion.div>
                
              ))}
            </motion.div>
            
          )}
        </div>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900 p-5 shadow-sm">
        <div className="text-sm font-semibold text-slate-100">Quick view</div>
        <div className="mt-2 text-sm text-slate-400">
          Add promotions, role changes, and achievements for a richer timeline.
        </div>
      </section>
      
    </div>
  );
}

