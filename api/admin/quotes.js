// GET /api/admin/quotes — lists quote requests. Requires "Authorization: Bearer <ADMIN_PASSWORD>".
import { timingSafeEqual, createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";

function passwordOk(given) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof given !== "string") return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!passwordOk(token)) return res.status(401).json({ ok: false, error: "Wrong password" });

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      SELECT id, created_at, page, name, phone, email, town, car, origin, co2, moving, lights, collect, notes, email_sent
      FROM quote_requests ORDER BY created_at DESC LIMIT 500`;
    return res.status(200).json({ ok: true, rows });
  } catch (err) {
    console.error("Admin list failed:", err);
    return res.status(500).json({ ok: false, error: "Database error" });
  }
}
