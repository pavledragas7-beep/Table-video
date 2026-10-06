// Helios Gea · immersive interactions (no dependencies)
(() => {
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lang = () => root.dataset.lang || "hr";


  /* ---------- Client photos: swap in as soon as the file exists (img/valle.jpg, img/neva-uliveto.jpg …) ---------- */
  $$("img[data-prefer]").forEach(img => {
    const probe = new Image();
    probe.onload = () => {
      img.removeAttribute("srcset");
      img.src = probe.src;
      img.closest("[hidden]")?.removeAttribute("hidden");
      const z = img.closest("[data-full]"); if (z) z.dataset.full = probe.src;
      img.closest(".chapter.wide")?.classList.add("full");
    };
    probe.src = img.dataset.prefer;
  });

  /* ---------- Language ---------- */
  const langHooks = [];
  function setLang(l) {
    root.dataset.lang = l;
    root.lang = l;
    $$("[data-set-lang]").forEach(b => b.setAttribute("aria-pressed", b.dataset.setLang === l));
    try { localStorage.setItem("hg-lang", l); } catch (e) {}
    langHooks.forEach(fn => fn());
  }
  $$("[data-set-lang]").forEach(b => b.addEventListener("click", () => setLang(b.dataset.setLang)));

  /* ---------- Split headings / fill words ---------- */
  function wrapWords(node, make) {
    [...node.childNodes].forEach(c => {
      if (c.nodeType === 3) {
        const frag = document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          frag.append(/^\s+$/.test(part) ? " " : make(part));
        });
        c.replaceWith(frag);
      } else if (c.nodeType === 1) wrapWords(c, make);
    });
  }
  $$("[data-split]").forEach(el => {
    let i = 0;
    wrapWords(el, word => {
      const w = document.createElement("span"); w.className = "w";
      const s = document.createElement("span"); s.style.setProperty("--i", i++); s.textContent = word;
      w.append(s); return w;
    });
  });
  $$(".fill").forEach(el => wrapWords(el, word => {
    const s = document.createElement("span"); s.className = "fw"; s.textContent = word; return s;
  }));

  /* ---------- Reveal: only what starts below the first screen waits ---------- */
  $$("[data-stagger]").forEach(g => [...g.children].forEach((c, i) => c.style.setProperty("--d", `${(i % 6) * 70}ms`)));
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.remove("pre"); io.unobserve(e.target); }
  }), { threshold: .1, rootMargin: "0px 0px -6% 0px" });
  if (!reduce) $$(".rv, [data-split]").forEach(el => {
    if (el.closest(".hero")) return;
    if (el.getBoundingClientRect().top > innerHeight * .95) { el.classList.add("pre"); io.observe(el); }
  });

  /* ---------- Loader ---------- */
  const loader = $(".loader");
  const finish = () => root.classList.add("loaded");
  if (!loader || reduce) finish();
  else {
    const out = $(".loader-count b", loader), t0 = performance.now();
    const tick = now => {
      const p = clamp((now - t0) / 1000);
      out.textContent = Math.round(45 * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick); else setTimeout(finish, 150);
    };
    requestAnimationFrame(tick);
    setTimeout(finish, 2600);
  }

  /* ---------- Header + menu + active section ---------- */
  const hdr = $(".hdr"), burger = $(".burger");
  hdr.classList.toggle("ink", scrollY <= innerHeight * .6);
  let lastY = scrollY;
  addEventListener("scroll", () => {
    const y = scrollY, open = document.body.classList.contains("menu-open");
    hdr.classList.toggle("solid", y > innerHeight * .6 || open);
    hdr.classList.toggle("ink", y <= innerHeight * .6 && !open);
    hdr.classList.toggle("hide", !open && y > innerHeight && y > lastY + 6);
    if (y < lastY - 6) hdr.classList.remove("hide");
    lastY = y;
  }, { passive: true });
  burger.addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    burger.setAttribute("aria-expanded", open);
    hdr.classList.toggle("solid", open || scrollY > innerHeight * .6);
    hdr.classList.toggle("ink", !open && scrollY <= innerHeight * .6);
  });
  $$(".nav a").forEach(a => a.addEventListener("click", () => { document.body.classList.remove("menu-open"); burger.setAttribute("aria-expanded", false); }));
  const navIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) $$(".nav a").forEach(a => a.classList.toggle("on", a.getAttribute("href") === `#${e.target.id}`));
  }), { rootMargin: "-45% 0px -50% 0px" });
  $$("main section[id]").forEach(s => navIO.observe(s));

  /* ---------- Lightbox (whole photos at full size) ---------- */
  const lb = $(".lb"), lbImg = $(".lb-stage img", lb);
  let group = [], gi = 0, lastFocus = null;
  const show = n => {
    gi = (n + group.length) % group.length;
    const b = group[gi];
    lbImg.classList.remove("ok");
    lbImg.onload = () => lbImg.classList.add("ok");
    lbImg.src = b.dataset.full;
    lbImg.alt = $("img", b).alt;
    $(".lb-count", lb).textContent = `${String(gi + 1).padStart(2, "0")} / ${String(group.length).padStart(2, "0")}`;
    $(".lb-cap", lb).textContent = b.dataset.cap || $("img", b).alt;
  };
  function openLb(b) {
    const seen = new Set();
    group = $$(`[data-full][data-group="${b.dataset.group}"]`).filter(z => !seen.has(z.dataset.full) && seen.add(z.dataset.full));
    lastFocus = b;
    show(Math.max(0, group.findIndex(z => z.dataset.full === b.dataset.full)));
    lb.classList.add("open"); lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    $(".lb-close", lb).focus();
  }
  const closeLb = () => {
    lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true");
    document.body.style.overflow = ""; lastFocus?.focus({ preventScroll: true });
  };
  $(".lb-close", lb).addEventListener("click", closeLb);
  $(".lb-prev", lb).addEventListener("click", () => show(gi - 1));
  $(".lb-next", lb).addEventListener("click", () => show(gi + 1));
  $(".lb-stage", lb).addEventListener("click", e => { if (e.target === e.currentTarget) closeLb(); });
  addEventListener("keydown", e => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") closeLb();
    if (e.key === "ArrowRight") show(gi + 1);
    if (e.key === "ArrowLeft") show(gi - 1);
  });
  let lx = null;
  lb.addEventListener("touchstart", e => { lx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", e => {
    if (lx === null) return;
    const dx = e.changedTouches[0].clientX - lx;
    if (Math.abs(dx) > 40) show(gi + (dx < 0 ? 1 : -1));
    lx = null;
  });


  /* ---------- Procedural olive branches (seeded, so every visit draws the same branch) ---------- */
  const NS = "http://www.w3.org/2000/svg";
  const svgEl = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent && parent.append(e); return e; };
  const bz = (P, t) => { const u = 1 - t; return [0, 1].map(i => u * u * u * P[0][i] + 3 * u * u * t * P[1][i] + 3 * u * t * t * P[2][i] + t * t * t * P[3][i]); };
  const bzA = (P, t) => { const u = 1 - t; const d = [0, 1].map(i => 3 * u * u * (P[1][i] - P[0][i]) + 6 * u * t * (P[2][i] - P[1][i]) + 3 * t * t * (P[3][i] - P[2][i])); return Math.atan2(d[1], d[0]) * 180 / Math.PI; };
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  function growBranch(svg, seed, delay0, scale, build) {
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const sway = svgEl("g", { class: "sway" }, svg);
    const gStem = svgEl("g", {}, sway), gLeaf = svgEl("g", {}, sway), gFruit = svgEl("g", {}, sway);
    let order = 0;
    const holder = (parent, x, y, deg) => {
      const o = svgEl("g", { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${deg.toFixed(1)})` }, parent);
      const g = svgEl("g", { class: "grow", style: `--g:${(delay0 + order++ * .035).toFixed(2)}s` }, o);
      return svgEl("g", { class: "flutter", style: `--d:${(rnd() * -6).toFixed(2)}s;--fd:${(5 + rnd() * 4).toFixed(1)}s;--fa:${(2 + rnd() * 4).toFixed(1)}deg` }, g);
    };
    const leaf = (x, y, deg, L) => {
      const W = L * (.12 + rnd() * .03), f = holder(gLeaf, x, y, deg);
      svgEl("path", { class: rnd() < .33 ? "lf under" : "lf", d: `M0 0C${L * .22} ${-W * 1.15} ${L * .68} ${-W * 1.05} ${L} 0C${L * .68} ${W * 1.05} ${L * .22} ${W * 1.15} 0 0Z` }, f);
      svgEl("path", { class: "rib", d: `M${L * .04} 0Q${L * .5} ${W * .12} ${L * .9} 0` }, f);
    };
    const olive = (x, y, deg) => {
      const len = (14 + rnd() * 16) * scale, f = holder(gFruit, x, y, deg);
      svgEl("path", { class: "ostalk", d: `M0 0Q${len * .5} ${rnd() * 6 - 3} ${len} 0` }, f);
      const rx = (17 + rnd() * 4) * scale, ry = (12.5 + rnd() * 2.5) * scale;
      svgEl("ellipse", { cx: len + rx - 2, cy: 0, rx, ry, fill: rnd() < .3 ? "url(#ob)" : "url(#og)" }, f);
      svgEl("ellipse", { class: "ohl", cx: len + rx * .7, cy: -ry * .4, rx: rx * .28, ry: ry * .18 }, f);
    };
    const cluster = (P, t, n, down = 70) => { const [x, y] = bz(P, t); for (let i = 0; i < n; i++) olive(x, y, down + i * 22 + rnd() * 16); };
    const twig = (P, width, leafLen, pairs) => {
      svgEl("path", { class: "stem", pathLength: 1, "stroke-width": width, d: `M${P[0]}C${P[1]} ${P[2]} ${P[3]}` }, gStem);
      for (let i = 1; i <= pairs; i++) {
        const t = i / (pairs + .5) + (rnd() - .5) * .03;
        const [x, y] = bz(P, t), a = bzA(P, t), L = leafLen * (1 - t * .4) * (.85 + rnd() * .3);
        [-1, 1].forEach(side => { if (rnd() > .1) leaf(x, y, a + side * (32 + rnd() * 24), L * (.9 + rnd() * .2)); });
      }
      const [x, y] = bz(P, 1); leaf(x, y, bzA(P, 1) + (rnd() - .5) * 20, leafLen * .7);
    };
    build({ twig, cluster });
  }

  // hero branch
  const heroSvg = $(".branch");
  if (heroSvg) growBranch(heroSvg, 45, 1.1, 1, ({ twig, cluster }) => {
    const M = [[1030, 30], [790, 130], [560, 360], [210, 780]];
    const s1 = bz(M, .26), s2 = bz(M, .5), s3 = bz(M, .7);
    const T1 = [s1, add(s1, [-30, 110]), add(s1, [-120, 220]), add(s1, [-230, 280])];
    const T2 = [s2, add(s2, [-90, -50]), add(s2, [-210, -70]), add(s2, [-320, -30])];
    const T3 = [s3, add(s3, [40, 100]), add(s3, [30, 200]), add(s3, [-20, 280])];
    twig(M, 7, 128, 9); twig(T1, 3.6, 104, 5); twig(T2, 3.2, 96, 5); twig(T3, 3.4, 100, 5);
    cluster(T1, .45, 3); cluster(T1, .85, 2); cluster(M, .62, 2); cluster(T3, .6, 3); cluster(M, .9, 2); cluster(T2, .7, 2);
  });

  // sprigs between sections: they grow when they scroll into view
  $$(".sprig").forEach((svg, k) => {
    growBranch(svg, +svg.dataset.seed || 7 + k * 13, .15, .7, ({ twig, cluster }) => {
      const M = [[30, 118], [190, 84], [400, 150], [590, 96]];
      const s1 = bz(M, .4), s2 = bz(M, .68);
      const T1 = [s1, add(s1, [30, 30]), add(s1, [80, 50]), add(s1, [130, 52])];
      const T2 = [s2, add(s2, [20, -30]), add(s2, [60, -50]), add(s2, [110, -56])];
      twig(M, 3, 92, 6); twig(T1, 1.8, 66, 3); twig(T2, 1.8, 62, 3);
      cluster(M, .55, 2); cluster(T1, .8, 3, 60); cluster(M, .86, 2);
    });
  });
  const sprigIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("in"); sprigIO.unobserve(e.target); }
  }), { threshold: .35 });
  $$(".sprig").forEach(s => reduce ? s.classList.add("in") : sprigIO.observe(s));

  /* ---------- HERO: the branch drifts a few pixels with the pointer ---------- */
  const hero = $(".hero");
  if (hero && fine && !reduce) {
    hero.addEventListener("pointermove", e => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty("--mx", (((e.clientX - r.left) / r.width) - .5) * 2);
      hero.style.setProperty("--my", (((e.clientY - r.top) / r.height) - .5) * 2);
    });
    hero.addEventListener("pointerleave", () => { hero.style.setProperty("--mx", 0); hero.style.setProperty("--my", 0); });
  }

  /* ---------- Every whole photo opens full screen ---------- */
  $$("[data-full]").forEach(b => b.addEventListener("click", () => openLb(b)));

  /* ---------- Manifesto: words light up on scroll; pillar pills ---------- */
  const man = $(".manifesto");
  const tip = $(".pill-tip");
  const pills = $$(".pill");
  const setTip = p => { if (tip) tip.textContent = p ? p.dataset[lang()] : tip.dataset[lang()]; };
  pills.forEach(p => {
    p.addEventListener("pointerenter", () => setTip(p));
    p.addEventListener("focus", () => setTip(p));
    p.addEventListener("click", () => setTip(p));
  });
  $(".pills")?.addEventListener("pointerleave", () => setTip(null));
  langHooks.push(() => setTip(null));

  /* ---------- 45° globe (orthographic, canvas) ---------- */
  const cv = $("#globe");
  if (cv) {
    const ctx = cv.getContext("2d"), tag = $(".globe-tag");
    const D = Math.PI / 180, BALE = [45.04, 13.78];
    let lon0 = -40, tilt = 18, gVisible = false, last = 0, dragG = false, gx = 0;
    const fit = () => {
      const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      cv.width = r.width * dpr; cv.height = r.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit(); addEventListener("resize", fit);
    const proj = (lat, lon, R, cx, cy) => {
      const p = lat * D, l = (lon - lon0) * D, p0 = tilt * D;
      const cosc = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
      return [cx + R * Math.cos(p) * Math.sin(l), cy - R * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l)), cosc];
    };
    const line = (pts, R, cx, cy, style, width, dash = []) => {
      ctx.beginPath(); let pen = false;
      pts.forEach(([la, lo]) => {
        const [x, y, v] = proj(la, lo, R, cx, cy);
        if (v > 0) { pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; } else pen = false;
      });
      ctx.strokeStyle = style; ctx.lineWidth = width; ctx.setLineDash(dash); ctx.stroke(); ctx.setLineDash([]);
    };
    const draw = t => {
      const w = cv.clientWidth, h = cv.clientHeight, cx = w / 2, cy = h / 2, R = Math.min(w, h) * .42;
      ctx.clearRect(0, 0, w, h);
      const g = ctx.createRadialGradient(cx - R * .35, cy - R * .4, R * .1, cx, cy, R);
      g.addColorStop(0, "#2c3621"); g.addColorStop(1, "#11150e");
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = "rgba(169,196,181,.35)"; ctx.lineWidth = 1; ctx.stroke();
      for (let lo = -180; lo < 180; lo += 20) line(Array.from({ length: 91 }, (_, k) => [-90 + k * 2, lo]), R, cx, cy, "rgba(169,196,181,.16)", .8);
      for (let la = -75; la <= 75; la += 15) if (la !== 45) line(Array.from({ length: 181 }, (_, k) => [la, -180 + k * 2]), R, cx, cy, "rgba(169,196,181,.16)", .8);
      line(Array.from({ length: 181 }, (_, k) => [0, -180 + k * 2]), R, cx, cy, "rgba(244,239,229,.35)", 1, [4, 6]);
      line(Array.from({ length: 181 }, (_, k) => [45, -180 + k * 2]), R, cx, cy, "#c98d5e", 2.4);
      const [bx, by, bv] = proj(BALE[0], BALE[1], R, cx, cy);
      if (bv > 0) {
        const pulse = (t / 1400) % 1;
        ctx.beginPath(); ctx.arc(bx, by, 6 + pulse * 22, 0, Math.PI * 2); ctx.strokeStyle = `rgba(232,191,152,${1 - pulse})`; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI * 2); ctx.fillStyle = "#e8bf98"; ctx.fill();
        tag.style.opacity = 1; tag.style.left = `${bx}px`; tag.style.top = `${by}px`;
      } else tag.style.opacity = 0;
    };
    const loop = t => {
      if (gVisible) {
        const dt = Math.min(50, t - last);
        if (!dragG && !reduce) {
          // drift, then ease to a stop with Bale facing the viewer
          const target = BALE[1];
          const diff = ((target - lon0 + 540) % 360) - 180;
          lon0 += Math.abs(diff) > .5 ? Math.sign(diff) * Math.max(.02, Math.min(.6, Math.abs(diff) * .012)) * dt / 16 : 0;
        }
        draw(t);
      }
      last = t; requestAnimationFrame(loop);
    };
    new IntersectionObserver(es => {
      gVisible = es[0].isIntersecting;
      if (gVisible && !reduce) lon0 = BALE[1] - 150;
      draw(performance.now());
    }, { threshold: .15 }).observe(cv);
    requestAnimationFrame(loop);
    cv.addEventListener("pointerdown", e => { dragG = true; gx = e.clientX; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener("pointermove", e => { if (!dragG) return; lon0 -= (e.clientX - gx) * .4; gx = e.clientX; draw(performance.now()); });
    cv.addEventListener("pointerup", () => { setTimeout(() => { dragG = false; }, 1200); });
  }

  // count-up 0 → 45
  const deg = $(".deg b");
  if (deg && !reduce) {
    deg.textContent = "0";
    new IntersectionObserver((es, o) => es.forEach(e => {
      if (!e.isIntersecting) return; o.disconnect();
      const t0 = performance.now();
      const st = now => { const p = clamp((now - t0) / 1600); deg.textContent = Math.round(45 * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(st); };
      requestAnimationFrame(st);
    }), { threshold: .4 }).observe(deg);
  }

  /* ---------- Showroom ---------- */
  $$(".showroom .panel").forEach(panel => {
    const items = $$(".plist button", panel), views = $$(".show-frame > *", panel), count = $(".count b", panel);
    const infos = $$(".pinfo", panel);
    let cur = 0;
    const sel = i => {
      cur = (i + items.length) % items.length;
      items.forEach((b, k) => b.setAttribute("aria-current", k === cur));
      views.forEach((v, k) => v.classList.toggle("on", k === cur));
      infos.forEach((v, k) => v.classList.toggle("on", k === cur));
      if (count) count.textContent = String(cur + 1).padStart(2, "0");
    };
    items.forEach((b, k) => {
      b.addEventListener("click", () => {
        sel(k);
        const more = $("[data-sheet]", infos[k]);
        if (more) openSheet(more); // tapping a product opens its description straight away
      });
    });
    $(".prev", panel)?.addEventListener("click", () => sel(cur - 1));
    $(".next", panel)?.addEventListener("click", () => sel(cur + 1));
    sel(0);
  });
  const tabs = $$("[role=tab]");
  tabs.forEach(t => t.addEventListener("click", () => tabs.forEach(o => {
    o.setAttribute("aria-selected", o === t);
    document.getElementById(o.getAttribute("aria-controls")).hidden = o !== t;
  })));


  /* ---------- Product sheet (description & use) ---------- */
  const sheet = $(".sheet");
  let sheetFrom = null;
  const openSheet = btn => {
    const info = btn.closest(".pinfo"), panel = btn.closest(".panel");
    const idx = $$(".pinfo", panel).indexOf(info);
    const view = $$(".show-frame > *", panel)[idx];
    const media = $(".sheet-media", sheet);
    media.innerHTML = "";
    const img = view && $("img", view);
    if (img) { const i = new Image(); i.src = view.dataset.full || img.src; i.alt = img.alt; media.append(i); }
    else if (view) media.append(view.cloneNode(true));
    $(".sheet-body", sheet).innerHTML = $("template", info).innerHTML;
    $(".sheet-title", sheet)?.setAttribute("id", "sheet-title");
    sheetFrom = btn;
    sheet.classList.add("open"); sheet.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    $(".sheet-panel", sheet).scrollTop = 0;
    $(".sheet-close", sheet).focus({ preventScroll: true });
  };
  const closeSheet = (restore = true) => {
    if (!sheet.classList.contains("open")) return;
    sheet.classList.remove("open"); sheet.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (restore) sheetFrom?.focus({ preventScroll: true });
  };
  $$("[data-sheet]").forEach(b => b.addEventListener("click", () => openSheet(b)));
  $$("[data-close]", sheet).forEach(b => b.addEventListener("click", () => closeSheet()));
  addEventListener("keydown", e => { if (e.key === "Escape" && sheet.classList.contains("open")) closeSheet(); });

  // "Send an enquiry" from a product: preset the form, then go there
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-enquire]");
    if (!a) return;
    e.preventDefault();
    closeSheet(false);
    const f = $("#upit");
    if (f) {
      const topic = f.querySelector('input[name=topic][value="45 degrees"]'); if (topic) topic.checked = true;
      const msg = $("#f-msg");
      const line = (lang() === "en" ? "Enquiry about: " : "Upit za: ") + a.dataset.enquire;
      if (msg && !msg.value.includes(a.dataset.enquire)) msg.value = msg.value ? `${line}\n${msg.value}` : `${line}\n`;
    }
    $("#kontakt").scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    setTimeout(() => $("#f-name")?.focus({ preventScroll: true }), 900);
  });

  /* ---------- Film strips: duplicate content for a seamless loop ---------- */
  $$(".strip").forEach(s => {
    [...s.children].forEach(c => { const d = c.cloneNode(true); d.setAttribute("aria-hidden", "true"); d.tabIndex = -1; d.addEventListener("click", () => openLb(d)); s.append(d); });
  });

  /* ---------- Scroll-linked: manifesto words, motto line ---------- */
  const motto = $(".motto-line");
  const prog = (el, a = 1, b = 0) => { const r = el.getBoundingClientRect(); const s = innerHeight * a, e = innerHeight * b - r.height; return clamp((s - r.top) / (s - e)); };
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    if (man) {
      const words = $$(`.fill [lang="${lang()}"] .fw`, man);
      const lit = Math.round(prog(man, .8, .45) * words.length * 1.1);
      words.forEach((w, i) => w.classList.toggle("lit", reduce || i < lit));
    }
    if (motto && !reduce) motto.style.transform = `translateX(${(-prog(motto.parentElement) * 35).toFixed(2)}%)`;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  langHooks.push(onScroll);

  /* ---------- Desktop niceties: cursor, magnetic buttons, tilt ---------- */
  if (fine && !reduce) {
    const cur = $(".cursor"), label = $("span", cur);
    let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
    addEventListener("pointermove", e => { mx = e.clientX; my = e.clientY; cur.classList.add("live"); }, { passive: true });
    const follow = () => { cx += (mx - cx) * .2; cy += (my - cy) * .2; cur.style.transform = `translate(${cx}px, ${cy}px)`; requestAnimationFrame(follow); };
    requestAnimationFrame(follow);
    document.addEventListener("pointerover", e => {
      const t = e.target.closest("[data-cursor]");
      cur.classList.toggle("big", !!t);
      if (t) label.textContent = t.dataset.cursor.split("|")[lang() === "en" ? 1 : 0] || t.dataset.cursor;
    });
    $$(".magnetic").forEach(b => {
      b.addEventListener("pointermove", e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px, ${(e.clientY - r.top - r.height / 2) * .35}px)`;
      });
      b.addEventListener("pointerleave", () => { b.style.transition = "transform .6s cubic-bezier(.2,.7,.1,1), color .45s, border-color .45s"; b.style.transform = ""; });
      b.addEventListener("pointerenter", () => { b.style.transition = "color .45s, border-color .45s"; });
    });
    $$(".tilt").forEach(t => {
      t.addEventListener("pointermove", e => {
        const r = t.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        t.style.transform = `perspective(1200px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
      });
      t.addEventListener("pointerleave", () => { t.style.transform = ""; });
    });
  } else $(".cursor")?.remove();


  /* ---------- Enquiry form ---------- */
  const form = $("#upit");
  if (form) {
    const status = $(".f-status", form);
    const T = {
      hr: { req: "Obavezno polje.", mail: "Unesite ispravnu e-mail adresu.", consent: "Potrebna je vaša suglasnost.", fix: "Provjerite označena polja.",
            sending: "Šaljem…", ok: "Hvala! Vaš upit je poslan, javit ćemo vam se uskoro.", fail: "Slanje nije uspjelo. Nazovite nas na +385 99 3664333.",
            off: "Obrazac još nije povezan s e-mail adresom. Za upit nas nazovite na +385 99 3664333." },
      en: { req: "Required field.", mail: "Enter a valid e-mail address.", consent: "Your consent is required.", fix: "Please check the highlighted fields.",
            sending: "Sending…", ok: "Thank you! Your enquiry has been sent, we will get back to you soon.", fail: "Sending failed. Please call us on +385 99 3664333.",
            off: "The form is not connected to an e-mail address yet. Please call us on +385 99 3664333." }
    };
    const t = k => T[lang()][k];
    const mark = (el, msg) => {
      const box = el.closest(".field, .consent");
      box.classList.toggle("bad", !!msg);
      let err = $(".err", box);
      if (msg && !err && box.classList.contains("field")) { err = document.createElement("span"); err.className = "err"; box.append(err); }
      if (err) err.textContent = msg || "";
      el.setAttribute("aria-invalid", msg ? "true" : "false");
    };
    const check = el => {
      if (el.type === "checkbox") return mark(el, el.checked ? "" : t("consent")), el.checked;
      const v = el.value.trim();
      let msg = "";
      if (el.required && !v) msg = t("req");
      else if (el.type === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = t("mail");
      mark(el, msg);
      return !msg;
    };
    const fields = $$("input[required], textarea[required], input[type=email]", form);
    fields.forEach(el => el.addEventListener(el.type === "checkbox" ? "change" : "blur", () => check(el)));
    form.addEventListener("submit", async e => {
      e.preventDefault();
      status.className = "f-status";
      const bad = fields.filter(el => !check(el));
      if (bad.length) { status.textContent = t("fix"); status.classList.add("warn"); bad[0].focus(); return; }
      if (form._honey.value) return; // bot trap
      const endpoint = form.dataset.endpoint;
      if (!endpoint) { status.textContent = t("off"); status.classList.add("warn"); return; }
      form.classList.add("sending");
      status.textContent = t("sending");
      try {
        const res = await fetch(endpoint, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(res.status);
        const data = await res.json().catch(() => ({}));
        if (data.success === false || data.success === "false") throw new Error(data.message || "rejected");
        form.reset();
        status.textContent = t("ok"); status.classList.add("ok");
      } catch (err) {
        status.textContent = t("fail"); status.classList.add("warn");
      } finally { form.classList.remove("sending"); }
    });
    langHooks.push(() => { fields.forEach(el => { if (el.getAttribute("aria-invalid") === "true") check(el); }); status.textContent = ""; status.className = "f-status"; });
  }

  let saved = null;
  try { saved = localStorage.getItem("hg-lang"); } catch (e) {}
  setLang(new URLSearchParams(location.search).get("lang") || saved || "hr");
  onScroll();
  const yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();
})();
