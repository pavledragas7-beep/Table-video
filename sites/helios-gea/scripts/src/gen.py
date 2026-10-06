import pathlib, html, sys
sys.path.insert(0, sys.argv[1])
from descriptions import D
S = pathlib.Path(sys.argv[1]); site = pathlib.Path(sys.argv[2])
import subprocess
DIM = {}
def dims(b):
    if b not in DIM: DIM[b] = subprocess.check_output(['identify','-format','%w %h',str(site/f'img/{b}-800.webp')]).decode().split()
    return DIM[b]
def P(b, alt, group, cap=None, cls="", cursor="Pogledaj|View", lazy=True):
    w,h = dims(b)
    return (f'<button class="print {cls}".rstrip() type="button" data-full="img/{b}-1600.webp" data-group="{group}"'.replace('.rstrip()','')
      + (f' data-cap="{html.escape(cap)}"' if cap else '') + f' data-cursor="{cursor}" aria-label="{html.escape(alt)}">'
      + f'<img src="img/{b}-800.webp" width="{w}" height="{h}" alt="{html.escape(alt)}"' + (' loading="lazy"' if lazy else '') + ' decoding="async"></button>')
ring = [("p/gift-men","Men hand cream"),("g/model-products","45 degrees Absolute"),("p/body-cream-lotion","Absolute body cream lotion"),
        ("g/olive-sea","45 degrees · Bale Valle"),("p/body-polish","Absolute body polish"),("g/spa-lotion","Absolute body cream lotion"),
        ("p/facial-rich-cream","Absolute facial rich cream"),("p/women-hand-mask","Women hand absolute cream mask"),
        ("g/invest-skin","Invest in your skin"),("p/facial-toner","Hydrating facial spray toner"),("g/hand-cream","45 degrees natural cosmetics")]
home = [("p/body-cream-lotion","Absolute body cream lotion","236 ml",0),("p/body-polish","Absolute body polish","236 ml",0),("p/foot-balm","Absolute foot balm","75 ml",0),
        ("p/men-hand-cream","Men hand cream","50 ml",0),("p/women-hand-mask","Women hand absolute cream mask","50 ml",0),
        ("p/facial-rich-cream","Absolute facial rich cream","50 ml",1),("p/facial-toner","Hydrating facial spray toner","200 ml",1)]
NEW = '<span class="new"><span lang="hr">Novo</span><span lang="en">New</span></span>'
pro = [("Professional absolute body cream lotion","500",0,None),("Professional absolute body polish","500",0,None),("Professional absolute hand cream mask","250",0,None),
       ("Professional absolute foot balm","250",0,None),("Professional facial rich cream","200",0,None),("Hydrating facial spray toner","200",0,"p/facial-toner")]
strip1 = [("p/gift-men","Men hand cream"),("p/body-cream-lotion","Absolute body cream lotion"),("p/facial-rich-cream-grey","Absolute facial rich cream"),
          ("p/body-polish","Absolute body polish"),("p/display","45 degrees"),("p/men-hand-cream","Men hand cream"),("p/facial-rich-cream-jar","Absolute facial rich cream"),
          ("p/women-hand-mask","Women hand absolute cream mask"),("p/gift-women","Women hand absolute cream mask")]
strip2 = [("g/model-products","45 degrees Absolute"),("g/spa-lotion","Absolute body cream lotion"),("g/seal-portrait","45 degrees · Helios Gea"),
          ("g/invest-skin","Invest in your skin"),("g/hand-cream","45 degrees natural cosmetics"),("g/body-lotion","Absolute body cream lotion"),
          ("g/wrist","45 degrees")]
parts = dict(
  HERO=(lambda w,h: f'<button class="hero-print" type="button" data-full="img/g/toner-stones-1600.webp" data-group="hero" data-cap="Hydrating facial spray toner · 200 ml" aria-label="Hydrating facial spray toner"><img src="img/g/toner-stones-1600.webp" srcset="img/g/toner-stones-800.webp 800w, img/g/toner-stones-1600.webp 1600w" sizes="(max-width: 900px) 100vw, 64vw" width="1600" height="1066" alt="45 degrees Absolute facial spray toner" fetchpriority="high" decoding="async"></button>')(0,0),
  HOME_LIST="\n              ".join(f'<li><button type="button"><span class="n">{i+1:02d}</span><h4>{n}</h4><span class="size">{s}</span></button></li>' for i,(b,n,s,new) in enumerate(home)),
  HOME_VIEWS="\n                ".join(P(b,n,"products",cap=f"{n} · {s}",lazy=i>0) for i,(b,n,s,new) in enumerate(home)),
  PRO_LIST="\n              ".join(f'<li><button type="button"><span class="n">{i+1:02d}</span><h4>{n}</h4><span class="size">{s} ml</span></button></li>' for i,(n,s,new,img) in enumerate(pro)),
  PRO_VIEWS="\n                ".join((P(img,n,"pro",cap=f"{n} · {s} ml") if img else f'<div class="pro-card"><div><div class="big">{s}<small>ml</small></div><p class="label">{n}</p></div></div>') for n,s,new,img in pro),
  S1="\n        ".join(P(b,a,"strips") for b,a in strip1),
  S2="\n        ".join(P(b,a,"strips") for b,a in strip2),
  NEVA=P("g/olive-sea","Helios Gea – maslinik","story").replace('<img ', '<img data-prefer="img/neva-uliveto.jpg" ', 1),
  HARVEST=P("g/invest-skin","Helios Gea – berba maslina","story").replace('<img ', '<img data-prefer="img/berba-maslina.jpg" ', 1),
  SANSA=P("g/komina","Komina masline","story").replace('<img ', '<img data-prefer="img/sansa.jpg" ', 1))

SPLIT = {"Men hand cream":("Men","Hand cream"),"Women hand absolute cream mask":("Women","Hand absolute cream mask"),
         "Hydrating facial spray toner":("Hydrating","Facial spray toner"),"Absolute facial rich cream":("Absolute","Facial rich cream"),
         "Professional facial rich cream":("Professional","Facial rich cream")}
def split(n):
    if n in SPLIT: return SPLIT[n]
    for k in ("Professional absolute ","Absolute "):
        if n.startswith(k): return (k.strip().title(), n[len(k):].capitalize())
    return (n, "")
def first(t): return t.split(". ")[0] + "."
ARROW = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor"><path d="M1 8h13M9 3l5 5-5 5"/></svg>'
def info(key, name, size, line_hr, line_en, k):
    d = D.get(key); kick, sub = split(name)
    on = " on" if k == 0 else ""
    if not d:
        return (f'<div class="pinfo{on}"><p class="teaser"><span lang="hr">Za više informacija o ovom proizvodu pošaljite nam upit.</span>'
                f'<span lang="en">For more information about this product, send us an enquiry.</span></p>'
                f'<a class="more-btn" href="#upit" data-enquire="{html.escape(name)} · {size}"><span lang="hr">Pošaljite upit</span><span lang="en">Send an enquiry</span>{ARROW}</a></div>')
    body = "".join(f'<p lang="hr">{html.escape(t)}</p>' for t in d["hr"]) + "".join(f'<p lang="en">{html.escape(t)}</p>' for t in d["en"])
    use = ""
    if d.get("use_hr"):
        use = (f'<div class="use"><p class="label plain"><span lang="hr">Upotreba</span><span lang="en">How to use</span></p>'
               f'<p lang="hr">{html.escape(d["use_hr"])}</p><p lang="en">{html.escape(d["use_en"])}</p></div>')
    full = (f'<p class="label">45 degrees · <span lang="hr">{line_hr}</span><span lang="en">{line_en}</span></p>'
            f'<h3 class="sheet-title"><span class="kick">{kick}</span><span class="sub">{sub}</span></h3>'
            f'<p class="sheet-size">{size}</p><div class="sheet-text">{body}</div>{use}'
            f'<a class="btn solid" href="#upit" data-enquire="{html.escape(name)} · {size}"><span lang="hr">Pošaljite upit</span><span lang="en">Send an enquiry</span>{ARROW}</a>')
    return (f'<div class="pinfo{on}"><p class="teaser"><span lang="hr">{html.escape(first(d["hr"][0]))}</span><span lang="en">{html.escape(first(d["en"][0]))}</span></p>'
            f'<button class="more-btn" type="button" data-sheet><span lang="hr">Opis i upotreba</span><span lang="en">Description &amp; use</span><i></i></button>'
            f'<template>{full}</template></div>')
HOME_KEYS = ["body-cream-lotion","body-polish","foot-balm","men-hand-cream","women-hand-mask","facial-rich-cream","facial-toner"]
PRO_KEYS = ["pro-body-cream-lotion","pro-body-polish","pro-hand-cream-mask","pro-foot-balm","pro-facial-rich-cream","pro-facial-toner"]
parts["HOME_INFO"] = "\n            ".join(info(HOME_KEYS[i], n, s_, "Kućna upotreba", "Home care", i) for i,(b,n,s_,new) in enumerate(home))
parts["PRO_INFO"] = "\n            ".join(info(PRO_KEYS[i], n, f"{s_} ml", "Profesionalna upotreba", "Professional use", i) for i,(n,s_,new,img) in enumerate(pro))
tpl = (S/"page.template.html").read_text()
for k,v in parts.items(): tpl = tpl.replace("{{"+k+"}}", v)
assert "{{" not in tpl
(site/"index.html").write_text(tpl)
