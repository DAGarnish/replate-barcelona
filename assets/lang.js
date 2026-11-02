// Remember a language the visitor picks, so the country redirect on "/" (vercel.json) stops applying to them.
document.querySelectorAll("[data-lang]").forEach(function (a) {
  a.addEventListener("click", function () {
    document.cookie = "lang=" + a.getAttribute("data-lang") + "; path=/; max-age=31536000; samesite=lax";
  });
});
