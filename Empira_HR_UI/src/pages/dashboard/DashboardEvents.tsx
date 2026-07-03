import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Cake, Users, UserPlus } from 'lucide-react';
import EventAvatar from './EventAvatar';
import { getDashboard, type DashboardPerson, type DashboardResponse } from '../../services/dashboard';

function cx(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(' ');
}

type TabKey = 'birthdays' | 'anniversaries' | 'joinees';

function countFor(d: DashboardResponse | undefined, tab: TabKey) {
  if (!d) return 0;
  if (tab === 'birthdays') return (d.birthdays_today?.length ?? 0) + (d.upcoming_birthdays?.length ?? 0);
  if (tab === 'anniversaries')
    return (d.anniversary_today?.length ?? 0) + (d.upcoming_anniversary?.length ?? 0);
  return (d.new_joined_today?.length ?? 0) + (d.recent_joined?.length ?? 0);
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function AvatarsRow({
  items,
  kind,
  onOpenProfile,
}: {
  items: DashboardPerson[];
  kind: React.ComponentProps<typeof EventAvatar>['kind'];
  onOpenProfile: (employeeId: number) => void;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {items.map((p) => (
        <EventAvatar
          key={`${kind}-${p.id}`}
          kind={kind}
          person={{
            id: p.id,
            display_name: p.display_name,
            profile_image: p.profile_image,
            date_of_birth: p.date_of_birth ?? null,
            date_of_joining: p.date_of_joining ?? null,
          }}
          onOpenProfile={onOpenProfile}
        />
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex w-16 flex-col items-center">
            <div className="h-12 w-12 rounded-full bg-muted/40" />
            <div className="mt-3 h-3 w-16 rounded bg-muted/30" />
            <div className="mt-2 h-3 w-10 rounded bg-muted/20" />
          </div>
        ))}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex w-16 flex-col items-center">
            <div className="h-12 w-12 rounded-full bg-muted/40" />
            <div className="mt-3 h-3 w-16 rounded bg-muted/30" />
            <div className="mt-2 h-3 w-10 rounded bg-muted/20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardEvents({ onOpenProfile }: { onOpenProfile: (employeeId: number) => void }) {
  const [tab, setTab] = React.useState<TabKey>('birthdays');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  });

  const tabs = React.useMemo(
    () => [
      { key: 'birthdays' as const, label: 'Birthdays', icon: Cake },
      { key: 'anniversaries' as const, label: 'Work Anniversaries', icon: Users },
      { key: 'joinees' as const, label: 'New joinees', icon: UserPlus },
    ],
    []
  );

  const todayItems =
    tab === 'birthdays'
      ? data?.birthdays_today ?? []
      : tab === 'anniversaries'
        ? data?.anniversary_today ?? []
        : data?.new_joined_today ?? [];

  const upcomingItems =
    tab === 'birthdays'
      ? data?.upcoming_birthdays ?? []
      : tab === 'anniversaries'
        ? data?.upcoming_anniversary ?? []
        : data?.recent_joined ?? [];

  const kind =
    tab === 'birthdays' ? ('birthday' as const) : tab === 'anniversaries' ? ('anniversary' as const) : ('new-joiner' as const);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">Celebration</div>
        </div>
        <Cake className="h-6 w-6 text-muted-foreground" />
      </div>

      <div className="mt-4 flex gap-5 border-b border-border/70">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cx(
                'relative pb-3 text-sm font-semibold',
                active ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {countFor(data, t.key)} {t.label}
              <span
                aria-hidden="true"
                className={cx(
                  'absolute inset-x-0 -bottom-px h-0.5 transition',
                  active ? 'bg-accent' : 'bg-transparent'
                )}
                style={{ borderBottomWidth: active ? 2 : 0 }}
              />
              {/* enforce border-b-2 bright accent for active */}
              <span
                aria-hidden="true"
                className={cx('absolute inset-x-0 -bottom-px', active ? 'border-b-2 border-accent' : '')}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-5">
        {isLoading ? (
          <LoadingSkeleton />
        ) : isError ? (
          <EmptyState text="Could not load events right now." />
        ) : (
          <>
            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Events Today
              </div>
              {todayItems.length ? (
                <AvatarsRow items={todayItems} kind={kind} onOpenProfile={onOpenProfile} />
              ) : (
                <EmptyState
                  text={
                    tab === 'birthdays'
                      ? 'No birthdays today.'
                      : tab === 'anniversaries'
                        ? 'No work anniversaries today.'
                        : 'No new joinees today.'
                  }
                />
              )}
            </div>

            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Upcoming Events
              </div>
              {upcomingItems.length ? (
                <AvatarsRow items={upcomingItems} kind={kind} onOpenProfile={onOpenProfile} />
              ) : (
                <EmptyState
                  text={
                    tab === 'birthdays'
                      ? 'No upcoming birthdays.'
                      : tab === 'anniversaries'
                        ? 'No upcoming work anniversaries.'
                        : 'No upcoming joinees.'
                  }
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

