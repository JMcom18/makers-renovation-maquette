/* Makers Renovation : interactions de la maquette (sans dépendance) */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* En-tête : filet au défilement */
  var header = document.querySelector(".header");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* Menu mobile */
  var toggle = document.querySelector(".menu-toggle");
  var menu = document.getElementById("menu-mobile");
  if (toggle && menu) {
    var setMenu = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
      menu.classList.toggle("is-open", open);
      document.body.classList.toggle("menu-open", open);
      if (open) { var first = menu.querySelector("a"); if (first) first.focus(); }
    };
    toggle.addEventListener("click", function () { setMenu(toggle.getAttribute("aria-expanded") !== "true"); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") { setMenu(false); toggle.focus(); }
    });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  }

  /* Avant / après : curseur + choix de la pièce */
  document.querySelectorAll("[data-ba]").forEach(function (root) {
    var ba = root.querySelector(".ba");
    var range = root.querySelector('.ba input[type="range"]');
    var imgBefore = root.querySelector(".ba__before");
    var imgAfter = root.querySelector(".ba__after");
    var status = root.querySelector("[data-ba-status]");
    var setPos = function (v) {
      ba.style.setProperty("--pos", v + "%");
      range.setAttribute("aria-valuetext", "Avant " + v + " %, après " + (100 - v) + " %");
    };
    setPos(range.value);
    range.addEventListener("input", function () { setPos(range.value); });
    range.addEventListener("pointerdown", function () { ba.classList.add("is-dragging"); });
    window.addEventListener("pointerup", function () { ba.classList.remove("is-dragging"); });

    root.querySelectorAll("[data-room]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.getAttribute("aria-pressed") === "true") return;
        root.querySelectorAll("[data-room]").forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
        btn.setAttribute("aria-pressed", "true");
        var room = btn.getAttribute("data-room");
        var label = btn.textContent.trim().toLowerCase();
        var swap = function () {
          imgBefore.src = "img/colombes-" + room + "-avant.jpg";
          imgAfter.src = "img/colombes-" + room + "-apres.jpg";
          imgBefore.alt = "Colombes, " + label + " avant travaux";
          imgAfter.alt = "Colombes, " + label + " après travaux";
          range.value = 50; setPos(50);
          if (status) status.textContent = btn.textContent.trim() + " affiché";
        };
        if (reduce) { swap(); return; }
        ba.classList.add("is-swapping");
        setTimeout(function () {
          swap();
          imgAfter.decode().catch(function () {}).then(function () { ba.classList.remove("is-swapping"); });
        }, 180);
      });
    });
  });

  /* Rangées de boutons défilantes : fondu tant qu'il reste des boutons hors écran */
  document.querySelectorAll(".rooms").forEach(function (row) {
    var check = function () { row.classList.toggle("has-more", row.scrollLeft + row.clientWidth < row.scrollWidth - 4); };
    row.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    check();
  });

  /* Méthode : le trait de plan se remplit au fil du défilement */
  var stepsLists = document.querySelectorAll(".steps");
  if (stepsLists.length && !reduce) {
    var ticking = false;
    var update = function () {
      ticking = false;
      var mid = window.innerHeight * 0.62;
      stepsLists.forEach(function (list) {
        var r = list.getBoundingClientRect();
        var p = Math.min(1, Math.max(0, (mid - r.top) / r.height));
        list.style.setProperty("--fill", p.toFixed(3));
        list.querySelectorAll(".step").forEach(function (s) {
          var n = s.querySelector(".step__num").getBoundingClientRect();
          s.classList.toggle("is-reached", n.top + n.height / 2 < mid);
        });
      });
    };
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", update);
    update();
  } else {
    stepsLists.forEach(function (list) { list.querySelectorAll(".step").forEach(function (s) { s.classList.add("is-reached"); }); });
  }

  /* Réalisations : filtres */
  var filters = document.querySelector("[data-filters]");
  if (filters) {
    var projects = document.querySelectorAll("[data-cat]");
    filters.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-filter]");
      if (!btn) return;
      filters.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
      var f = btn.getAttribute("data-filter");
      projects.forEach(function (p) { p.hidden = f !== "tous" && p.getAttribute("data-cat").split(" ").indexOf(f) === -1; });
    });
  }

  /* Prise de rendez-vous : rappel ou visite */
  document.querySelectorAll("[data-rdv]").forEach(function (root) {
    var title = root.querySelector("[data-rdv-title]");
    root.querySelectorAll("button[data-mode]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        root.querySelectorAll("button[data-mode]").forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
        title.textContent = btn.getAttribute("data-mode") === "visite"
          ? "Choisissez un créneau de visite sur place"
          : "Choisissez un créneau pour être rappelé";
      });
    });
    if (location.hash === "#visite") { var v = root.querySelector('[data-mode="visite"]'); if (v) v.click(); }
  });

  /* Formulaire de devis : maquette, aucun envoi réel */
  var form = document.querySelector("[data-devis-form]");
  if (form) {
    var params = new URLSearchParams(location.search);
    var type = params.get("type");
    if (type) { var sel = form.querySelector("#type"); if (sel && sel.querySelector('option[value="' + type + '"]')) sel.value = type; }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true, firstBad = null;
      form.querySelectorAll("[required]").forEach(function (input) {
        var field = input.closest(".field");
        var bad = !input.value.trim() || (input.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) ||
          (input.type === "tel" && input.value.replace(/\D/g, "").length < 10) ||
          (input.id === "cp" && !/^\d{5}$/.test(input.value.trim()));
        field.classList.toggle("has-error", bad);
        input.setAttribute("aria-invalid", String(bad));
        if (bad) { ok = false; if (!firstBad) firstBad = input; }
      });
      if (!ok) { firstBad.focus(); return; }
      var done = document.querySelector("[data-form-done]");
      form.hidden = true;
      done.classList.add("is-visible");
      done.setAttribute("tabindex", "-1");
      done.focus();
    });
    var photos = form.querySelector("#photos");
    var photosText = form.querySelector("[data-photos-text]");
    if (photos && photosText) {
      photos.addEventListener("change", function () {
        var n = photos.files.length;
        photosText.textContent = n ? n + (n > 1 ? " photos ajoutées" : " photo ajoutée") : "Ajouter des photos du chantier";
      });
    }
    form.addEventListener("input", function (e) {
      var field = e.target.closest(".field");
      if (field && field.classList.contains("has-error")) { field.classList.remove("has-error"); e.target.setAttribute("aria-invalid", "false"); }
    });
  }
})();
