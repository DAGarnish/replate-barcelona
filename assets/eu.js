// Shared script for the French, Dutch and German pages (EU-plated cars: no customs, no headlights).
// Each page sets window.REPLATE_PAGE with its locale and text before loading this file.
(function () {
  // ---- Keep these in step with CONFIG in /index.html ----
  var CONFIG = {
    brand: "Replate Barcelona",
    whatsappNumber: "34600000000",       // WhatsApp number, international format, digits only
    whatsappDisplay: "+34 600 000 000",  // how the number appears on the page
    email: "hola@replate.example",       // business email
    serviceFee: 250,                     // fixed fee in euros, before IVA (EU cars; the UK page has its own)
    collectionFee: 150,                  // collection and return in euros, before IVA
    iva: 0.21
  };

  var P = window.REPLATE_PAGE;
  var T = P.text;
  function $(id) { return document.getElementById(id); }
  var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var eur = new Intl.NumberFormat(P.locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  function money(n) { return eur.format(Math.round(n)); }
  function span(lo, hi) { return Math.round(lo) === Math.round(hi) ? money(lo) : money(lo) + "–" + money(hi); }
  var pctFmt = new Intl.NumberFormat(P.locale, { style: "percent", maximumFractionDigits: 2 });
  function pct(r) { return pctFmt.format(r); }
  function fill(tpl, v) { return tpl.replace("{n}", v); }

  // Contact details and fees from CONFIG
  var binds = {
    whatsappDisplay: CONFIG.whatsappDisplay,
    email: CONFIG.email,
    feeText: fill(T.plusIva, money(CONFIG.serviceFee)),
    collectText: fill(T.plusIva, money(CONFIG.collectionFee))
  };
  document.querySelectorAll("[data-bind]").forEach(function (el) {
    var v = binds[el.getAttribute("data-bind")];
    if (v != null) el.textContent = v;
  });
  document.querySelectorAll("[data-link]").forEach(function (el) {
    var kind = el.getAttribute("data-link");
    if (kind === "whatsapp") el.href = "https://wa.me/" + CONFIG.whatsappNumber;
    if (kind === "email") el.href = "mailto:" + CONFIG.email;
  });

  // ---- Estimator ----
  function iedmtRate(co2) {
    if (co2 <= 120) return 0;
    if (co2 < 160) return 0.0475;
    if (co2 < 200) return 0.0975;
    return 0.16;
  }
  function num(id, max) {
    var v = parseFloat($(id).value);
    return isFinite(v) && v > 0 ? Math.min(v, max) : 0;
  }
  function readEstimator() {
    return {
      moving: $("est-moving").value,
      co2: num("est-co2", 999),
      co2Given: $("est-co2").value.trim() !== "",
      value: num("est-value", 5000000),
      collect: $("est-collect").checked
    };
  }

  function estimate(s) {
    var R = T.rows;
    var rows = [];
    var iva = 1 + CONFIG.iva;
    function add(label, lo, hi, note) { rows.push({ label: label, lo: lo, hi: hi, note: note || "" }); }

    add(R.fee, CONFIG.serviceFee * iva, CONFIG.serviceFee * iva, R.incIva);
    if (s.collect) add(R.collect, CONFIG.collectionFee * iva, CONFIG.collectionFee * iva, R.incIva);
    add(R.itv, 96, 120);
    add(R.dgt, 99.77, 99.77, "tasa 1.1");
    add(R.plates, 30, 50);
    add(R.docs, 80, 250, R.docsNote);

    var rate = iedmtRate(s.co2);
    var tax = s.value * rate;
    if (!s.co2Given) add(R.iedmt, 0, s.value * 0.16, R.iedmtNoCo2);
    else if (rate === 0) add(R.iedmt, 0, 0, R.iedmtZero);
    else if (s.moving === "yes") add(R.iedmt, 0, 0, fill(R.iedmtExempt, money(tax)));
    else add(R.iedmt, tax, tax, fill(R.iedmtRate, pct(rate)));

    add(R.roadTax, 25, 250, R.roadTaxNote);

    var lo = 0, hi = 0;
    rows.forEach(function (r) { lo += r.lo; hi += r.hi; });
    return { rows: rows, lo: lo, hi: hi };
  }

  function renderEstimate() {
    var result = estimate(readEstimator());
    var tbody = $("est-body");
    tbody.textContent = "";
    result.rows.forEach(function (r) {
      var tr = document.createElement("tr");
      var td1 = document.createElement("td");
      td1.textContent = r.label;
      if (r.note) {
        var n = document.createElement("span");
        n.className = "note";
        n.textContent = r.note;
        td1.appendChild(n);
      }
      var td2 = document.createElement("td");
      td2.textContent = span(r.lo, r.hi);
      tr.appendChild(td1);
      tr.appendChild(td2);
      tbody.appendChild(tr);
    });
    $("est-total").textContent = span(result.lo, result.hi);
  }

  ["est-moving", "est-co2", "est-value", "est-collect"].forEach(function (id) {
    $(id).addEventListener("input", renderEstimate);
    $(id).addEventListener("change", renderEstimate);
  });
  $("est-form").addEventListener("submit", function (e) { e.preventDefault(); });
  renderEstimate();

  // Copy estimator choices into the quote form
  $("est-send").addEventListener("click", function () {
    var s = readEstimator();
    if (s.co2Given) $("q-co2").value = Math.round(s.co2);
    $("q-moving").value = s.moving === "yes" ? "moving" : "resident";
    $("q-collect").checked = s.collect;
    $("quote").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    setTimeout(function () { $("q-name").focus({ preventScroll: true }); }, reduceMotion ? 0 : 500);
  });

  // ---- Quote request (the message itself stays in English for our team) ----
  var MOVING = { moving: "Moving to Spain with this car", resident: "Already living in Spain", unsure: "Not sure" };
  var REQUIRED = [
    ["q-name", T.required.name],
    ["q-phone", T.required.phone],
    ["q-town", T.required.town],
    ["q-car", T.required.car]
  ];
  function val(id) { return $(id).value.trim(); }
  function joinList(a) { return a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " " + T.and + " " + a[a.length - 1]; }

  function buildMessage() {
    var lines = ["Hi " + CONFIG.brand + ", I’d like a fixed quote to put my car on Spanish plates. (Sent from the " + P.pageName + " page.)", ""];
    lines.push("Name: " + val("q-name"));
    lines.push("Mobile/WhatsApp: " + val("q-phone"));
    if (val("q-email")) lines.push("Email: " + val("q-email"));
    lines.push("Car: " + val("q-car"));
    lines.push("Registered in: " + P.countryEn);
    if (val("q-co2")) lines.push("CO2: " + val("q-co2") + " g/km");
    lines.push("Situation: " + MOVING[$("q-moving").value]);
    lines.push("Town: " + val("q-town"));
    lines.push("Collection and return: " + ($("q-collect").checked ? "Yes please" : "No, I’ll drop it off"));
    if (val("q-notes")) lines.push("Notes: " + val("q-notes"));
    lines.push("", "I’ll send a photo of my registration certificate next.");
    return lines.join("\n");
  }

  $("quote-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var err = $("q-error");
    REQUIRED.forEach(function (r) { $(r[0]).removeAttribute("aria-invalid"); });
    $("q-email").removeAttribute("aria-invalid");

    var missing = REQUIRED.filter(function (r) { return !val(r[0]); });
    var email = val("q-email");
    var badEmail = email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (missing.length || badEmail) {
      var text = "";
      if (missing.length) {
        missing.forEach(function (r) { $(r[0]).setAttribute("aria-invalid", "true"); });
        text = T.pleaseAdd.replace("{list}", joinList(missing.map(function (r) { return r[1]; })));
      }
      if (badEmail) {
        $("q-email").setAttribute("aria-invalid", "true");
        text += (text ? " " : "") + T.badEmail;
      }
      err.textContent = text;
      err.hidden = false;
      $("q-ready").hidden = true;
      $(missing.length ? missing[0][0] : "q-email").focus();
      return;
    }

    err.hidden = true;
    var msg = buildMessage();
    $("q-preview").value = msg;
    $("q-wa").href = "https://wa.me/" + CONFIG.whatsappNumber + "?text=" + encodeURIComponent(msg);
    $("q-mail").href = "mailto:" + CONFIG.email + "?subject=" + encodeURIComponent("Quote request (" + P.countryEn + "): " + val("q-car")) + "&body=" + encodeURIComponent(msg);
    $("q-copied").hidden = true;
    $("q-ready").hidden = false;
    $("q-ready").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
  });

  $("q-copy").addEventListener("click", function () {
    var ta = $("q-preview");
    var note = $("q-copied");
    function fallback() {
      ta.focus();
      ta.select();
      note.textContent = T.copyFallback;
      note.hidden = false;
    }
    try {
      navigator.clipboard.writeText(ta.value).then(function () {
        note.textContent = T.copied;
        note.hidden = false;
      }, fallback);
    } catch (_) { fallback(); }
  });

  // ---- Back to top ----
  var b = $("toTop");
  function t() { b.classList.toggle("show", window.scrollY > 600); }
  window.addEventListener("scroll", t, { passive: true });
  t();
  b.addEventListener("click", function () { window.scrollTo({ top: 0 }); });
})();
