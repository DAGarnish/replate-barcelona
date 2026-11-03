Replate Barcelona website

Files
  index.html         the main page (English, for UK, Irish and other cars)
  fr/ nl/ de/        French, Dutch and German pages for EU-plated cars (no customs or headlights)
  assets/site.css    styles shared by every page
  assets/eu.js       estimator and quote form for the fr/nl/de pages
  assets/lang.js     remembers a language the visitor picks
  vercel.json        country redirect, one URL per page (/fr/ not /fr or /fr/index.html; no global
                     trailingSlash, which would redirect /api/quote),
                     and the old vercel.app address redirected to the domain
  favicon.svg        the browser tab icon; apple-touch-icon.png is the phone home-screen icon
  assets/og/         share images (1200x630) shown when a page is posted on WhatsApp, LinkedIn etc.
  robots.txt         lets search engines crawl everything and points them to the sitemap
  sitemap.xml        the four pages, with their language versions

Country redirect
  Visitors whose IP is in FR, NL or DE are sent from / to /fr/, /nl/ or /de/.
  Everyone else (UK, Spain, anywhere) gets the main page. Clicking a language
  link sets a "lang" cookie, after which the redirect stops for that visitor.

Before going live
  Open index.html, search for "Edit these to go live" and set the values below.
  Set the same values in assets/eu.js (the fr/nl/de pages read theirs from there):
    whatsappNumber    your WhatsApp number, country code and digits only, e.g. 34612345678
    whatsappDisplay   the number as it should appear, e.g. +34 612 345 678
    email             your business email
    serviceFee        your fixed fee in euros before IVA
    collectionFee     collection and return in euros before IVA
  The placeholders (+34 600 000 000 and hola@replate.example) do not reach anyone.

SEO
  Each page's title, description, canonical, language links (hreflang), share
  tags and structured data (JSON-LD, including the FAQ) sit between
  <!-- seo:start --> and <!-- seo:end --> in its <head>.
  Full URLs use https://replatebarcelona.com. If the main domain changes, replace
  it in all four pages, sitemap.xml, robots.txt and vercel.json.

Deploy
  Hosted on Vercel (project replate-barcelona-site), deployed automatically on
  every push to main on GitHub. Live at https://replatebarcelona.com, with www
  redirecting to it (set in Vercel > Settings > Domains). DNS is at Cloudflare.

Quote form backend (Vercel functions + Neon)
  api/quote.js         POST /api/quote: saves the form to Neon and emails RECEIVER_EMAIL
  api/admin/quotes.js  GET /api/admin/quotes: lists requests (needs ADMIN_PASSWORD)
  admin/index.html     /admin: password-protected list of requests, with CSV download
  assets/quote-submit.js  sends the form from every page
  db/schema.sql        the quote_requests table (create it with: npm run db:setup)

  Environment variables (Vercel > Settings > Environment Variables, and .env.local locally):
    DATABASE_URL        Neon connection string
    GMAIL_USER          Gmail account that sends the notifications
    GMAIL_APP_PASSWORD  Google app password for that account
    RECEIVER_EMAIL      where notifications are delivered
    ADMIN_PASSWORD      password for /admin
  Never commit .env.local (it is in .gitignore).

  Run locally with the functions: npm run dev  (then open http://localhost:8000)
  python http.server only serves the static pages, so the form cannot send from it.
