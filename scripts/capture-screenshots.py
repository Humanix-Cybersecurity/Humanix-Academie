"""Capture screenshots desktop + mobile des 5 pages publiques.

- Desktop : 1440×900 (largeur de réf brand)
- Mobile  : 390×844 (iPhone 14)

Génère :
  public/screenshots/<page>-desktop.png
  public/screenshots/<page>-mobile.png

Pré-requis : playwright + chromium installés (déjà fait).
Le dev server doit tourner sur https://humanix.local.

Usage : python3 scripts/capture-screenshots.py
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "screenshots"
BASE_URL = "https://humanix.local"

PAGES = [
    ("home", "/"),
    ("audit-flash", "/audit-flash"),
    ("cyber-meteo", "/cyber-meteo"),
    ("observatoire-fuites", "/observatoire-fuites"),
    ("lancement-oss", "/lancement-oss"),
]

INIT = """
try { localStorage.setItem('humanix-cookie-notice-dismissed', '1'); } catch (e) {}
try { sessionStorage.setItem('humanix-mascot-dismissed', 'true'); } catch (e) {}
"""


def capture(browser, viewport, label):
    print(f"\n--- {label} ({viewport['width']}×{viewport['height']}) ---")
    ctx = browser.new_context(viewport=viewport, ignore_https_errors=True)
    ctx.add_init_script(INIT)
    page = ctx.new_page()
    for slug, path in PAGES:
        try:
            page.goto(BASE_URL + path, wait_until="domcontentloaded", timeout=15000)
            page.wait_for_timeout(2000)  # laisser anims se poser
            out = OUT / f"{slug}-{label}.png"
            page.screenshot(path=str(out), full_page=False)
            kb = out.stat().st_size // 1024
            print(f"  ✓ {slug:25s} → {out.name} ({kb} KB)")
        except Exception as e:
            print(f"  ✗ {slug}: {e}")
    ctx.close()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--ignore-certificate-errors", "--allow-insecure-localhost"],
        )
        # Précharge les routes (Next.js dev compile à la 1ère visite)
        warm = browser.new_context(viewport={"width": 1440, "height": 900}, ignore_https_errors=True)
        warm_page = warm.new_page()
        for _, path in PAGES:
            try:
                warm_page.goto(BASE_URL + path, wait_until="load", timeout=20000)
                warm_page.wait_for_timeout(500)
            except Exception:
                pass
        warm.close()

        capture(browser, {"width": 1440, "height": 900}, "desktop")
        capture(browser, {"width": 390, "height": 844}, "mobile")
        browser.close()
    print(f"\n✓ Screenshots dans {OUT}")


if __name__ == "__main__":
    main()
