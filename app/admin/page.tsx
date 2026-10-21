import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { messages } from "@/lib/i18n";
import { AdminFrame } from "@/components/Header";

export const instant = false;

async function countWhere(table: string, operatorId: string, column: string, value: string): Promise<number> {
  const { count } = await db().from(table)
    .select("id", { count: "exact", head: true })
    .eq("operator_id", operatorId).eq(column, value);
  return count ?? 0;
}

export default async function AdminHome() {
  const admin = await requireAdmin();
  const t = messages(admin.locale).admin;
  const op = admin.operator_id;
  const [pending, partners, drafts, held] = await Promise.all([
    countWhere("referrals", op, "status", "pending"),
    countWhere("partners", op, "status", "active"),
    countWhere("payouts", op, "status", "draft"),
    countWhere("product_events", op, "result", "held"),
  ]);

  return (
    <AdminFrame admin={admin} current="/admin/">
      <h1>{t.title}</h1>
      <section className="grid">
        <div className="card"><p className="label">{t.pending}</p><p className="value">{pending}</p></div>
        <div className="card"><p className="label">{t.activePartners}</p><p className="value">{partners}</p></div>
        <div className="card"><p className="label">{t.drafts}</p><p className="value">{drafts}</p></div>
        <div className="card"><p className="label">{t.heldEvents}</p><p className="value">{held}</p></div>
      </section>
    </AdminFrame>
  );
}
