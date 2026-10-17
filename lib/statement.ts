import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { db } from "./db";

// 支払通知書PDF。振込済みを記録したときに作り、Supabase Storage（非公開の statements バケット）に7年保存する。
// インボイス登録番号のある紹介者の分は仕入明細書の形にする（設計書「報酬の計算と支払い」）。

export const STATEMENT_BUCKET = "statements";

const KIND_LABEL: Record<string, string> = {
  monthly_rate: "月額",
  service_rate: "導入・定着・運用支援",
  fixed: "定額",
};

type CompanyInfo = { name?: string; address?: string };

async function loadFonts(doc: PDFDocument) {
  doc.registerFontkit(fontkit);
  const dir = path.join(process.cwd(), "assets", "fonts");
  const [regular, bold] = await Promise.all([
    readFile(path.join(dir, "MPLUS1p-Regular.ttf")),
    readFile(path.join(dir, "MPLUS1p-Bold.ttf")),
  ]);
  return {
    regular: await doc.embedFont(regular, { subset: false }),
    bold: await doc.embedFont(bold, { subset: false }),
  };
}

function yen(n: number) {
  return `${n.toLocaleString("ja-JP")}円`;
}

function jpDate(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日`;
}

export async function buildStatementPdf(payoutId: string): Promise<{ bytes: Uint8Array; path: string }> {
  const { data: payout, error } = await db().from("payouts")
    .select("id, operator_id, partner_id, month, amount, paid_on, statement_number, invoice_number_snapshot, created_at, partners(name, company), operators(name, company_info)")
    .eq("id", payoutId).single();
  if (error || !payout) throw new Error("支払いが見つかりません");

  const partner = payout.partners as unknown as { name: string; company: string | null } | null;
  const operator = payout.operators as unknown as { name: string; company_info: CompanyInfo | null } | null;
  const company = operator?.company_info ?? {};

  const { data: rows } = await db().from("commissions")
    .select("kind, base_amount, rate, amount, status, confirmed_at, created_at, products(name), referrals(company_name)")
    .eq("payout_id", payout.id)
    .order("confirmed_at", { ascending: true });
  const items = (rows ?? []).map((c) => ({
    date: jpDate(c.confirmed_at ?? c.created_at),
    product: (c.products as unknown as { name: string } | null)?.name ?? "",
    company: (c.referrals as unknown as { company_name: string } | null)?.company_name ?? "",
    kind: KIND_LABEL[c.kind] ?? c.kind,
    base: c.base_amount as number,
    rate: c.rate == null ? "" : `${Math.round(Number(c.rate) * 1000) / 10}%`,
    amount: c.amount as number,
  }));

  const bytes = await renderStatementPdf({
    statementNumber: payout.statement_number ?? "",
    partnerName: partner?.name ?? "",
    partnerCompany: partner?.company ?? null,
    invoiceNumber: (payout.invoice_number_snapshot ?? "").trim(),
    issuerName: company.name ?? operator?.name ?? "Consilegy合同会社",
    issuerAddress: company.address ?? "",
    month: payout.month,
    paidOn: payout.paid_on,
    amount: payout.amount,
    items,
  });
  return { bytes, path: `${payout.partner_id}/${payout.id}.pdf` };
}

export type StatementData = {
  statementNumber: string; partnerName: string; partnerCompany: string | null; invoiceNumber: string;
  issuerName: string; issuerAddress: string; month: string; paidOn: string | null; amount: number;
  items: { date: string; product: string; company: string; kind: string; base: number; rate: string; amount: number }[];
};

export async function renderStatementPdf(d: StatementData): Promise<Uint8Array> {
  const items = d.items;
  const invoiceNo = d.invoiceNumber;
  const isPurchaseStatement = invoiceNo.length > 0;

  const doc = await PDFDocument.create();
  doc.setTitle(`支払通知書 ${d.statementNumber}`);
  doc.setAuthor(d.issuerName);
  const f = await loadFonts(doc);

  const W = 595.28, H = 841.89, M = 48;
  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;
  const text = (p: PDFPage, s: string, x: number, yy: number, size = 9.5, font: PDFFont = f.regular) =>
    p.drawText(s, { x, y: yy, size, font, color: rgb(0.1, 0.1, 0.1) });
  const right = (p: PDFPage, s: string, xr: number, yy: number, size = 9.5, font: PDFFont = f.regular) =>
    text(p, s, xr - font.widthOfTextAtSize(s, size), yy, size, font);
  const line = (p: PDFPage, yy: number) =>
    p.drawLine({ start: { x: M, y: yy }, end: { x: W - M, y: yy }, thickness: 0.6, color: rgb(0.6, 0.6, 0.6) });

  // 見出し
  const title = isPurchaseStatement ? "支払通知書（仕入明細書）" : "支払通知書";
  text(page, title, M, y - 8, 18, f.bold);
  right(page, `No. ${d.statementNumber}`, W - M, y, 9.5);
  right(page, `発行日 ${jpDate(new Date().toISOString())}`, W - M, y - 14, 9.5);
  y -= 50;

  // 宛先
  const to = d.partnerCompany ? `${d.partnerCompany}　${d.partnerName} 様` : `${d.partnerName} 様`;
  text(page, to, M, y, 12, f.bold);
  if (isPurchaseStatement) text(page, `登録番号　${invoiceNo}`, M, y - 16, 9.5);

  // 発行者
  let ry = y;
  right(page, d.issuerName, W - M, ry, 10.5, f.bold);
  if (d.issuerAddress) {
    ry -= 15;
    right(page, d.issuerAddress, W - M, ry, 8.5);
  }
  y -= 48;

  text(page, "紹介パートナー制度の報酬を、下記のとおりお支払いしました。", M, y, 10);
  y -= 26;

  // 概要
  const month = d.month.slice(0, 7).replace("-", "年") + "月分";
  const summary: [string, string][] = [
    ["対象", month],
    ["お振込日", jpDate(d.paidOn)],
    ["お支払額", yen(d.amount)],
  ];
  for (const [k, v] of summary) {
    text(page, k, M, y, 10);
    text(page, v, M + 90, y, k === "お支払額" ? 13 : 10, k === "お支払額" ? f.bold : f.regular);
    y -= k === "お支払額" ? 22 : 16;
  }
  text(page, "振込手数料は当社が負担しています。源泉徴収はしていません。", M, y, 8.5);
  y -= 26;

  // 内訳
  const cols = [
    { label: "確定日", x: M, w: 74 },
    { label: "製品", x: M + 74, w: 70 },
    { label: "紹介先", x: M + 144, w: 96 },
    { label: "種類", x: M + 240, w: 94 },
    { label: "基礎額（税抜）", x: M + 334, w: 70, right: true },
    { label: "率", x: M + 404, w: 36, right: true },
    { label: "報酬額", x: M + 440, w: W - M - (M + 440), right: true },
  ];
  const header = () => {
    text(page, "内訳（報酬1件ずつ）", M, y, 10, f.bold);
    y -= 16;
    for (const c of cols) {
      if (c.right) right(page, c.label, c.x + c.w, y, 8.5, f.bold);
      else text(page, c.label, c.x, y, 8.5, f.bold);
    }
    y -= 6;
    line(page, y);
    y -= 13;
  };
  const clip = (s: string, w: number, size: number) => {
    let out = s;
    while (out && f.regular.widthOfTextAtSize(out, size) > w - 4) out = out.slice(0, -1);
    return out === s ? s : out.slice(0, -1) + "…";
  };
  header();
  for (const it of items) {
    if (y < M + 90) {
      page = doc.addPage([W, H]);
      y = H - M;
      header();
    }
    const vals = [it.date, it.product, it.company, it.kind, yen(it.base), it.rate, yen(it.amount)];
    cols.forEach((c, i) => {
      const v = clip(vals[i], c.w, 8.5);
      if (c.right) right(page, v, c.x + c.w, y, 8.5);
      else text(page, v, c.x, y, 8.5);
    });
    y -= 15;
  }
  line(page, y + 6);
  y -= 8;
  const total = items.reduce((s, i) => s + i.amount, 0);
  right(page, `合計　${yen(total)}`, W - M, y, 10.5, f.bold);
  y -= 18;

  if (isPurchaseStatement) {
    // 仕入明細書の記載事項：税率ごとの合計額と消費税額（報酬額は消費税込み・10%）
    const tax = Math.floor((total * 10) / 110);
    right(page, `10%対象　${yen(total)}（うち消費税 ${yen(tax)}）`, W - M, y, 9.5);
    y -= 26;
    text(page, "この書類は、消費税法上の仕入明細書を兼ねています。", M, y, 8.5);
    y -= 13;
    text(page, "送付後7日以内にご連絡がなければ、内容をご確認いただいたものとします。", M, y, 8.5);
    y -= 13;
  }

  return doc.save();
}

// PDFを作って保存し、payouts に保存先を記録する
export async function issueStatement(payoutId: string): Promise<string> {
  const { bytes, path: key } = await buildStatementPdf(payoutId);
  const { error } = await db().storage.from(STATEMENT_BUCKET)
    .upload(key, bytes, { contentType: "application/pdf", upsert: true });
  if (error) throw new Error(`支払通知書の保存に失敗しました: ${error.message}`);
  await db().from("payouts").update({ statement_pdf_path: key }).eq("id", payoutId);
  return key;
}
