import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminNav, Header } from "@/components/Header";

export const instant = false;

async function countWhere(table: string, operatorId: string, column: string, value: string): Promise<number> {
  const { count } = await db().from(table)
    .select("id", { count: "exact", head: true })
    .eq("operator_id", operatorId).eq(column, value);
  return count ?? 0;
}

export default async function AdminHome() {
  const admin = await requireAdmin();
  const op = admin.operator_id;
  const [pending, partners, drafts, held] = await Promise.all([
    countWhere("referrals", op, "status", "pending"),
    countWhere("partners", op, "status", "active"),
    countWhere("payouts", op, "status", "draft"),
    countWhere("product_events", op, "result", "held"),
  ]);

  return (
    <>
      <Header partner={admin} />
      <main>
        <AdminNav current="/admin/" />
        <h1>管理</h1>
        <section className="grid">
          <div className="card"><p className="label">受理待ちの紹介</p><p className="value">{pending}</p></div>
          <div className="card"><p className="label">有効な紹介者</p><p className="value">{partners}</p></div>
          <div className="card"><p className="label">支払いの下書き</p><p className="value">{drafts}</p></div>
          <div className="card"><p className="label">保留中の入金通知</p><p className="value">{held}</p></div>
        </section>
      </main>
    </>
  );
}
