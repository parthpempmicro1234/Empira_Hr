import React, { useState } from 'react';
import DonutChart from './DonutChart.jsx';
import LeavePopup from '../../components/LeavePopup.jsx';

function parseNum(v) {
  const n = Number.parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
}

function formatValue(n) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toFixed(2).replace(/\.?0+$/, '');
}

function getLeaveColor(name) {
  const key = String(name ?? '').toLowerCase();
  if (key.includes('paid')) return '#C4B5FD';
  if (key.includes('sick')) return '#F87171';
  if (key.includes('unpaid')) return '#84CC16';
  return '#8B7CF6';
}

export default function LeaveBalanceCard({ item, year }) {
  const [leaveOpen, setLeaveOpen] = useState(false);
  const rawTitle = item?.leave_type_name ?? 'Leave';
  const title = String(rawTitle).toLowerCase().includes('leave') ? String(rawTitle) : `${rawTitle} Leave`;
  const color = getLeaveColor(rawTitle);
  const initialLeaveTypeId = item?.leave_type?.id ?? item?.leave_type_id ?? null;
  const initialLeaveTypeName = rawTitle;

  const remaining = parseNum(item?.remaining);
  const used = parseNum(item?.used);
  const carried = parseNum(item?.carried_forward);
  const annual = parseNum(item?.total_allocated);
  
  const accrued = parseNum(item?.accrued_so_far);

  return (
    <div className="rounded-lg border border-white/5 bg-[#0F2435] p-4 transition-colors hover:border-white/10">
      <LeavePopup
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        initialLeaveTypeId={initialLeaveTypeId}
        initialLeaveTypeName={initialLeaveTypeName}
        year={year}
      />

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-white">{title}</p>
        <button
          type="button"
          onClick={() => setLeaveOpen(true)}
          className="text-xs font-medium text-[#8B7CF6] transition hover:text-violet-300"
        >
          View details
        </button>
      </div>

      <DonutChart color={color} used={used} remaining={remaining} />

      <div className="overflow-hidden rounded-md border border-white/5 text-xs">
        <div className="grid grid-cols-2">
          <div className="border-b border-r border-white/5 px-3 py-2">
            <p className="text-[10px] text-[#9FB3C8]">AVAILABLE</p>
            <p className="font-semibold text-white">{formatValue(remaining)}</p>
          </div>
          <div className="border-b border-white/5 px-3 py-2">
            <p className="text-[10px] text-[#9FB3C8]">CONSUMED</p>
            <p className="font-semibold text-white">{formatValue(used)}</p>
          </div>
          <div className="border-r border-white/5 px-3 py-2">
            <p className="text-[10px] text-[#9FB3C8]">ACCRUED SO FAR</p>
            <p className="font-semibold text-white">{formatValue(accrued)}</p>
          </div>
          <div className="px-3 py-2">
            <p className="text-[10px] text-[#9FB3C8]">ANNUAL QUOTA</p>
            <p className="font-semibold text-white">{formatValue(annual)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

