export default function PlaceholderPanel({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/20 p-6">
      <div className="text-sm font-semibold text-slate-100">{title}</div>
      <div className="mt-2 text-sm text-slate-400">UI-only placeholder.</div>
    </div>
  );
}

