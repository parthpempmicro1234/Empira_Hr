import React, { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const CHART_ANIM_MS = 240;

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

function parseNum(v) {
  const n = Number.parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
}

function formatDays(n) {
  const v = Number.isFinite(n) ? n : 0;
  const s = v.toFixed(2).replace(/\.?0+$/, '');
  return s;
}

function hexToRgba(hex, alpha) {
  const raw = String(hex || '').replace('#', '').trim();
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const int = Number.parseInt(full, 16);
  if (!Number.isFinite(int) || full.length !== 6) return hex;
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function KekaDonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const name = p?.name ?? '';
  const value = parseNum(p?.value);
  return (
    <div className="rounded-[6px] bg-[#4a5363] px-2.5 py-1.5 text-xs text-[#edeeef] shadow-lg ring-1 ring-white/10">
      {name}: {formatDays(value)} Days
    </div>
  );
}

export default function DonutChart({ color, used, remaining }) {
  const usedNum = parseNum(used);
  const remainingNum = parseNum(remaining);
  const total = usedNum + remainingNum;

  const data = useMemo(() => {
    // Keep hover/tooltip behavior stable even when there is no data.
    if (total <= 0) {
      return [
        { name: 'Consumed', value: 0, fill: hexToRgba(color, 0.35), key: 'consumed' },
        { name: 'Available', value: 1, fill: 'rgba(47, 73, 96, 1)', key: 'available' },
      ];
    }
    return [
      { name: 'Consumed', value: usedNum, fill: hexToRgba(color, 0.35), key: 'consumed' },
      { name: 'Available', value: remainingNum, fill: color, key: 'available' },
    ];
  }, [color, remainingNum, total, usedNum]);

  const centerValue = formatDays(remainingNum);

  return (
    <ChartSurface className="relative mx-auto mb-3 h-32 w-32 min-w-0 min-h-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <PieChart>
          <Tooltip content={<KekaDonutTooltip />} offset={18} wrapperStyle={{ zIndex: 60, outline: 'none' }} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={46}
            outerRadius={62}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={1}
            activeShape={false}
            isAnimationActive
            animationDuration={CHART_ANIM_MS}
            animationEasing="ease-out"
            paddingAngle={0}
          >
            {data.map((d) => (
              <Cell key={d.key} fill={d.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-[14px] grid place-items-center rounded-full bg-[#0F2435] text-center">
        <div>
          <p className="text-lg font-semibold text-white">{centerValue}</p>
          <p className="text-[10px] text-[#9FB3C8]">Days Available</p>
        </div>
      </div>
    </ChartSurface>
  );
}

