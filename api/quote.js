// POST /api/quote — saves a quote request to Neon and emails it to RECEIVER_EMAIL.
import { neon } from "@neondatabase/serverless";
import nodemailer from "nodemailer";

const PAGES = ["en", "fr", "nl", "de"];
const ORIGINS = ["uk", "ie", "eu", "other"];
const MOVING = ["moving", "resident", "unsure"];
const LIGHTS = ["unsure", "halogen", "xenon", "ok"];

function text(v, max) {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}
function pick(v, allowed) {
  return allowed.includes(v) ? v : null;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? safeJson(req.body) : req.body || {};

  // Honeypot: real visitors never fill this hidden field.
  if (text(body.website, 200)) return res.status(200).json({ ok: true });

  const q = {
    page: pick(body.page, PAGES) || "en",
    name: text(body.name, 120),
    phone: text(body.phone, 40),
    email: text(body.email, 200),
    town: text(body.town, 120),
    car: text(body.car, 200),
    origin: pick(body.origin, ORIGINS),
    co2: Number.isInteger(Number(body.co2)) && Number(body.co2) > 0 && Number(body.co2) < 1000 ? Number(body.co2) : null,
    moving: pick(body.moving, MOVING),
    lights: pick(body.lights, LIGHTS),
    collect: body.collect !== false,
    notes: text(body.notes, 2000),
    message: text(body.message, 5000)
  };

  const missing = ["name", "phone", "town", "car"].filter((k) => !q[k]);
  if (missing.length) return res.status(400).json({ ok: false, error: "Missing: " + missing.join(", ") });
  if (q.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q.email)) {
    return res.status(400).json({ ok: false, error: "Invalid email" });
  }

  let id;
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      INSERT INTO quote_requests (page, name, phone, email, town, car, origin, co2, moving, lights, collect, notes, message)
      VALUES (${q.page}, ${q.name}, ${q.phone}, ${q.email || null}, ${q.town}, ${q.car}, ${q.origin}, ${q.co2},
              ${q.moving}, ${q.lights}, ${q.collect}, ${q.notes || null}, ${q.message || null})
      RETURNING id`;
    id = rows[0].id;
  } catch (err) {
    console.error("DB insert failed:", err);
    return res.status(500).json({ ok: false, error: "Could not save your request" });
  }

  // The request is saved; an email failure shouldn't fail the visitor's submission.
  let emailSent = false;
  try {
    await sendEmail(id, q);
    emailSent = true;
    const sql = neon(process.env.DATABASE_URL);
    await sql`UPDATE quote_requests SET email_sent = true WHERE id = ${id}`;
  } catch (err) {
    console.error("Email failed for request", id, err);
  }

  return res.status(200).json({ ok: true, id: String(id), emailSent });
}

function safeJson(s) {
  try { return JSON.parse(s); } catch { return {}; }
}

const LABELS = {
  origin: { uk: "United Kingdom", ie: "Ireland", eu: "Another EU country", other: "Outside the EU" },
  moving: { moving: "Moving to Spain with this car", resident: "Already living in Spain", unsure: "Not sure" },
  lights: { unsure: "Not sure", halogen: "Halogen", xenon: "Xenon or LED", ok: "Already set for the right" },
  page: { en: "English", fr: "French", nl: "Dutch", de: "German" }
};

// Site theme (assets/site.css)
const C = {
  paper: "#F2F4F8", surface: "#FFFFFF", ink: "#0F1726", muted: "#4B5567", rule: "#D5DBE5",
  blue: "#1B3C9C", blueSoft: "#E4EAF8", yellow: "#F6CA16", good: "#16774A", plate: "#FBFBF8", plateInk: "#0A0A0A"
};
const DISPLAY = "'Barlow Condensed','Arial Narrow','Roboto Condensed',Arial,sans-serif";
const BODY = "'Barlow','Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "'IBM Plex Mono',Menlo,Consolas,monospace";

function button(href, label, bg, color) {
  return `<td style="padding:0 8px 8px 0"><a href="${escapeHtml(href)}" style="display:inline-block;padding:11px 18px;border-radius:8px;background:${bg};color:${color};font-family:${BODY};font-size:14px;font-weight:600;text-decoration:none">${escapeHtml(label)}</a></td>`;
}

export function renderEmail(id, q) {
  const e = escapeHtml;
  const digits = q.phone.replace(/\D/g, "");
  const received = new Date().toLocaleString("en-GB", { timeZone: "Europe/Madrid", dateStyle: "medium", timeStyle: "short" });

  const details = [
    ["Registered in", LABELS.origin[q.origin]],
    ["CO₂", q.co2 ? q.co2 + " g/km" : null],
    ["Situation", LABELS.moving[q.moving]],
    ["Headlights", q.origin === "eu" ? null : LABELS.lights[q.lights]],
    ["Collection & return", q.collect ? "Yes, collect the car" : "No, customer drops it off"],
    ["Town", q.town],
    ["Sent from", (LABELS.page[q.page] || q.page) + " page"]
  ].filter(([, v]) => v);

  const rows = details.map(([k, v], i) => `
    <tr>
      <td style="padding:11px 0;${i ? `border-top:1px solid ${C.rule};` : ""}font-family:${BODY};font-size:14px;color:${C.muted};width:42%">${e(k)}</td>
      <td style="padding:11px 0;${i ? `border-top:1px solid ${C.rule};` : ""}font-family:${BODY};font-size:15px;color:${C.ink};font-weight:600">${e(v)}</td>
    </tr>`).join("");

  const buttons = [
    digits && button(`https://wa.me/${digits}`, "WhatsApp", C.good, "#FFFFFF"),
    q.email && button(`mailto:${q.email}?subject=${encodeURIComponent("Your Replate Barcelona quote: " + q.car)}`, "Reply by email", C.blue, "#FFFFFF"),
    digits && button(`tel:+${digits}`, "Call", C.blueSoft, C.blue)
  ].filter(Boolean).join("");

  const notes = q.notes ? `
    <tr><td style="padding:0 28px 24px">
      <div style="font-family:${DISPLAY};font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${C.muted};padding-bottom:8px">Notes from the customer</div>
      <div style="background:${C.paper};border-left:4px solid ${C.yellow};border-radius:6px;padding:14px 16px;font-family:${BODY};font-size:15px;line-height:1.5;color:${C.ink};white-space:pre-wrap">${e(q.notes)}</div>
    </td></tr>` : "";

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Quote request #${e(id)}</title></head>
<body style="margin:0;padding:0;background:${C.paper}">
<div style="display:none;max-height:0;overflow:hidden">${e(q.name)} · ${e(q.car)} · ${e(q.town)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper}">
<tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">

    <!-- Brand -->
    <tr><td style="padding:0 4px 16px">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:34px;height:22px;border:2px solid ${C.plateInk};border-radius:4px;background:${C.plate};padding:0">
          <table role="presentation" cellpadding="0" cellspacing="0" height="22"><tr><td style="width:9px;background:${C.blue};border-radius:2px 0 0 2px"></td><td style="width:25px"></td></tr></table>
        </td>
        <td style="padding-left:10px;font-family:${DISPLAY};font-size:22px;font-weight:700;color:${C.ink}">Replate <span style="font-weight:500;color:${C.muted}">Barcelona</span></td>
      </tr></table>
    </td></tr>

    <!-- Card -->
    <tr><td style="background:${C.surface};border:1px solid ${C.rule};border-radius:14px;overflow:hidden">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="height:6px;background:${C.blue};font-size:0;line-height:0">&nbsp;</td></tr>
        <tr><td style="padding:26px 28px 6px">
          <div style="font-family:${DISPLAY};font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${C.blue}">New quote request</div>
          <div style="font-family:${DISPLAY};font-size:32px;line-height:1.1;font-weight:700;color:${C.ink};padding-top:6px">${e(q.car)}</div>
          <div style="font-family:${BODY};font-size:14px;color:${C.muted};padding-top:6px">${e(received)} · Madrid time</div>
        </td></tr>

        <!-- Plate with request number -->
        <tr><td style="padding:16px 28px 4px">
          <table role="presentation" cellpadding="0" cellspacing="0" style="border:2px solid ${C.plateInk};border-radius:6px;background:${C.yellow}">
            <tr>
              <td style="background:${C.blue};padding:6px 8px;font-family:${BODY};font-size:11px;font-weight:700;color:${C.yellow};text-align:center;border-radius:3px 0 0 3px">★<br><span style="color:#FFFFFF">E</span></td>
              <td style="padding:6px 16px;font-family:${MONO};font-size:22px;font-weight:600;letter-spacing:.12em;color:${C.plateInk}">REQ ${e(String(id).padStart(4, "0"))}</td>
            </tr>
          </table>
        </td></tr>

        <!-- Customer -->
        <tr><td style="padding:20px 28px 8px">
          <div style="font-family:${DISPLAY};font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${C.muted};padding-bottom:8px">Customer</div>
          <div style="font-family:${BODY};font-size:20px;font-weight:600;color:${C.ink}">${e(q.name)}</div>
          <div style="font-family:${BODY};font-size:15px;color:${C.ink};padding-top:4px">${e(q.phone)}${q.email ? ` · <a href="mailto:${e(q.email)}" style="color:${C.blue}">${e(q.email)}</a>` : ""}</div>
        </td></tr>
        <tr><td style="padding:10px 28px 16px"><table role="presentation" cellpadding="0" cellspacing="0"><tr>${buttons}</tr></table></td></tr>

        <!-- Details -->
        <tr><td style="padding:0 28px 20px">
          <div style="font-family:${DISPLAY};font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${C.muted};padding-bottom:2px">The car</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
        </td></tr>
        ${notes}
      </table>
    </td></tr>

    <!-- Footer -->
    <tr><td style="padding:18px 8px 0;font-family:${BODY};font-size:13px;line-height:1.5;color:${C.muted};text-align:center">
      Sent by the quote form on <a href="https://replatebarcelona.com/" style="color:${C.blue}">replatebarcelona.com</a>.
      See every request on the <a href="https://replatebarcelona.com/admin/" style="color:${C.blue}">admin page</a>.
      ${q.email ? "<br>Hitting Reply goes straight to the customer." : ""}
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
}

async function sendEmail(id, q) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
  });

  const textLines = [
    `New quote request #${id}`,
    "",
    `Car: ${q.car}`,
    `Name: ${q.name}`,
    `Mobile/WhatsApp: ${q.phone}`,
    q.email && `Email: ${q.email}`,
    `Town: ${q.town}`,
    q.origin && `Registered in: ${LABELS.origin[q.origin]}`,
    q.co2 && `CO2: ${q.co2} g/km`,
    q.moving && `Situation: ${LABELS.moving[q.moving]}`,
    q.origin !== "eu" && q.lights && `Headlights: ${LABELS.lights[q.lights]}`,
    `Collection and return: ${q.collect ? "Yes" : "No"}`,
    `Page: ${LABELS.page[q.page] || q.page}`,
    q.notes && `\nNotes:\n${q.notes}`
  ].filter(Boolean);

  await transporter.sendMail({
    from: `"Replate Barcelona website" <${process.env.GMAIL_USER}>`,
    to: process.env.RECEIVER_EMAIL,
    replyTo: q.email || undefined,
    subject: `New quote request #${id}: ${q.car} · ${q.town}`,
    text: textLines.join("\n"),
    html: renderEmail(id, q)
  });
}
