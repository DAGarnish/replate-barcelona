Replate Barcelona website

Files
  index.html         the main page (English, for UK, Irish and other cars)
  fr/ nl/ de/        French, Dutch and German pages for EU-plated cars (no customs or headlights)
  assets/site.css    styles shared by every page
  assets/eu.js       estimator and quote form for the fr/nl/de pages
  assets/lang.js     remembers a language the visitor picks
  vercel.json        sends visitors in France, the Netherlands and Germany from / to their page
  favicon.svg        the browser tab icon

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

Deploy on Vercel
  Go to vercel.com/drop and drop this zip (or the unzipped folder).
  Without an account the deployment expires, so claim the project to keep it,
  then add your own domain under the project's Settings > Domains.
