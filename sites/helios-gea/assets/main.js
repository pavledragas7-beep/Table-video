// Helios Gea · interactions (no dependencies)
(() => {
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- Images fade in once decoded (never cropped, never masked) ---------- */
  $$(".ph img").forEach(img => {
    const ok = () => img.classList.add("ok");
    if (img.complete && img.naturalWidth) ok(); else { img.addEventListener("load", ok); img.addEventListener("error", ok); }
  });

  /* ---------- Language ---------- */
  function setLang(lang) {
    root.dataset.lang = lang;
    root.lang = lang;
    $$("[data-set-lang]").forEach(b => b.setAttribute("aria-pressed", b.dataset.setLang === lang));
    try { localStorage.setItem("hg-lang", lang); } catch (e) {}
    slider?.caption();
  }
  $$("[data-set-lang]").forEach(b => b.addEventListener("click", () => setLang(b.dataset.setLang)));

  /* ---------- Headings: words rise in ---------- */
  function split(node, counter) {
    [...node.childNodes].forEach(c => {
      if (c.nodeType === 3) {
        const frag = document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(" "); return; }
          const w = document.createElement("span");
          w.className = "w";
          const inner = document.createElement("span");
          inner.style.setProperty("--i", counter.i++);
          inner.textContent = part;
          w.append(inner);
          frag.append(w);
        });
        c.replaceWith(frag);
      } else if (c.nodeType === 1) split(c, counter);
    });
  }
  $$("[data-split]").forEach(el => split(el, { i: 0 }));

  /* ---------- Reveal on scroll: only what starts below the first screen waits ---------- */
  $$("[data-stagger]").forEach(g => [...g.children].forEach((c, i) => c.style.setProperty("--d", `${(i % 4) * 90}ms`)));
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.remove("pre"); io.unobserve(e.target); }
  }), { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });
  if (!reduce) $$(".rv, [data-split]").forEach(el => {
    if (el.getBoundingClientRect().top > innerHeight * .95) { el.classList.add("pre"); io.observe(el); }
  });

  /* ---------- Header ---------- */
  const hdr = $(".hdr");
  const burger = $(".burger");
  const onScroll = () => hdr.classList.toggle("scrolled", scrollY > 10);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  burger.addEventListener("click", () => burger.setAttribute("aria-expanded", document.body.classList.toggle("menu-open")));
  $$(".nav a").forEach(a => a.addEventListener("click", () => { document.body.classList.remove("menu-open"); burger.setAttribute("aria-expanded", false); }));
  const navIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) $$(".nav a").forEach(a => a.classList.toggle("on", a.getAttribute("href") === `#${e.target.id}`));
  }), { rootMargin: "-45% 0px -50% 0px" });
  $$("main section[id]").forEach(s => navIO.observe(s));

  /* ---------- Tabs ---------- */
  const tabs = $$("[role=tab]");
  tabs.forEach(t => t.addEventListener("click", () => tabs.forEach(o => {
    o.setAttribute("aria-selected", o === t);
    document.getElementById(o.getAttribute("aria-controls")).hidden = o !== t;
  })));

  /* ---------- Hero slider: cross-fade, whole photos ---------- */
  const slider = (() => {
    const el = $(".slider");
    if (!el) return null;
    const slides = $$(".slide", el), name = $(".slider-name", el), count = $(".slider-count b", el);
    const DUR = 5200;
    let i = 0, t0 = performance.now(), paused = false, raf;
    const caption = () => {
      const s = slides[i];
      $("h4", name).textContent = s.dataset.name;
      $("span", name).textContent = s.dataset.size;
      count.textContent = String(i + 1).padStart(2, "0");
    };
    const go = n => {
      slides[i].classList.remove("on");
      i = (n + slides.length) % slides.length;
      slides[i].classList.add("on");
      // warm the next image so the fade never waits on the network
      const next = $("img", slides[(i + 1) % slides.length]);
      if (next.loading === "lazy") next.loading = "eager";
      caption();
      t0 = performance.now();
    };
    const tick = now => {
      if (!paused && !reduce) {
        const p = Math.min(1, (now - t0) / DUR);
        name.style.setProperty("--t", p.toFixed(4));
        if (p >= 1) go(i + 1);
      } else t0 = now - (parseFloat(name.style.getPropertyValue("--t")) || 0) * DUR;
      raf = requestAnimationFrame(tick);
    };
    $(".prev", el).addEventListener("click", () => go(i - 1));
    $(".next", el).addEventListener("click", () => go(i + 1));
    el.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") paused = true; });
    el.addEventListener("pointerleave", () => { paused = false; });
    document.addEventListener("visibilitychange", () => { paused = document.hidden; });
    let x0 = null;
    el.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
    el.addEventListener("touchend", e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
      x0 = null;
    });
    el.addEventListener("keydown", e => {
      if (e.key === "ArrowRight") go(i + 1);
      if (e.key === "ArrowLeft") go(i - 1);
    });
    caption();
    raf = requestAnimationFrame(tick);
    return { caption };
  })();

  /* ---------- Count-up for the 45° mark ---------- */
  const deg = $(".deg b");
  if (deg && !reduce) {
    deg.textContent = "0";
    new IntersectionObserver((es, obs) => es.forEach(e => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const t0 = performance.now();
      const step = now => {
        const p = Math.min(1, (now - t0) / 1400);
        deg.textContent = Math.round(45 * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }), { threshold: .5 }).observe(deg);
  }

  /* ---------- Lightbox: open any photo at full size ---------- */
  const lb = $(".lb");
  const lbImg = $(".lb-stage img", lb);
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
  const open = b => {
    group = $$(`.zoomable[data-group="${b.dataset.group}"]`).filter(z => z.offsetParent);
    lastFocus = b;
    show(group.indexOf(b));
    lb.classList.add("open");
    lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    $(".lb-close", lb).focus();
  };
  const close = () => {
    lb.classList.remove("open");
    lb.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    lastFocus?.focus();
  };
  $$(".zoomable").forEach(b => b.addEventListener("click", () => open(b)));
  $(".lb-close", lb).addEventListener("click", close);
  $(".lb-prev", lb).addEventListener("click", () => show(gi - 1));
  $(".lb-next", lb).addEventListener("click", () => show(gi + 1));
  $(".lb-stage", lb).addEventListener("click", e => { if (e.target === e.currentTarget) close(); });
  addEventListener("keydown", e => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") close();
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

  let saved = null;
  try { saved = localStorage.getItem("hg-lang"); } catch (e) {}
  setLang(new URLSearchParams(location.search).get("lang") || saved || "hr");
  const yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();
})();
