"""Builds dist/helios-gea-preview.html: one self-contained file (CSS, JS and every existing
image inlined, largest size only) for sharing a preview. Missing client photos stay as
relative paths and are simply skipped at runtime."""
import base64, mimetypes, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / "index.html").read_text(encoding="utf-8")
css = (root / "assets" / "style.css").read_text(encoding="utf-8").replace("../img/", "img/")
js = (root / "assets" / "main.js").read_text(encoding="utf-8")

html = re.sub(r'<link rel="preload"[^>]*>\s*', "", html)
html = html.replace('<link rel="stylesheet" href="assets/style.css">', f"<style>\n{css}</style>")
html = html.replace('<script src="assets/main.js" defer></script>', f"<script>\n{js}</script>")
html = re.sub(r'\s(?:srcset|sizes)="[^"]*"', "", html)

def inline(m):
    path = root / m.group(0)
    if not path.exists():
        return m.group(0)
    mime = mimetypes.guess_type(path.name)[0] or "image/webp"
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()

html = re.sub(r"img/[\w/.-]+\.(?:jpg|jpeg|png|webp)", inline, html)
(root / "dist").mkdir(exist_ok=True)
(root / "dist" / "helios-gea-preview.html").write_text(html, encoding="utf-8")
print(f"dist/helios-gea-preview.html  {len(html) / 1e6:.1f} MB")
