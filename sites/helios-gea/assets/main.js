// Helios Gea · immersive interactions (no dependencies)
(() => {
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lang = () => root.dataset.lang || "hr";

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
  let lastY = scrollY;
  addEventListener("scroll", () => {
    const y = scrollY, open = document.body.classList.contains("menu-open");
    hdr.classList.toggle("solid", y > innerHeight * .6 || open);
    hdr.classList.toggle("hide", !open && y > innerHeight && y > lastY + 6);
    if (y < lastY - 6) hdr.classList.remove("hide");
    lastY = y;
  }, { passive: true });
  burger.addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    burger.setAttribute("aria-expanded", open);
    hdr.classList.toggle("solid", open || scrollY > innerHeight * .6);
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

  /* ---------- HERO: the photo drifts a few pixels with the pointer ---------- */
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

  /* ---------- Story: pinned stage follows the steps ---------- */
  const steps = $$(".step"), stagePrints = $$(".stage-frame .print"), dots = $$(".stage-dots i");
  const setStep = i => {
    steps.forEach((s, k) => s.classList.toggle("on", k === i));
    stagePrints.forEach((p, k) => p.classList.toggle("on", k === i));
    dots.forEach((d, k) => d.classList.toggle("on", k === i));
  };
  if (steps.length) {
    setStep(0);
    const sio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setStep(steps.indexOf(e.target)); }), { rootMargin: "-48% 0px -48% 0px" });
    steps.forEach(s => sio.observe(s));
  }

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
    let cur = 0;
    const sel = i => {
      cur = (i + items.length) % items.length;
      items.forEach((b, k) => b.setAttribute("aria-current", k === cur));
      views.forEach((v, k) => v.classList.toggle("on", k === cur));
      if (count) count.textContent = String(cur + 1).padStart(2, "0");
    };
    items.forEach((b, k) => {
      b.addEventListener("click", () => sel(k));
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
      if (form.website.value) return; // bot trap
      const endpoint = form.dataset.endpoint;
      if (!endpoint) { status.textContent = t("off"); status.classList.add("warn"); return; }
      form.classList.add("sending");
      status.textContent = t("sending");
      try {
        const res = await fetch(endpoint, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(res.status);
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
