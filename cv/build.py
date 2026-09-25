"""Genera cv/Luca-Franco-Mengarelli-CV.pdf a partir de cv/cv.html.

Requiere: pip install playwright && python -m playwright install chromium
Uso (desde la raíz del repo): python cv/build.py
"""
from pathlib import Path

from playwright.sync_api import sync_playwright

here = Path(__file__).resolve().parent
src = here / "cv.html"
out = here / "Luca-Franco-Mengarelli-CV.pdf"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto(src.as_uri(), wait_until="networkidle")
    page.evaluate("document.fonts.ready")
    page.pdf(path=str(out), prefer_css_page_size=True, print_background=True)
    browser.close()

print(f"PDF generado: {out}")
