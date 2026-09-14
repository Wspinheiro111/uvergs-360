import { type AdminDataResult, withAdminRead } from "./admin-data";

const COMMUNICATION_ROLES = ["admin_global", "presidency", "audit_read"];
export type CampaignStatus = "draft" | "scheduled" | "sending" | "completed" | "paused" | "cancelled";
export type CampaignChannel = "email" | "whatsapp" | "sms" | "push";

export interface CampaignRow {
  id: string;
  name: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  audience: string;
  scheduledAt: Date | null;
  createdAt: Date;
  recipients: number;
  delivered: number;
  read: number;
  failed: number;
}
export interface CommunicationDirectory {
  campaigns: CampaignRow[];
  totals: { campaigns: number; audience: number; delivered: number; engagementRate: number };
}

export async function loadCommunicationDirectory(
  search: string,
  status: CampaignStatus | "all"
): Promise<AdminDataResult<CommunicationDirectory>> {
  return withAdminRead(COMMUNICATION_ROLES, async (sql) => {
    const pattern = `%${search}%`;
    const campaigns = await sql<CampaignRow[]>`
      SELECT c.id, c.name, c.channel, c.status, c.audience,
        c.scheduled_at AS "scheduledAt", c.created_at AS "createdAt",
        COUNT(m.id)::int AS recipients,
        COUNT(m.id) FILTER (WHERE m.status IN ('delivered', 'read'))::int AS delivered,
        COUNT(m.id) FILTER (WHERE m.status = 'read')::int AS read,
        COUNT(m.id) FILTER (WHERE m.status = 'failed')::int AS failed
      FROM campaigns c
      LEFT JOIN campaign_messages m ON m.tenant_id=c.tenant_id AND m.campaign_id=c.id
      WHERE (${search.length === 0} OR c.name ILIKE ${pattern} OR COALESCE(c.subject, '') ILIKE ${pattern})
        AND (${status === "all"} OR c.status = ${status})
      GROUP BY c.id
      ORDER BY COALESCE(c.scheduled_at, c.created_at) DESC
      LIMIT 100
    `;
    const [totals] = await sql<{ campaigns: number; audience: number; delivered: number; read: number }[]>`
      SELECT
        (SELECT COUNT(*)::int FROM campaigns) AS campaigns,
        (SELECT COUNT(*)::int FROM campaign_messages) AS audience,
        (SELECT COUNT(*)::int FROM campaign_messages WHERE status IN ('delivered', 'read')) AS delivered,
        (SELECT COUNT(*)::int FROM campaign_messages WHERE status = 'read') AS read
    `;
    const audience = totals?.audience ?? 0;
    return { campaigns, totals: {
      campaigns: totals?.campaigns ?? 0,
      audience,
      delivered: totals?.delivered ?? 0,
      engagementRate: audience === 0 ? 0 : Math.round(((totals?.read ?? 0) / audience) * 100),
    } };
  });
}
