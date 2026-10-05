"""Builds dist/helios-gea-anteprima.html for the private phone preview: the self-contained
preview without document skeleton, with content visible at rest (no loader, no hidden reveals)
and without the Google Maps iframe, which the preview frame cannot embed."""
import pathlib, re, subprocess, sys

root = pathlib.Path(__file__).resolve().parent.parent
subprocess.run([sys.executable, str(root / "scripts" / "build-preview.py")], check=True)
html = (root / "dist" / "helios-gea-preview.html").read_text(encoding="utf-8")

head = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
body = re.search(r"<body>(.*?)</body>", html, re.S).group(1)
head = re.sub(r'<meta (charset|name="viewport")[^>]*>\s*', "", head)
head = head.replace('document.documentElement.classList.add("js")', 'document.documentElement.classList.add("js", "loaded")')

extra = """<style>
  .js .pre { opacity: 1 !important; transform: none !important; }
  .js [data-split].pre .w > span { transform: none !important; }
  .fill .fw { opacity: 1 !important; }
  .draft { position: fixed; z-index: 60; left: 50%; bottom: calc(14px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); padding: 9px 16px; background: var(--ink); color: var(--paper); border: 1px solid var(--copper); font: 400 11px/1 var(--mono); letter-spacing: .14em; text-transform: uppercase; white-space: nowrap; }
</style>"""
body = re.sub(r'<div class="loader".*?</div>\s*</div>\s*</div>', "", body, count=1, flags=re.S)
body = re.sub(r"<iframe[^>]*></iframe>", '<i class="seal" aria-hidden="true"></i>', body)
body = '<div class="draft">Anteprima · bozza per Helios Gea</div>\n' + body

out = head.strip() + "\n" + extra + "\n" + body.strip() + "\n"
(root / "dist" / "helios-gea-anteprima.html").write_text(out, encoding="utf-8")
print(f"dist/helios-gea-anteprima.html  {len(out) / 1e6:.1f} MB")
