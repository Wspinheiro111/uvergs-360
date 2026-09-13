import { type AdminDataResult, withAdminRead } from "./admin-data";

const EVENT_ROLES = ["admin_global", "presidency", "audit_read"];

export type EventStatus = "draft" | "published" | "registration_open" | "full" | "in_progress" | "completed" | "cancelled";
export type EventFormat = "in_person" | "online" | "hybrid";

export interface EventRow {
  id: string;
  title: string;
  type: string;
  status: EventStatus;
  format: EventFormat;
  venueName: string | null;
  municipalityName: string | null;
  startsAt: Date;
  endsAt: Date;
  capacity: number | null;
  priceCents: number;
  workloadMinutes: number;
  registrations: number;
  confirmed: number;
  attended: number;
  certificatesIssued: number;
}

export interface EventDirectory {
  events: EventRow[];
  totals: {
    upcoming: number;
    openRegistrations: number;
    confirmedParticipants: number;
    certificatesIssued: number;
  };
}

export async function loadEventDirectory(
  search: string,
  status: EventStatus | "all"
): Promise<AdminDataResult<EventDirectory>> {
  return withAdminRead(EVENT_ROLES, async (sql) => {
    const pattern = `%${search}%`;
    const events = await sql<EventRow[]>`
      SELECT
        e.id,
        e.title,
        e.type,
        e.status,
        e.format,
        e.venue_name AS "venueName",
        e.municipality_name AS "municipalityName",
        e.starts_at AS "startsAt",
        e.ends_at AS "endsAt",
        e.capacity,
        e.price_cents AS "priceCents",
        e.workload_minutes AS "workloadMinutes",
        COUNT(r.id)::int AS registrations,
        COUNT(r.id) FILTER (WHERE r.status IN ('confirmed', 'attended'))::int AS confirmed,
        COUNT(r.id) FILTER (WHERE r.status = 'attended')::int AS attended,
        COUNT(c.id) FILTER (WHERE c.status = 'issued')::int AS "certificatesIssued"
      FROM events e
      LEFT JOIN registrations r ON r.event_id = e.id AND r.tenant_id = e.tenant_id
      LEFT JOIN certificates c ON c.registration_id = r.id AND c.tenant_id = r.tenant_id
      WHERE (${search.length === 0}
        OR e.title ILIKE ${pattern}
        OR COALESCE(e.municipality_name, '') ILIKE ${pattern}
        OR COALESCE(e.venue_name, '') ILIKE ${pattern})
        AND (${status === "all"} OR e.status = ${status})
      GROUP BY e.id
      ORDER BY e.starts_at DESC
      LIMIT 100
    `;

    const [totals] = await sql<EventDirectory["totals"][]>`
      SELECT
        (SELECT COUNT(*)::int FROM events WHERE ends_at >= NOW() AND status <> 'cancelled') AS upcoming,
        (SELECT COUNT(*)::int FROM events WHERE status = 'registration_open') AS "openRegistrations",
        (SELECT COUNT(*)::int FROM registrations WHERE status IN ('confirmed', 'attended')) AS "confirmedParticipants",
        (SELECT COUNT(*)::int FROM certificates WHERE status = 'issued') AS "certificatesIssued"
    `;

    return {
      events,
      totals: totals ?? { upcoming: 0, openRegistrations: 0, confirmedParticipants: 0, certificatesIssued: 0 },
    };
  });
}
