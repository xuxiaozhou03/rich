export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 text-lg tabular-nums">{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-neutral-400">{hint}</div> : null}
    </div>
  );
}
