# Luca Franco Mengarelli - Portfolio y CV

Sitio personal de una sola pagina (`index.html`, sin dependencias), con modo claro y oscuro.

- `cv/`: CV en PDF de una pagina, apto ATS. La fuente es `cv/cv.html`; para regenerar el PDF:
  `pip install playwright && python -m playwright install chromium`, luego `python cv/build.py`.
  Usa la fuente Inter (SIL Open Font License) incluida en `cv/fonts/`.
- `certificados/`: certificados enlazados desde el CV de la web.

El portfolio anterior esta en la rama [`portfolio-viejo`](../../tree/portfolio-viejo).
