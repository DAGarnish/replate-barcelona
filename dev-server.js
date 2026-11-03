// Local dev server: serves the static site and runs the api/ functions like Vercel does.
// Run with: npm run dev   (reads .env.local). Not used in production.
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT) || 8000;
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon" };

async function runApi(req, res, path) {
  let mod;
  try { mod = await import(join(ROOT, path + ".js") + "?t=" + Date.now()); }
  catch { res.writeHead(404); return res.end("Not found"); }

  let raw = "";
  for await (const chunk of req) raw += chunk;
  let body = raw;
  if ((req.headers["content-type"] || "").includes("application/json")) {
    try { body = JSON.parse(raw || "{}"); } catch { body = {}; }
  }

  const vres = {
    statusCode: 200,
    setHeader: (k, v) => res.setHeader(k, v),
    status(c) { this.statusCode = c; return this; },
    json(obj) { res.writeHead(this.statusCode, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); }
  };
  try { await mod.default({ method: req.method, headers: req.headers, body, url: req.url }, vres); }
  catch (err) { console.error(err); if (!res.headersSent) { res.writeHead(500); res.end("Server error"); } }
}

async function serveStatic(res, path) {
  let file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT) || /\/(\.env|node_modules|\.git)/.test(file)) { res.writeHead(403); return res.end(); }
  try { if ((await stat(file)).isDirectory()) file = join(file, "index.html"); }
  catch { res.writeHead(404); return res.end("Not found"); }
  try {
    const data = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch { res.writeHead(404); res.end("Not found"); }
}

http.createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  console.log(req.method, path);
  if (path.startsWith("/api/")) return runApi(req, res, path.replace(/\/$/, ""));
  return serveStatic(res, path);
}).listen(PORT, () => console.log(`Dev server on http://localhost:${PORT}`));
