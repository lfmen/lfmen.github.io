// La barra superior es transparente sobre la imagen y pasa a vidrio claro al empezar a bajar.
(function () {
  "use strict";
  var top = document.querySelector(".top");
  var hero = document.querySelector(".hero");
  if (top && hero && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      top.classList.toggle("solid", es[0].intersectionRatio < 0.9);
    }, { threshold: [0, 0.9, 1] }).observe(hero);
  } else if (top) { top.classList.add("solid"); }
})();

// Aparicion suave: los bloques entran de a poco al llegar a la pantalla (una sola vez).
(function () {
  "use strict";
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  var groups = [
    [".sec-title, .sec-lead", 0.05],
    [".pcard", 0.12],
    [".proj figcaption", 0.12],
    [".stat", 0.08],
    [".cv-block", 0],
    [".contact-mail", 0],
    [".foot-top, .foot-bottom, .foot-stage", 0.1]
  ];
  var els = [];
  groups.forEach(function (g) {
    document.querySelectorAll(g[0]).forEach(function (el, i) {
      el.classList.add("rv");
      el.style.setProperty("--d", (i * g[1]).toFixed(2) + "s");
      els.push(el);
    });
  });
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
    // lo que ya quedo por encima de la pantalla (saltos de ancla, scroll rapido) aparece sin animar
    els.forEach(function (el) {
      if (!el.classList.contains("in") && el.getBoundingClientRect().bottom < 0) { el.classList.add("in"); io.unobserve(el); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  els.forEach(function (el) { io.observe(el); });
})();

// Sin seleccion ni copia de texto (copiar, cortar, arrastrar y seleccionar quedan bloqueados).
(function () {
  "use strict";
  ["copy", "cut", "selectstart", "dragstart"].forEach(function (ev) {
    document.addEventListener(ev, function (e) { e.preventDefault(); });
  });
})();
