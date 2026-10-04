"""Builds dist/helios-gea-preview.html: index.html with every existing img/ file inlined,
so the preview opens as a single file (missing photos still fall back at runtime)."""
import base64, mimetypes, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / "index.html").read_text(encoding="utf-8")

def inline(m):
    path = root / m.group(0)
    if not path.exists():
        return m.group(0)
    mime = mimetypes.guess_type(path.name)[0]
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()

out = re.sub(r"img/[\w/.-]+\.(?:jpg|jpeg|png|webp)", inline, html)
(root / "dist").mkdir(exist_ok=True)
(root / "dist" / "helios-gea-preview.html").write_text(out, encoding="utf-8")
print(f"dist/helios-gea-preview.html  {len(out) / 1e6:.1f} MB")
