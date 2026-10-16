import { db, operatorId } from "@/lib/db";
import { clientIp, sendLoginLink } from "@/lib/auth";
import { readBody, respond, withParam } from "@/lib/http";

export async function POST(req: Request) {
  const b = await readBody(req);
  const email = (b.email ?? "").toLowerCase();

  if (email) {
    const op = await operatorId();
    const { data: p } = await db().from("partners")
      .select("id, status").eq("operator_id", op).eq("email", email).maybeSingle();
    if (p && p.status === "active") await sendLoginLink(p.id, email, await clientIp());
  }
  // 応答は登録の有無にかかわらず同じ
  return respond(req, withParam("/login/", "sent", "1"), { ok: true });
}
