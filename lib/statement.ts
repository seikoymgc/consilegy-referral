import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { db } from "./db";
import { formatYen, messages, toLocale, type Locale } from "./i18n";
import { displayCompany } from "./referrals";

// 支払通知書PDF。振込済みを記録したときに作り、Supabase Storage（非公開の statements バケット）に7年保存する。
// インボイス登録番号のある紹介者の分は仕入明細書の形にする（設計書「報酬の計算と支払い」）。
// 紹介者の言語（日本語・英語）で作る。英語の仕入明細書には「仕入明細書」の語を併記する。

export const STATEMENT_BUCKET = "statements";

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

// 日付（日本時間）：ja「2026年10月21日」／en「October 21, 2026」
// short は内訳の表の欄に入る長さ（en「Sep 15, 2026」）
function docDate(iso: string | null | undefined, locale: Locale = "ja", short = false) {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  if (locale === "en") {
    return d.toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: short ? "short" : "long", day: "numeric" });
  }
  return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日`;
}

// 支払日（"2026-10-31" の形）は日本の暦日として扱う
function paidDate(v: string | null | undefined, locale: Locale) {
  if (!v) return "";
  return docDate(/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T00:00:00+09:00` : v, locale);
}

export async function buildStatementPdf(payoutId: string): Promise<{ bytes: Uint8Array; path: string }> {
  const { data: payout, error } = await db().from("payouts")
    .select("id, operator_id, partner_id, month, amount, paid_on, statement_number, invoice_number_snapshot, created_at, partners(name, company, locale), operators(name, company_info)")
    .eq("id", payoutId).single();
  if (error || !payout) throw new Error("支払いが見つかりません");

  const partner = payout.partners as unknown as { name: string; company: string | null; locale: string | null } | null;
  const locale = toLocale(partner?.locale);
  const t = messages(locale).statement;
  const operator = payout.operators as unknown as { name: string; company_info: CompanyInfo | null } | null;
  const company = operator?.company_info ?? {};

  const { data: rows } = await db().from("commissions")
    .select("kind, base_amount, rate, amount, status, confirmed_at, created_at, products(name), referrals(company_name)")
    .eq("payout_id", payout.id)
    .order("confirmed_at", { ascending: true });
  const items = (rows ?? []).map((c) => ({
    date: docDate(c.confirmed_at ?? c.created_at, locale, true),
    product: (c.products as unknown as { name: string } | null)?.name ?? "",
    company: displayCompany((c.referrals as unknown as { company_name: string } | null)?.company_name ?? "", locale),
    kind: t.kind[c.kind] ?? c.kind,
    base: c.base_amount as number,
    rate: c.rate == null ? "" : `${Math.round(Number(c.rate) * 1000) / 10}%`,
    amount: c.amount as number,
  }));

  const bytes = await renderStatementPdf({
    locale,
    statementNumber: payout.statement_number ?? "",
    partnerName: partner?.name ?? "",
    partnerCompany: partner?.company ?? null,
    invoiceNumber: (payout.invoice_number_snapshot ?? "").trim(),
    issuerName: issuerName(company.name ?? operator?.name ?? "Consilegy合同会社", locale),
    issuerAddress: company.address ?? "",
    month: payout.month,
    paidOn: payout.paid_on,
    amount: payout.amount,
    items,
  });
  return { bytes, path: `${payout.partner_id}/${payout.id}.pdf` };
}

// 英語の通知書では会社名に英語の表記を添える
function issuerName(name: string, locale: Locale) {
  return locale === "en" && name === "Consilegy合同会社" ? "Consilegy LLC (Consilegy合同会社)" : name;
}

export type StatementData = {
  locale?: Locale;
  statementNumber: string; partnerName: string; partnerCompany: string | null; invoiceNumber: string;
  issuerName: string; issuerAddress: string; month: string; paidOn: string | null; amount: number;
  items: { date: string; product: string; company: string; kind: string; base: number; rate: string; amount: number }[];
};

export async function renderStatementPdf(d: StatementData): Promise<Uint8Array> {
  const items = d.items;
  const locale = d.locale ?? "ja";
  const t = messages(locale).statement;
  const yen = (n: number) => formatYen(n, locale);
  const invoiceNo = d.invoiceNumber;
  const isPurchaseStatement = invoiceNo.length > 0;

  const doc = await PDFDocument.create();
  doc.setTitle(t.docTitle(d.statementNumber));
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
  const title = isPurchaseStatement ? t.titlePurchase : t.title;
  text(page, title, M, y - 8, 18, f.bold);
  // 英語の仕入明細書は、見出しの下に「仕入明細書」を添える
  if (isPurchaseStatement && t.subtitlePurchase) text(page, t.subtitlePurchase, M, y - 25, 10);
  right(page, `No. ${d.statementNumber}`, W - M, y, 9.5);
  right(page, t.issued(docDate(new Date().toISOString(), locale)), W - M, y - 14, 9.5);
  y -= 50;

  // 宛先
  const to = t.to(d.partnerName, d.partnerCompany);
  text(page, to, M, y, 12, f.bold);
  if (isPurchaseStatement) text(page, t.registration(invoiceNo), M, y - 16, 9.5);

  // 発行者
  let ry = y;
  right(page, d.issuerName, W - M, ry, 10.5, f.bold);
  if (d.issuerAddress) {
    ry -= 15;
    right(page, d.issuerAddress, W - M, ry, 8.5);
  }
  y -= 48;

  text(page, t.intro, M, y, 10);
  y -= 26;

  // 概要
  const month = t.month(d.month.slice(0, 7));
  const summary: [string, string, boolean][] = [
    [t.period, month, false],
    [t.paidOn, paidDate(d.paidOn, locale), false],
    [t.amount, yen(d.amount), true],
  ];
  for (const [k, v, strong] of summary) {
    text(page, k, M, y, 10);
    text(page, v, M + 90, y, strong ? 13 : 10, strong ? f.bold : f.regular);
    y -= strong ? 22 : 16;
  }
  text(page, t.feeNote, M, y, 8.5);
  y -= 26;

  // 内訳
  const cols = [
    { label: t.colDate, x: M, w: 74 },
    { label: t.colProduct, x: M + 74, w: 70 },
    { label: t.colCompany, x: M + 144, w: 96 },
    { label: t.colKind, x: M + 240, w: 94 },
    { label: t.colBase, x: M + 334, w: 70, right: true },
    { label: t.colRate, x: M + 404, w: 36, right: true },
    { label: t.colAmount, x: M + 440, w: W - M - (M + 440), right: true },
  ];
  const header = () => {
    text(page, t.breakdown, M, y, 10, f.bold);
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
  right(page, t.total(yen(total)), W - M, y, 10.5, f.bold);
  y -= 18;

  if (isPurchaseStatement) {
    // 仕入明細書の記載事項：税率ごとの合計額と消費税額（報酬額は消費税込み・10%）
    const tax = Math.floor((total * 10) / 110);
    right(page, t.tax(yen(total), yen(tax)), W - M, y, 9.5);
    y -= 26;
    text(page, t.purchaseNote1, M, y, 8.5);
    y -= 13;
    text(page, t.purchaseNote2, M, y, 8.5);
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
