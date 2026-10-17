import iconv from "iconv-lite";

// 全銀協フォーマット（総合振込）。1レコード120バイト・Shift_JIS・CRLF。
// ヘッダー(1) → データ(2)×件数 → トレーラー(8) → エンド(9)

export type TransferSettings = {
  consignor_code?: string;      // 委託者コード（10桁）
  consignor_name?: string;      // 委託者名（カナ）
  bank_code?: string;           // 仕向銀行番号（4桁）
  bank_name?: string;           // 仕向銀行名（カナ）
  branch_code?: string;         // 仕向支店番号（3桁）
  branch_name?: string;         // 仕向支店名（カナ）
  account_type?: string;        // 1:普通 2:当座
  account_number?: string;      // 口座番号（7桁）
};

export type TransferRow = {
  bank_code: string;
  branch_code: string;
  account_type: "ordinary" | "checking";
  account_number: string;
  holder_kana: string;
  amount: number;
};

const FULL = "ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロワヲンヴー・";
const HALF = [
  "ｧ", "ｱ", "ｨ", "ｲ", "ｩ", "ｳ", "ｪ", "ｴ", "ｫ", "ｵ", "ｶ", "ｶﾞ", "ｷ", "ｷﾞ", "ｸ", "ｸﾞ", "ｹ", "ｹﾞ", "ｺ", "ｺﾞ",
  "ｻ", "ｻﾞ", "ｼ", "ｼﾞ", "ｽ", "ｽﾞ", "ｾ", "ｾﾞ", "ｿ", "ｿﾞ", "ﾀ", "ﾀﾞ", "ﾁ", "ﾁﾞ", "ｯ", "ﾂ", "ﾂﾞ", "ﾃ", "ﾃﾞ", "ﾄ", "ﾄﾞ",
  "ﾅ", "ﾆ", "ﾇ", "ﾈ", "ﾉ", "ﾊ", "ﾊﾞ", "ﾊﾟ", "ﾋ", "ﾋﾞ", "ﾋﾟ", "ﾌ", "ﾌﾞ", "ﾌﾟ", "ﾍ", "ﾍﾞ", "ﾍﾟ", "ﾎ", "ﾎﾞ", "ﾎﾟ",
  "ﾏ", "ﾐ", "ﾑ", "ﾒ", "ﾓ", "ｬ", "ﾔ", "ｭ", "ﾕ", "ｮ", "ﾖ", "ﾗ", "ﾘ", "ﾙ", "ﾚ", "ﾛ", "ﾜ", "ｦ", "ﾝ", "ｳﾞ", "ｰ", ".",
];

// 振込の受取人名に使える半角文字にそろえる（ひらがな→カタカナ→半角、小文字の拗音・促音は大文字に、英字は大文字）
export function toZenginKana(input: string): string {
  let s = input.normalize("NFKC"); // 全角英数→半角、半角カナ→全角カナ
  s = s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60)); // ひらがな→カタカナ
  s = s.replace(/[ァィゥェォッャュョ]/g, (c) => ({ ァ: "ア", ィ: "イ", ゥ: "ウ", ェ: "エ", ォ: "オ", ッ: "ツ", ャ: "ヤ", ュ: "ユ", ョ: "ヨ" })[c]!);
  s = s.replace(/[　]/g, " ").toUpperCase();
  let out = "";
  for (const ch of s) {
    const i = FULL.indexOf(ch);
    if (i >= 0) out += HALF[i];
    else if (/[0-9A-Z ()\-./,]/.test(ch)) out += ch;
    else if (ch === "（") out += "(";
    else if (ch === "）") out += ")";
    else if (ch === "－" || ch === "―" || ch === "‐") out += "-";
    // それ以外（漢字など）は使えないので落とす
  }
  return out.replace(/\s+/g, " ").trim();
}

function num(v: string | number, len: number): string {
  const s = String(v ?? "").replace(/\D/g, "");
  if (s.length > len) throw new Error(`桁数が多すぎます（${len}桁まで）: ${s}`);
  return s.padStart(len, "0");
}

function txt(v: string, len: number): string {
  // 半角カナ・英数は1バイト。長いものは切る
  const s = toZenginKana(v ?? "");
  return (s.length > len ? s.slice(0, len) : s).padEnd(len, " ");
}

export function settingsComplete(s: TransferSettings | null | undefined): s is Required<TransferSettings> {
  return !!s && /^\d{10}$/.test(s.consignor_code ?? "") && !!s.consignor_name
    && /^\d{4}$/.test(s.bank_code ?? "") && /^\d{3}$/.test(s.branch_code ?? "")
    && /^[12]$/.test(s.account_type ?? "") && /^\d{7}$/.test(s.account_number ?? "");
}

export function buildZengin(settings: Required<TransferSettings>, transferDate: Date, rows: TransferRow[]): Buffer {
  const jst = new Date(transferDate.getTime() + 9 * 3600 * 1000);
  const mmdd = `${String(jst.getUTCMonth() + 1).padStart(2, "0")}${String(jst.getUTCDate()).padStart(2, "0")}`;
  const records: string[] = [];

  records.push([
    "1", "21", "0",
    num(settings.consignor_code, 10),
    txt(settings.consignor_name, 40),
    mmdd,
    num(settings.bank_code, 4),
    txt(settings.bank_name ?? "", 15),
    num(settings.branch_code, 3),
    txt(settings.branch_name ?? "", 15),
    num(settings.account_type, 1),
    num(settings.account_number, 7),
    " ".repeat(17),
  ].join(""));

  let total = 0;
  for (const r of rows) {
    total += r.amount;
    records.push([
      "2",
      num(r.bank_code, 4),
      " ".repeat(15),            // 被仕向銀行名（任意）
      num(r.branch_code, 3),
      " ".repeat(15),            // 被仕向支店名（任意）
      "0000",                    // 手形交換所番号
      r.account_type === "checking" ? "2" : "1",
      num(r.account_number, 7),
      txt(r.holder_kana, 30),
      num(r.amount, 10),
      "0",                       // 新規コード
      " ".repeat(10),            // 顧客コード1
      " ".repeat(10),            // 顧客コード2
      " ",                       // 振込指定区分
      " ",                       // 識別表示
      " ".repeat(7),
    ].join(""));
  }

  records.push(["8", num(rows.length, 6), num(total, 12), " ".repeat(101)].join(""));
  records.push(["9", " ".repeat(119)].join(""));

  for (const rec of records) {
    const len = iconv.encode(rec, "Shift_JIS").length;
    if (len !== 120) throw new Error(`全銀データの長さが120バイトになりません（${len}）`);
  }
  return iconv.encode(records.join("\r\n") + "\r\n", "Shift_JIS");
}
