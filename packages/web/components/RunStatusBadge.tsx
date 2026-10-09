const STYLES: Record<string, string> = {
  pending: "bg-neutral-100 text-neutral-600",
  running: "bg-amber-50 text-amber-700",
  success: "bg-emerald-50 text-emerald-700",
  failed: "bg-rose-50 text-rose-700",
};

const LABELS: Record<string, string> = {
  pending: "排队中",
  running: "运行中",
  success: "成功",
  failed: "失败",
};

export function RunStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${
        STYLES[status] ?? "bg-neutral-100 text-neutral-600"
      }`}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
