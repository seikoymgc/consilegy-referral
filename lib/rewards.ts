import { db } from "./db";
import { addBusinessDays, addMonths, snapshotRules } from "./referrals";
import { notifyAdmin, sendMail } from "./mail";
import { appUrl } from "./db";

type Rule = {
  id: string;
  kind: "monthly_rate" | "service_rate" | "fixed";
  label: string;
  rate: number | null;
  fixed_amount: number | null;
  fixed_months: number | null;
  period_months: number | null;
  once: boolean;
  excluded_plans: string[];
};

type EventRow = {
  id: string;
  operator_id: string;
  product_id: string;
  kind: "signup" | "payment" | "refund";
  external_id: string;
  product_contract_id: string | null;
  charge_type: "monthly" | "service" | null;
  amount_excl_tax: number | null;
  plan: string | null;
  has_in_product_referral: boolean;
  occurred_at: string;
};

const PAYABLE = ["accepted", "confirmed", "paying"];
const DEAD = ["existing_contact", "out_of_scope", "expired", "cancelled", "ended"];

// 入金1件を報酬にする。戻り値は product_events.result
export async function applyPayment(ev: EventRow): Promise<"applied" | "held" | "ignored"> {
  if (!ev.product_contract_id || ev.amount_excl_tax == null) return "ignored";

  const { data: ref } = await db()
    .from("referrals")
    .select("id, partner_id, status, has_in_product_referral, rule_snapshot, paid_started_at, reward_period_end")
    .eq("product_id", ev.product_id)
    .eq("product_contract_id", ev.product_contract_id)
    .maybeSingle();

  if (!ref) return "held"; // 紹介案件が見つからない入金は保留
  if (ref.has_in_product_referral || ev.has_in_product_referral) return "ignored";
  if (ref.status === "pending") return "held"; // 受理前の入金は保留
  if (DEAD.includes(ref.status)) return "ignored";

  const rules = (ref.rule_snapshot ?? []) as Rule[];
  const wantKind = ev.charge_type === "service" ? "service_rate" : "monthly_rate";
  const rule = rules.find((r) => r.kind === wantKind) ?? rules.find((r) => r.kind === "fixed");
  if (!rule) return "ignored";
  if (ev.plan && rule.excluded_plans?.includes(ev.plan)) return "ignored";

  const paidOn = new Date(ev.occurred_at);
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (rule.kind === "monthly_rate" || rule.kind === "fixed") {
    let start = ref.paid_started_at ? new Date(ref.paid_started_at) : null;
    if (!start) {
      start = paidOn;
      updates.paid_started_at = start.toISOString().slice(0, 10);
      if (rule.period_months) {
        updates.reward_period_end = addMonths(start, rule.period_months).toISOString().slice(0, 10);
      }
      updates.status = "paying";
    }
    const end = (updates.reward_period_end as string) ?? ref.reward_period_end;
    if (end && paidOn >= new Date(end)) return "ignored"; // 報酬期間の外
  }

  if (rule.once) {
    const { count } = await db().from("commissions")
      .select("id", { count: "exact", head: true })
      .eq("referral_id", ref.id).eq("kind", rule.kind).neq("status", "cancelled");
    if ((count ?? 0) > 0) return "ignored";
  }

  let amount = 0;
  if (rule.kind === "fixed") {
    amount = rule.fixed_amount ?? Math.floor((rule.fixed_months ?? 0) * ev.amount_excl_tax);
  } else {
    amount = Math.floor(ev.amount_excl_tax * Number(rule.rate ?? 0)); // 円未満切り捨て
  }

  const { error } = await db().from("commissions").insert({
    operator_id: ev.operator_id,
    partner_id: ref.partner_id,
    referral_id: ref.id,
    product_id: ev.product_id,
    kind: rule.kind,
    event_id: ev.id,
    base_amount: ev.amount_excl_tax,
    rate: rule.rate,
    amount,
    status: "confirmed",
    confirmed_at: new Date().toISOString(),
  });
  if (error && !error.message.includes("duplicate")) throw new Error(error.message);

  if (Object.keys(updates).length > 1 && PAYABLE.includes(ref.status)) {
    await db().from("referrals").update(updates).eq("id", ref.id);
  }
  return "applied";
}

// 取消・返金：未払いなら取消、支払済みなら次回以降と相殺するマイナス行を足す
export async function applyRefund(ev: EventRow, refundOf: string | null): Promise<"applied" | "ignored"> {
  if (!refundOf) return "ignored";
  const { data: orig } = await db().from("product_events")
    .select("id").eq("product_id", ev.product_id).eq("external_id", refundOf).maybeSingle();
  if (!orig) return "ignored";

  const { data: c } = await db().from("commissions")
    .select("id, operator_id, partner_id, referral_id, product_id, kind, base_amount, rate, amount, status, payout_id")
    .eq("event_id", orig.id).maybeSingle();
  if (!c) return "ignored";

  if (c.status === "paid") {
    await db().from("commissions").insert({
      operator_id: c.operator_id, partner_id: c.partner_id, referral_id: c.referral_id,
      product_id: c.product_id, kind: c.kind, event_id: ev.id,
      base_amount: -c.base_amount, rate: c.rate, amount: -c.amount,
      status: "confirmed", confirmed_at: new Date().toISOString(),
    });
    await db().from("commissions").update({ status: "offset" }).eq("id", c.id);
  } else if (c.status !== "cancelled") {
    await db().from("commissions").update({ status: "cancelled", payout_id: null }).eq("id", c.id);
    if (c.payout_id) await recomputePayout(c.payout_id);
  }
  return "applied";
}

// 申込：紹介コードから紹介案件（リンク経由）を作る
export async function applySignup(
  ev: EventRow & { referral_code: string | null; company_name: string | null },
): Promise<"applied" | "ignored"> {
  if (!ev.referral_code || !ev.product_contract_id) return "ignored";
  if (ev.has_in_product_referral) return "ignored"; // 製品内の紹介が付いた契約は紐づけない

  const { data: partner } = await db().from("partners")
    .select("id, status").eq("operator_id", ev.operator_id).eq("referral_code", ev.referral_code).maybeSingle();
  if (!partner || partner.status !== "active") return "ignored";

  const { error } = await db().from("referrals").insert({
    operator_id: ev.operator_id,
    partner_id: partner.id,
    product_id: ev.product_id,
    company_name: ev.company_name ?? "（リンク経由の申込）",
    channel: "link",
    status: "pending",
    product_contract_id: ev.product_contract_id,
  });
  // 製品と契約IDの組で一意：先に付いた紹介を優先
  if (error) return "ignored";
  await notifyAdmin("【紹介】リンク経由の申込がありました",
    `${appUrl()}/admin/referrals/ で確認してください。3営業日以内に何もしなければ自動で受理されます。`);
  return "applied";
}

// 受理：ルールを固定し、保留していた入金を計算し直す
export async function acceptReferral(referralId: string, alsoConfirm: boolean): Promise<void> {
  const { data: ref } = await db().from("referrals")
    .select("id, product_id, product_contract_id, status").eq("id", referralId).single();
  if (!ref) return;
  const now = new Date().toISOString();
  const rules = await snapshotRules(ref.product_id);
  await db().from("referrals").update({
    status: alsoConfirm ? "confirmed" : "accepted",
    accepted_at: now,
    confirmed_at: alsoConfirm ? now : null,
    rule_snapshot: rules,
    updated_at: now,
  }).eq("id", referralId);
  await reprocessHeld(ref.product_id, ref.product_contract_id);
}

export async function reprocessHeld(productId: string, contractId: string | null): Promise<void> {
  if (!contractId) return;
  const { data: events } = await db().from("product_events")
    .select("id, operator_id, product_id, kind, external_id, product_contract_id, charge_type, amount_excl_tax, plan, has_in_product_referral, occurred_at")
    .eq("product_id", productId).eq("product_contract_id", contractId)
    .eq("kind", "payment").eq("result", "held")
    .order("occurred_at", { ascending: true });
  for (const ev of (events ?? []) as EventRow[]) {
    const result = await applyPayment(ev);
    await db().from("product_events").update({ result }).eq("id", ev.id);
  }
}

// 毎日の定期処理
export async function runDaily(now = new Date()): Promise<Record<string, number>> {
  const counts = { autoAccepted: 0, formOverdue: 0, expired90: 0, expired12m: 0, ended: 0 };

  const { data: pending } = await db().from("referrals")
    .select("id, channel, created_at, company_name").eq("status", "pending");
  const overdue: string[] = [];
  for (const r of pending ?? []) {
    const deadline = addBusinessDays(new Date(r.created_at), 3);
    if (now < deadline) continue;
    if (r.channel === "link") {
      await acceptReferral(r.id, true); // リンク経由は自動で受理・紹介者確定
      counts.autoAccepted++;
    } else {
      overdue.push(r.company_name);
      counts.formOverdue++;
    }
  }
  if (overdue.length) {
    await notifyAdmin("【紹介】受理待ちが3営業日を超えています",
      `${overdue.join("、")}\n${appUrl()}/admin/referrals/`);
  }

  // 受理から90日で紹介者が確定しなければ失効
  const d90 = new Date(now.getTime() - 90 * 86400 * 1000).toISOString();
  const { data: e90 } = await db().from("referrals").update({ status: "expired", updated_at: now.toISOString() })
    .eq("status", "accepted").lt("accepted_at", d90).select("id");
  counts.expired90 = e90?.length ?? 0;

  // 確定から12か月以内に有料契約がなければ見送り（失効）
  const d12 = addMonths(now, -12).toISOString();
  const { data: e12 } = await db().from("referrals").update({ status: "expired", updated_at: now.toISOString() })
    .eq("status", "confirmed").lt("confirmed_at", d12).select("id");
  counts.expired12m = e12?.length ?? 0;

  // 報酬期間の終わりを過ぎたら終了
  const today = now.toISOString().slice(0, 10);
  const { data: ended } = await db().from("referrals").update({ status: "ended", updated_at: now.toISOString() })
    .eq("status", "paying").lt("reward_period_end", today).select("id");
  counts.ended = ended?.length ?? 0;

  return counts;
}

const MIN_PAYOUT = 5000;

// 毎月初日：前月末までに確定した未払いの報酬を、紹介者ごとに全製品合計して支払いの下書きを作る
export async function runMonthly(now = new Date()): Promise<Record<string, number>> {
  const counts = { drafts: 0, carriedOver: 0, needBank: 0, professionalHold: 0 };
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const prevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

  const { data: rows } = await db().from("commissions")
    .select("id, operator_id, partner_id, amount")
    .eq("status", "confirmed").is("payout_id", null)
    .lt("confirmed_at", monthStart.toISOString());

  const byPartner = new Map<string, { op: string; ids: string[]; total: number }>();
  for (const r of rows ?? []) {
    const e = byPartner.get(r.partner_id) ?? { op: r.operator_id as string, ids: [] as string[], total: 0 };
    e.ids.push(r.id);
    e.total += r.amount;
    byPartner.set(r.partner_id, e);
  }

  for (const [partnerId, e] of byPartner) {
    const { data: p } = await db().from("partners")
      .select("email, name, payout_method, bank_encrypted, invoice_number, is_professional, tax_checked_at, status")
      .eq("id", partnerId).single();
    if (!p || p.payout_method === "none") continue; // 受け取らない人は台帳だけ
    if (e.total < MIN_PAYOUT) { counts.carriedOver++; continue; }
    if (!p.bank_encrypted) {
      counts.needBank++;
      await sendMail({
        to: p.email,
        subject: "【Consilegy 紹介パートナー】振込先のご登録のお願い",
        text: `${p.name} 様\n\nお支払いできる報酬が確定しました。マイページの「登録情報」から振込先をご登録ください。\n${appUrl()}/my/settings/`,
      });
      continue;
    }
    if (p.is_professional && !p.tax_checked_at) {
      counts.professionalHold++;
      await notifyAdmin("【紹介】士業の紹介者の支払いを保留しました",
        `${p.name} 様（${e.total}円）。源泉徴収の要否を顧問税理士に確認し、管理画面の「紹介者」で「税理士に確認済み」にしてください。次の締めで支払いの下書きを作ります。`);
      continue;
    }

    const { data: payout, error } = await db().from("payouts").insert({
      operator_id: e.op,
      partner_id: partnerId,
      month: prevMonth.toISOString().slice(0, 10),
      amount: e.total,
      status: "draft",
      bank_snapshot_encrypted: p.bank_encrypted,
      invoice_number_snapshot: p.invoice_number,
    }).select("id").single();
    if (error || !payout) continue; // 紹介者と対象月の組で一意：2回動いても二重にならない
    await db().from("commissions").update({ payout_id: payout.id }).in("id", e.ids);
    counts.drafts++;
  }
  return counts;
}

// 振込前の支払いから報酬が外れたとき、支払額を計算し直す（0円以下になったら下書きを消す）
async function recomputePayout(payoutId: string): Promise<void> {
  const { data: payout } = await db().from("payouts").select("id, status").eq("id", payoutId).maybeSingle();
  if (!payout || payout.status === "paid") return;
  const { data: rows } = await db().from("commissions").select("amount").eq("payout_id", payoutId).eq("status", "confirmed");
  const total = (rows ?? []).reduce((s, r) => s + r.amount, 0);
  if (total <= 0) {
    await db().from("commissions").update({ payout_id: null }).eq("payout_id", payoutId);
    await db().from("payouts").delete().eq("id", payoutId);
  } else {
    await db().from("payouts").update({ amount: total, status: "draft" }).eq("id", payoutId);
  }
  await notifyAdmin("【紹介】返金で支払いの額が変わりました", `${appUrl()}/admin/payouts/ で確認してください。`);
}
