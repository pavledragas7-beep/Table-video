// Helios Gea · interactions. No dependencies; every scroll effect runs in one rAF pass.
(() => {
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const desktop = matchMedia("(min-width: 901px)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ---------- Preferred photos: swap in the client's own shots once they exist ---------- */
  $$("img[data-prefer]").forEach(img => {
    const probe = new Image();
    probe.onload = () => { img.removeAttribute("srcset"); img.src = probe.src; img.closest("[hidden]")?.removeAttribute("hidden"); };
    probe.src = img.dataset.prefer;
  });

  /* ---------- Language ---------- */
  function setLang(lang) {
    root.dataset.lang = lang;
    root.lang = lang;
    $$("[data-set-lang]").forEach(b => b.setAttribute("aria-pressed", b.dataset.setLang === lang));
    try { localStorage.setItem("hg-lang", lang); } catch (e) {}
    requestAnimationFrame(measure);
  }
  let saved = null;
  try { saved = localStorage.getItem("hg-lang"); } catch (e) {}
  const q = new URLSearchParams(location.search).get("lang");
  $$("[data-set-lang]").forEach(b => b.addEventListener("click", () => setLang(b.dataset.setLang)));

  /* ---------- Split headings into masked words ---------- */
  let wi = 0;
  function splitNode(node) {
    [...node.childNodes].forEach(child => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(" "); return; }
          const w = document.createElement("span");
          w.className = "w";
          w.innerHTML = `<span style="--i:${wi++}"></span>`;
          w.firstChild.textContent = part;
          frag.append(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1) splitNode(child);
    });
  }
  $$("[data-split]").forEach(el => { wi = 0; splitNode(el); });

  // Manifesto: words light up as the section scrolls past
  const fillWords = [];
  $$(".fill").forEach(el => {
    [...el.querySelectorAll("span[lang]")].forEach(langEl => {
      const walk = node => [...node.childNodes].forEach(c => {
        if (c.nodeType === 3) {
          const frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(" "); return; }
            const s = document.createElement("span");
            s.className = "fw"; s.textContent = part; frag.append(s);
          });
          c.replaceWith(frag);
        } else if (c.nodeType === 1) walk(c);
      });
      walk(langEl);
    });
  });

  /* ---------- Reveals: only content below the first screen waits for scroll ---------- */
  const revealables = $$(".rv, .clip, [data-split]").filter(el => !el.closest(".hero"));
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.remove("pre"); io.unobserve(e.target); }
  }), { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  if (!reduce) revealables.forEach(el => {
    if (el.getBoundingClientRect().top > innerHeight * .92) { el.classList.add("pre"); io.observe(el); }
  });
  // stagger siblings inside grids
  $$("[data-stagger]").forEach(g => [...g.children].forEach((c, i) => c.style.setProperty("--d", `${(i % 4) * 90}ms`)));

  /* ---------- Loader ---------- */
  const loader = $(".loader");
  const finish = () => { root.classList.add("loaded"); setTimeout(() => loader?.remove(), 1400); };
  if (!loader || reduce) finish();
  else {
    const out = $(".loader-count b");
    const t0 = performance.now(), dur = 1000;
    const tick = now => {
      const p = clamp((now - t0) / dur);
      out.textContent = Math.round(45 * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick); else setTimeout(finish, 180);
    };
    requestAnimationFrame(tick);
    setTimeout(finish, 3000); // safety net
  }

  /* ---------- Header, menu, progress ---------- */
  const hdr = $(".hdr");
  const burger = $(".burger");
  burger.addEventListener("click", () => {
    const open = document.body.classList.toggle("menu-open");
    burger.setAttribute("aria-expanded", open);
    schedule();
  });
  $$(".nav a").forEach(a => a.addEventListener("click", () => {
    document.body.classList.remove("menu-open"); burger.setAttribute("aria-expanded", false);
  }));

  /* ---------- Tabs ---------- */
  const tabs = $$("[role=tab]");
  tabs.forEach(t => t.addEventListener("click", () => {
    tabs.forEach(o => {
      o.setAttribute("aria-selected", o === t);
      document.getElementById(o.getAttribute("aria-controls")).hidden = o !== t;
    });
    measure();
  }));

  /* ---------- Pointer effects (desktop only) ---------- */
  if (finePointer && !reduce) {
    const hero = $(".hero");
    hero.addEventListener("pointermove", e => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty("--mx", ((e.clientX - r.left) / r.width - .5) * 2);
      hero.style.setProperty("--my", ((e.clientY - r.top) / r.height - .5) * 2);
    });
    const pl = $(".pl");
    pl.addEventListener("pointermove", e => {
      const r = pl.getBoundingClientRect();
      pl.style.setProperty("--sx", `${e.clientX - r.left}px`);
      pl.style.setProperty("--sy", `${e.clientY - r.top}px`);
    });
    $$(".magnetic").forEach(btn => {
      btn.addEventListener("pointermove", e => {
        const r = btn.getBoundingClientRect();
        btn.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .22}px, ${(e.clientY - r.top - r.height / 2) * .32}px)`;
      });
      btn.addEventListener("pointerleave", () => { btn.style.transition = "transform .6s cubic-bezier(.2,.7,.1,1), color .5s, border-color .5s"; btn.style.transform = ""; });
      btn.addEventListener("pointerenter", () => { btn.style.transition = "color .5s, border-color .5s"; });
    });
  }

  /* ---------- Scroll-linked motion ---------- */
  const parallax = $$("[data-speed]");
  const hs = $(".hs"), track = $(".hs-track"), hsCount = $(".hs-count b"), hsBar = $(".hs-bar");
  const slides = $$(".slide", track);
  const orb = $(".orb"), deg = $(".deg"), manifesto = $(".manifesto"), motto = $(".motto");
  const stack = $$(".stack-card");
  let hsDist = 0, lastY = 0, ticking = false;

  function measure() {
    if (desktop.matches && hs && hs.offsetParent) {
      hsDist = Math.max(0, track.scrollWidth - innerWidth);
      hs.style.height = `${hsDist + innerHeight}px`;
    } else if (hs) { hs.style.height = ""; hsDist = 0; track.style.transform = ""; }
    schedule();
  }

  // progress of an element through the viewport: 0 when its top hits `start`, 1 when its bottom hits `end`
  const prog = (el, start = 1, end = 0) => {
    const r = el.getBoundingClientRect();
    const a = innerHeight * start, b = innerHeight * end - r.height;
    return clamp((a - r.top) / (a - b));
  };

  function frame() {
    ticking = false;
    const y = scrollY;
    const docH = document.documentElement.scrollHeight - innerHeight;
    hdr.style.setProperty("--p", docH > 0 ? y / docH : 0);
    const menuOpen = document.body.classList.contains("menu-open");
    hdr.classList.toggle("solid", y > 40 || menuOpen);
    hdr.classList.toggle("hide", !menuOpen && y > innerHeight && y > lastY + 4);
    if (y < lastY - 4 || y < innerHeight) hdr.classList.remove("hide");
    lastY = y;

    if (reduce) return;

    const k = desktop.matches ? 1 : .45;
    parallax.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) return;
      const off = (r.top + r.height / 2 - innerHeight / 2) * parseFloat(el.dataset.speed) * k;
      el.style.transform = `translate3d(0, ${off.toFixed(1)}px, 0)`;
    });

    if (manifesto) {
      const p = prog(manifesto, .85, .55);
      const words = $$(`.fill [lang="${root.dataset.lang}"] .fw`, manifesto);
      const lit = Math.round(p * words.length * 1.15);
      words.forEach((w, i) => w.classList.toggle("lit", i < lit));
    }

    if (orb) {
      const p = prog(orb, .95, .35);
      orb.style.setProperty("--r", `${26 + p * 50}%`);
      orb.style.setProperty("--rp", p.toFixed(3));
    }

    if (deg) deg.style.setProperty("--s", prog(deg, .9, .5).toFixed(3));

    if (motto) {
      const p = prog(motto, 1, 0);
      motto.style.setProperty("--mx2", `${(-p * 28).toFixed(2)}%`);
      $(".motto-line.rev", motto).style.transform = `translateX(${(-28 + p * 28).toFixed(2)}%)`;
    }

    if (desktop.matches) {
      stack.forEach((card, i) => {
        const next = stack[i + 1];
        const media = $(".stack-media", card);
        if (!next) { media.style.setProperty("--sc", 1); media.style.setProperty("--br", 1); return; }
        const p = clamp(1 - next.getBoundingClientRect().top / innerHeight);
        media.style.setProperty("--sc", (1 - p * .1).toFixed(4));
        media.style.setProperty("--br", (1 - p * .55).toFixed(3));
      });
    }

    if (hs && hsDist > 0) {
      const r = hs.getBoundingClientRect();
      const p = clamp(-r.top / hsDist);
      track.style.transform = `translate3d(${(-p * hsDist).toFixed(1)}px, 0, 0)`;
      hsBar.style.setProperty("--hp", p.toFixed(4));
      hsCount.textContent = String(Math.min(slides.length, Math.floor(p * (slides.length - 1) + 1.5))).padStart(2, "0");
    }
  }

  // mobile carousel counter
  track?.addEventListener("scroll", () => {
    if (desktop.matches) return;
    const p = track.scrollLeft / Math.max(1, track.scrollWidth - track.clientWidth);
    hsBar.style.setProperty("--hp", p.toFixed(4));
    hsCount.textContent = String(Math.round(p * (slides.length - 1)) + 1).padStart(2, "0");
  }, { passive: true });

  function schedule() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", measure);
  desktop.addEventListener?.("change", measure);
  addEventListener("load", measure);

  // active nav link
  const navIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) $$(".nav a").forEach(a => a.classList.toggle("on", a.getAttribute("href") === `#${e.target.id}`));
  }), { rootMargin: "-45% 0px -50% 0px" });
  $$("main section[id]").forEach(s => navIO.observe(s));

  setLang(q || saved || "hr");
  const yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();
  measure();
})();
