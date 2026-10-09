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
