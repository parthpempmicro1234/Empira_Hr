import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import LeaveBalanceCard from './LeaveBalanceCard.jsx';

async function fetchLeaveBalances(year) {
  const params = year ? { year } : undefined;
  const res = await api.get('leave/leave-balances/', params ? { params } : undefined);
  return res.data;
}

function Card({ children, className = '' }) {
  return <div className={`rounded-lg border border-white/5 bg-[#0F2435] p-4 ${className}`}>{children}</div>;
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border border-white/5 bg-[#0F2435] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-4 w-24 animate-pulse rounded bg-[#102739]" />
        <div className="h-3 w-16 animate-pulse rounded bg-[#102739]" />
      </div>
      <div className="mx-auto mb-3 h-32 w-32 animate-pulse rounded-full bg-[#102739]" />
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <div className="h-3 w-20 animate-pulse rounded bg-[#102739]" />
            <div className="mt-1 h-4 w-10 animate-pulse rounded bg-[#102739]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LeaveBalances({ year }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['leave', 'leave-balances', year ?? '__all__'],
    queryFn: () => fetchLeaveBalances(year),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });

  const items = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const sorted = useMemo(() => {
    const getName = (item) =>
      item?.leave_type?.name ?? item?.leave_type_name ?? item?.leave_type ?? '';

    const rank = (name) => {
      const key = String(name ?? '')
        .toLowerCase()
        .replace(/\s*leave\s*$/i, '')
        .trim();
      if (key.includes('paid')) return 1;
      if (key.includes('sick')) return 2;
      if (key.includes('unpaid')) return 3;
      return 99;
    };

    return [...items].sort((a, b) => {
      const ra = rank(getName(a));
      const rb = rank(getName(b));
      if (ra !== rb) return ra - rb;
      // Stable fallback order inside same bucket.
      return String(getName(a)).localeCompare(String(getName(b)));
    });
  }, [items]);

  if (isError) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="md:col-span-2 xl:col-span-3">
          <p className="text-sm text-[#9FB3C8]">Unable to load leave balances</p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sorted.map((item) => (
        <LeaveBalanceCard key={item?.id ?? `${item?.leave_type_name}-${item?.year}`} item={item} year={year} />
      ))}
    </div>
  );
}

