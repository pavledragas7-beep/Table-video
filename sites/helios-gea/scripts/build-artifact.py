"""Builds dist/helios-gea-anteprima.html: the inlined preview adapted for a private phone preview
(no document skeleton, reveals visible at rest, no map iframe, draft ribbon)."""
import pathlib, re, subprocess, sys

root = pathlib.Path(__file__).resolve().parent.parent
subprocess.run([sys.executable, str(root / "scripts" / "build-preview.py")], check=True)
html = (root / "dist" / "helios-gea-preview.html").read_text(encoding="utf-8")

head = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
body = re.search(r"<body>(.*?)</body>", html, re.S).group(1)
head = re.sub(r'<meta (charset|name="viewport")[^>]*>\s*', "", head)

extra = """<style>
  :root { color-scheme: light; }
  header { padding-top: env(safe-area-inset-top, 0px); }
  .rv { opacity: 1; transform: none; }
  .mask > .ph { clip-path: none; }
  .draft { position: fixed; z-index: 60; left: 50%; bottom: calc(14px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); padding: 9px 16px; background: var(--ink); color: var(--paper); border: 1px solid var(--copper); font: 400 11px/1 var(--mono); letter-spacing: .14em; text-transform: uppercase; white-space: nowrap; }
  .map { display: grid; place-items: center; background: var(--ink); }
  .map .seal { width: 140px; height: 140px; color: var(--copper); }
</style>"""
body = re.sub(r"<iframe[^>]*></iframe>", '<i class="seal" aria-hidden="true"></i>', body)
body = '<div class="draft">Anteprima · bozza per Helios Gea</div>\n' + body

out = head.strip() + "\n" + extra + "\n" + body.strip() + "\n"
(root / "dist" / "helios-gea-anteprima.html").write_text(out, encoding="utf-8")
print(f"dist/helios-gea-anteprima.html  {len(out) / 1e6:.1f} MB")
