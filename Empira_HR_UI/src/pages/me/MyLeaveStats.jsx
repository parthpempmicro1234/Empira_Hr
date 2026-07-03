import React, { useMemo } from 'react';
import { Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';

import { api } from '../../services/api';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const LEAVE_TYPE_META = {
  sick: { label: 'Sick Leave', color: '#F87171' },
  unpaid: { label: 'Unpaid Leave', color: '#84CC16' },
  paid: { label: 'Paid Leave', color: '#A78BFA' },
};

/** Fast Recharts animation (ms). */
const CHART_ANIM_MS = 240;

/** Kills click-focus ring / selection chrome on charts; tooltips still work on hover. */
function ChartSurface({ children, className = '' }) {
  return (
    <div
      className={`select-none outline-none [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none [&_svg]:outline-none [&_svg:focus]:outline-none ${className}`}
      onMouseDown={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
}

function parseDays(value) {
  if (value == null) return 0;
  const n = Number.parseInt(String(value).replace(/d$/i, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function Card({ children, className = '' }) {
  return <div className={`rounded-lg border border-white/5 bg-[#0F2435] p-4 ${className}`}>{children}</div>;
}

function Panel({ children, className = '' }) {
  return <div className={`rounded-md bg-[#0F2435] ${className}`}>{children}</div>;
}

function TitleRow({ title, info }) {
  return (
    <div className="mb-2.5 flex items-center justify-between">
      <p className="text-[11px] font-medium text-white">{title}</p>
      {info ? (
        <div className="group relative">
          <button
            type="button"
            className="grid h-6 w-6 place-items-center rounded text-[#6c8297] hover:text-[#9FB3C8] focus:outline-none focus:ring-1 focus:ring-[#8B7CF6]/60"
            aria-label={`${title} info`}
          >
            <Info className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          </button>
          <div className="pointer-events-none absolute right-0 top-7 z-20 hidden w-[320px] rounded-md border border-white/10 bg-[#4a5363] px-3 py-2 text-[11px] leading-snug text-[#edeeef] shadow-xl group-hover:block">
            {info}
          </div>
        </div>
      ) : (
        <Info className="h-3.5 w-3.5 text-[#6c8297]" strokeWidth={2} aria-hidden />
      )}
    </div>
  );
}

function KekaTooltip({ active, payload, label, kind }) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value ?? 0;
  const left = kind === 'donut' ? payload[0]?.name ?? '' : label;
  return (
    <div className="rounded-[6px] bg-[#4a5363] px-2.5 py-1.5 text-xs text-[#edeeef] shadow-lg ring-1 ring-white/10">
      {left} : {val}d
    </div>
  );
}

function ChartSkeleton({ columns }) {
  return (
    <Panel className="px-3 pb-3 pt-2">
      <div className="h-[52px] w-full animate-pulse rounded bg-[#102739]" />
      <div className="mt-2 h-px w-full bg-[#2a4156]" />
      <div className={`mt-2 grid gap-1 text-center text-[9px] text-[#9FB3C8] ${columns}`}>
        {Array.from({ length: columns === 'grid-cols-7' ? 7 : 12 }).map((_, i) => (
          <span key={i} className="opacity-40">
            &nbsp;
          </span>
        ))}
      </div>
    </Panel>
  );
}

function WeeklyPatternChart({ data }) {
  return (
    <Panel className="px-3 pb-3 pt-2">
      <ChartSurface className="h-[52px] min-w-0 min-h-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <BarChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="#2a4156" strokeOpacity={0.35} />
            <XAxis
              dataKey="label"
              hide
            />
            <Tooltip content={<KekaTooltip kind="bar" />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar
              dataKey="value"
              fill="#A78BFA"
              radius={[2, 2, 0, 0]}
              maxBarSize={18}
              activeBar={false}
              isAnimationActive
              animationDuration={CHART_ANIM_MS}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartSurface>
      <div className="mt-2 h-px w-full bg-[#2a4156]" />
      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[9px] text-[#9FB3C8]">
        {WEEK_DAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
    </Panel>
  );
}

function MonthlyStatsChart({ data }) {
  return (
    <Panel className="px-3 pb-3 pt-2">
      <ChartSurface className="h-[52px] min-w-0 min-h-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <BarChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="#2a4156" strokeOpacity={0.35} />
            <XAxis
              dataKey="label"
              hide
            />
            <Tooltip content={<KekaTooltip kind="bar" />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar
              dataKey="value"
              fill="#A78BFA"
              radius={[2, 2, 0, 0]}
              maxBarSize={10}
              activeBar={false}
              isAnimationActive
              animationDuration={CHART_ANIM_MS}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartSurface>
      <div className="mt-2 h-px w-full bg-[#2a4156]" />
      <div className="mt-2 grid grid-cols-12 gap-1 text-center text-[9px] text-[#9FB3C8]">
        {MONTHS.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </Panel>
  );
}

function LeaveTypesDonut({ series }) {
  const total = useMemo(() => series.reduce((sum, s) => sum + s.value, 0), [series]);
  const chartData = total > 0 ? series : [{ key: 'none', label: 'Leave Types', value: 1, color: '#2f4960' }];

  return (
    <Panel className="py-2">
      <ChartSurface className="relative mx-auto h-[108px] w-[108px] min-w-0 min-h-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <PieChart>
            <Tooltip content={<KekaTooltip kind="donut" />} offset={18} wrapperStyle={{ zIndex: 60, outline: 'none' }} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="label"
              innerRadius={40}
              outerRadius={54}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={1}
              activeShape={false}
              isAnimationActive
              animationDuration={CHART_ANIM_MS}
              animationEasing="ease-out"
            >
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-[11px] text-[#9FB3C8]">Leave</p>
            <p className="text-xs font-semibold text-white">Types</p>
          </div>
        </div>
      </ChartSurface>
    </Panel>
  );
}

async function fetchLeaveStats(year) {
  const params = year ? { year } : undefined;
  const res = await api.get('leave/employeeleaves/stats/', params ? { params } : undefined);
  return res.data;
}

export default function MyLeaveStats({ year }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['leave', 'employeeleaves', 'stats', year ?? '__all__'],
    queryFn: () => fetchLeaveStats(year),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });

  const processed = useMemo(() => {
    const weeklyRaw = data?.weekly ?? {};
    const monthlyRaw = data?.monthly ?? {};
    const leaveTypesRaw = data?.['Consumed Leave Types'] ?? {};

    const weekly = WEEK_DAYS.map((d) => ({ label: d, value: parseDays(weeklyRaw[d]) }));
    const monthly = MONTHS.map((m) => ({ label: m, value: parseDays(monthlyRaw[m]) }));

    const leaveTypes = Object.entries(leaveTypesRaw).map(([key, v]) => {
      const meta = LEAVE_TYPE_META[key] ?? { label: `${key}`, color: '#2f4960' };
      return { key, label: meta.label, value: parseDays(v), color: meta.color };
    });

    return { weekly, monthly, leaveTypes };
  }, [data]);

  if (isError) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="md:col-span-2 xl:col-span-3">
          <p className="text-sm text-[#9FB3C8]">Unable to load leave stats</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_2fr]">
      <Card className="transition-colors hover:border-white/10">
        <TitleRow
          title="Weekly Pattern"
          info="This graph indicates your week-over-week pattern of leave utilization during the entire year. You can see on what days of the week you were mostly on leave, during the year."
        />
        {isLoading ? <ChartSkeleton columns="grid-cols-7" /> : <WeeklyPatternChart data={processed.weekly} />}
      </Card>

      <Card className="transition-colors hover:border-white/10">
        <TitleRow
          title="Consumed Leave Types"
          info="This chart shows the total leave consumed by each leave type during the selected period."
        />
        {isLoading ? (
          <Panel className="py-2">
            <div className="mx-auto h-28 w-28 animate-pulse rounded-full bg-[#102739]" />
          </Panel>
        ) : (
          <LeaveTypesDonut series={processed.leaveTypes} />
        )}
      </Card>

      <Card className="transition-colors hover:border-white/10">
        <TitleRow
          title="Monthly Stats"
          info="This graph indicates your month-over-month pattern of leave utilization during the year."
        />
        {isLoading ? <ChartSkeleton columns="grid-cols-12" /> : <MonthlyStatsChart data={processed.monthly} />}
      </Card>
    </div>
  );
}

