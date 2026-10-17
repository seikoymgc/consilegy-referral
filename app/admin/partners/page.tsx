import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { yen, ymd } from "@/lib/referrals";
import { AdminNav, Header, Notice } from "@/components/Header";

export const instant = false;

export default async function AdminPartners({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;

  const { data: partners } = await db().from("partners")
    .select("id, name, company, email, phone, referral_code, status, role, is_professional, tax_checked_at, invoice_number, bank_last4, created_at")
    .eq("operator_id", admin.operator_id).order("created_at", { ascending: false });
  const { data: refs } = await db().from("referrals")
    .select("partner_id, products(name)").eq("operator_id", admin.operator_id);
  const { data: unpaid } = await db().from("commissions")
    .select("partner_id, amount").eq("operator_id", admin.operator_id).eq("status", "confirmed");

  return (
    <>
      <Header partner={admin} />
      <main>
        <AdminNav current="/admin/partners/" />
        <h1>紹介者</h1>
        <Notice params={params} />
        <div className="scroll">
          <table>
            <thead>
              <tr><th>名前</th><th>連絡先</th><th>紹介コード</th><th>製品ごとの紹介件数</th><th>未払いの報酬</th><th>インボイス</th><th>振込先</th><th>状態</th><th>操作</th></tr>
            </thead>
            <tbody>
              {(partners ?? []).map((p) => {
                const mine = (refs ?? []).filter((r) => r.partner_id === p.id);
                const byProduct = new Map<string, number>();
                for (const r of mine) {
                  const n = (r.products as unknown as { name: string } | null)?.name ?? "?";
                  byProduct.set(n, (byProduct.get(n) ?? 0) + 1);
                }
                const owed = (unpaid ?? []).filter((c) => c.partner_id === p.id).reduce((s, c) => s + c.amount, 0);
                return (
                  <tr key={p.id}>
                    <td>
                      {p.name}{p.company ? `（${p.company}）` : ""}
                      {p.role === "admin" && <span className="badge">管理者</span>}
                      {p.is_professional && <span className="badge">士業</span>}
                      <div className="label">登録：{ymd(p.created_at)}</div>
                    </td>
                    <td>{p.email}<br />{p.phone}</td>
                    <td><code>{p.referral_code}</code></td>
                    <td>{Array.from(byProduct.entries()).map(([n, c]) => `${n} ${c}件`).join(" / ") || "—"}</td>
                    <td>{yen(owed)}</td>
                    <td>{p.invoice_number ?? "—"}</td>
                    <td>{p.bank_last4 ? `****${p.bank_last4}` : "未登録"}</td>
                    <td>{p.status === "active" ? "有効" : p.status === "suspended" ? "停止" : "退会"}</td>
                    <td>
                      {p.status === "active" ? (
                        <form action="/api/admin/partners/" method="post">
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="action" value="suspend" />
                          <button type="submit" className="danger small">停止</button>
                        </form>
                      ) : p.status === "suspended" ? (
                        <form action="/api/admin/partners/" method="post">
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="action" value="activate" />
                          <button type="submit" className="small">再開</button>
                        </form>
                      ) : null}
                      <form action="/api/admin/partners/" method="post">
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="action" value="professional" />
                        <input type="hidden" name="value" value={p.is_professional ? "false" : "true"} />
                        <button type="submit" className="link small">{p.is_professional ? "士業の印を外す" : "士業の印を付ける"}</button>
                      </form>
                      {p.is_professional && (p.tax_checked_at ? (
                        <div className="label">税理士に確認済み（{ymd(p.tax_checked_at)}）</div>
                      ) : (
                        <form action="/api/admin/partners/" method="post">
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="action" value="tax_checked" />
                          <button type="submit" className="link small">源泉徴収の要否を税理士に確認済みにする</button>
                        </form>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
