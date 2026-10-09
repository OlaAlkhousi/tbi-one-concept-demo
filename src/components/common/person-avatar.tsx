import { cn } from "@/lib/utils";
import { employeeById } from "@/lib/selectors";
import type { Availability, Employee } from "@/lib/types";

const sizes = { xs: "size-5 text-[9px]", sm: "size-7 text-[11px]", md: "size-9 text-xs", lg: "size-12 text-sm", xl: "size-16 text-lg" };

const availabilityColor: Record<Availability, string> = {
  available: "bg-success",
  busy: "bg-danger",
  "in-meeting": "bg-warning",
  away: "bg-muted-foreground/60",
  offline: "bg-muted-foreground/30",
};

export const availabilityLabel: Record<Availability, string> = {
  available: "Available",
  busy: "Busy",
  "in-meeting": "In a meeting",
  away: "Away",
  offline: "Offline",
};

/** Generated initials avatar. No photos: every person in this demo is fictional. */
export function PersonAvatar({
  person,
  id,
  size = "sm",
  showStatus = false,
  className,
}: {
  person?: Employee;
  id?: string;
  size?: keyof typeof sizes;
  showStatus?: boolean;
  className?: string;
}) {
  const p = person ?? employeeById(id);
  if (!p) return null;
  return (
    <span className={cn("relative inline-flex shrink-0", className)} title={`${p.name} — ${p.role}`}>
      <span
        className={cn("inline-flex items-center justify-center rounded-full font-semibold tracking-wide text-white ring-2 ring-background", sizes[size])}
        style={{ background: `linear-gradient(135deg, oklch(0.62 0.13 ${p.hue}), oklch(0.48 0.14 ${(p.hue + 30) % 360}))` }}
        aria-hidden
      >
        {p.initials}
      </span>
      {showStatus && (
        <span className={cn("absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-background", availabilityColor[p.availability])}>
          <span className="sr-only">{availabilityLabel[p.availability]}</span>
        </span>
      )}
    </span>
  );
}

export function AvatarStack({ ids, max = 4, size = "xs" }: { ids: string[]; max?: number; size?: keyof typeof sizes }) {
  const shown = ids.slice(0, max);
  return (
    <span className="flex items-center -space-x-1.5">
      {shown.map((id) => (
        <PersonAvatar key={id} id={id} size={size} />
      ))}
      {ids.length > max && <span className="ml-2 text-xs text-muted-foreground">+{ids.length - max}</span>}
    </span>
  );
}
