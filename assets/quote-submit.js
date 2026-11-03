// Sends a quote request to /api/quote and updates the "ready" panel with the result.
// Used by index.html and assets/eu.js. If sending fails, the panel keeps its
// WhatsApp / email / copy buttons so the visitor can still reach us.
(function () {
  var TEXT = {
    en: { sending: "Sending your request…", title: "Thanks, we’ve got your request", body: "We’ll reply with your fixed quote within one working day. You can also send it to us on WhatsApp if you prefer.", failed: "We couldn’t send it automatically. Please send it on WhatsApp or by email below.", toastOk: "Email sent", toastSaved: "Request saved", toastFail: "Not sent", close: "Close" },
    fr: { sending: "Envoi de votre demande…", title: "Merci, nous avons bien reçu votre demande", body: "Nous vous répondrons avec votre devis fixe sous un jour ouvré. Vous pouvez aussi nous l’envoyer par WhatsApp si vous préférez.", failed: "L’envoi automatique n’a pas fonctionné. Envoyez-la par WhatsApp ou par e-mail ci-dessous.", toastOk: "E-mail envoyé", toastSaved: "Demande enregistrée", toastFail: "Non envoyée", close: "Fermer" },
    nl: { sending: "Uw aanvraag wordt verzonden…", title: "Bedankt, we hebben uw aanvraag ontvangen", body: "We sturen u binnen één werkdag uw vaste offerte. U kunt hem ook via WhatsApp sturen als u dat liever doet.", failed: "Automatisch verzenden is niet gelukt. Stuur hem via WhatsApp of e-mail hieronder.", toastOk: "E-mail verzonden", toastSaved: "Aanvraag opgeslagen", toastFail: "Niet verzonden", close: "Sluiten" },
    de: { sending: "Ihre Anfrage wird gesendet…", title: "Danke, wir haben Ihre Anfrage erhalten", body: "Wir melden uns innerhalb eines Werktags mit Ihrem Festpreisangebot. Sie können sie uns auch per WhatsApp schicken.", failed: "Das automatische Senden hat nicht geklappt. Bitte schicken Sie sie per WhatsApp oder E-Mail unten.", toastOk: "E-Mail gesendet", toastSaved: "Anfrage gespeichert", toastFail: "Nicht gesendet", close: "Schließen" }
  };

  var page = (document.documentElement.lang || "en").slice(0, 2);
  var T = TEXT[page] || TEXT.en;
  var sending = false;

  // ---- Toast ----
  var toastEl, toastTimer;
  function toast(ok, title, text) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.innerHTML = '<span class="toast__icon" aria-hidden="true"></span><span class="toast__body"><strong class="toast__title"></strong><span class="toast__text"></span></span><button type="button" class="toast__close">&times;</button>';
      var close = toastEl.querySelector(".toast__close");
      close.setAttribute("aria-label", T.close);
      close.addEventListener("click", hideToast);
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") hideToast(); });
      document.body.appendChild(toastEl);
    }
    toastEl.classList.toggle("toast--error", !ok);
    toastEl.setAttribute("role", ok ? "status" : "alert");
    toastEl.querySelector(".toast__icon").textContent = ok ? "✓" : "!";
    toastEl.querySelector(".toast__title").textContent = title;
    toastEl.querySelector(".toast__text").textContent = text;
    void toastEl.offsetWidth;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, ok ? 6000 : 10000);
  }
  function hideToast() {
    clearTimeout(toastTimer);
    if (toastEl) toastEl.classList.remove("show");
  }

  window.replateSendQuote = function (data) {
    var panel = document.getElementById("q-ready");
    var h = panel.querySelector("h3");
    var p = panel.querySelector("h3 + p");
    if (!h.dataset.orig) { h.dataset.orig = h.textContent; p.dataset.orig = p.textContent; }

    var status = document.getElementById("q-status");
    if (!status) {
      status = document.createElement("p");
      status.id = "q-status";
      status.className = "hint";
      status.setAttribute("role", "status");
      panel.insertBefore(status, h);
    }

    var button = document.querySelector('#quote-form button[type="submit"]');
    if (sending) return;
    sending = true;
    button.disabled = true;
    h.textContent = h.dataset.orig;
    p.textContent = p.dataset.orig;
    status.textContent = T.sending;
    status.hidden = false;

    var honeypot = document.getElementById("q-website");
    data.page = page;
    data.website = honeypot ? honeypot.value : "";

    fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.ok) throw new Error(j.error || r.status); return j; }); })
      .then(function (j) {
        status.hidden = true;
        h.textContent = T.title;
        p.textContent = T.body;
        toast(true, j.emailSent ? T.toastOk : T.toastSaved, T.title);
      })
      .catch(function () {
        status.textContent = T.failed;
        toast(false, T.toastFail, T.failed);
      })
      .then(function () {
        sending = false;
        button.disabled = false;
      });
  };
})();
