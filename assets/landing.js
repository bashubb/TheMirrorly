// Shared behaviour for bashubb app sites: island nav, scroll reveals,
// word-by-word tagline, current section in the nav and sticky scroll scenes.
// Page scripts register scenes with Landing.scene(name, fn(p, el)).
(function () {
  const root = document.documentElement;
  root.classList.remove("no-js");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");

  // Island nav + full screen menu
  const burger = document.querySelector(".burger");
  const menu = document.getElementById("menu");
  function setMenu(open) {
    if (!burger || !menu) return;
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.classList.toggle("open", open);
    menu.inert = !open;
    document.body.style.overflow = open ? "hidden" : "";
  }
  if (burger && menu) {
    menu.inert = true;
    burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
    menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
    addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
  }

  // Nav: a pill that morphs into a full-width bar once the page scrolls
  const island = document.querySelector(".island");
  if (island && !island.classList.contains("solid")) {
    const row = document.createElement("div");
    row.className = "island-row";
    while (island.firstChild) row.append(island.firstChild);
    island.append(row);
    let docked = false, pillW = 0;
    const geometry = () => {
      island.classList.remove("docked"); row.style.setProperty("--row-w", "auto"); row.style.width = "auto";
      pillW = row.getBoundingClientRect().width;
      row.style.width = "";
      const barW = Math.min(innerWidth - 2 * parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--gutter") || 24), 1120);
      const r = row.getBoundingClientRect(), ir = island.getBoundingClientRect();
      island.style.setProperty("--pill-t", (r.top - ir.top) + "px");
      island.style.setProperty("--pill-s", Math.max(0, (innerWidth - pillW) / 2) + "px");
      island.style.setProperty("--pill-b", Math.max(0, ir.bottom - r.bottom) + "px");
      island.dataset.pill = pillW; island.dataset.bar = barW;
      island.classList.toggle("docked", docked);
      row.style.setProperty("--row-w", (docked ? barW : pillW) + "px");
    };
    const dock = () => {
      const d = scrollY > 24 || innerWidth <= 720;   // phones: always the bar, never the pill
      if (d === docked) return;
      docked = d;
      island.classList.toggle("docked", d);
      row.style.setProperty("--row-w", (d ? +island.dataset.bar : +island.dataset.pill) + "px");
    };
    geometry();
    if (document.fonts) document.fonts.ready.then(geometry);
    addEventListener("resize", () => { requestAnimationFrame(() => { geometry(); docked = !docked; dock(); }); });
    addEventListener("scroll", dock, { passive: true }); dock();
  }

  // Scroll reveal
  const revealIO = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); revealIO.unobserve(e.target); }
  }, { rootMargin: "0px 0px -10% 0px" });
  document.querySelectorAll(".reveal").forEach((el) => revealIO.observe(el));

  // Tagline: split into words; each word lights up as it crosses 55% of the viewport.
  document.querySelectorAll("[data-tagline]").forEach((el) => {
    const walk = (node) => {
      for (const child of [...node.childNodes]) {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(part); return; }
            const s = document.createElement("span");
            s.className = "w" + (node.classList && node.classList.contains("hl") ? " hl" : "");
            s.textContent = part;
            frag.append(s);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== "BR") walk(child);
      }
    };
    walk(el);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const above = e.isIntersecting || e.boundingClientRect.top < 0;
        e.target.classList.toggle("on", above);
      }
    }, { rootMargin: "0px 0px -45% 0px" });
    el.querySelectorAll(".w").forEach((w) => io.observe(w));
  });

  // Current section in the nav
  const navLinks = [...document.querySelectorAll('.island .links a[href^="#"]')];
  if (navLinks.length) {
    const map = new Map(navLinks.map((a) => [a.getAttribute("href").slice(1), a]));
    const navIO = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        navLinks.forEach((a) => a.removeAttribute("aria-current"));
        const a = map.get(e.target.id);
        if (a) a.setAttribute("aria-current", "true");
      }
    }, { rootMargin: "-45% 0px -50% 0px" });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) navIO.observe(s); });
  }

  // Sticky scroll scenes: one passive listener, throttled through requestAnimationFrame.
  const scenes = new Map();
  const active = new Set();
  const sceneIO = new IntersectionObserver((entries) => {
    for (const e of entries) e.isIntersecting ? active.add(e.target) : active.delete(e.target);
    tick();
  });
  let queued = false;
  function update() {
    queued = false;
    const vh = innerHeight;
    for (const el of active) {
      const r = el.getBoundingClientRect();
      const span = Math.max(1, r.height - vh);
      const p = Math.min(1, Math.max(0, -r.top / span));
      el.style.setProperty("--p", p.toFixed(4));
      const fn = scenes.get(el.dataset.scene);
      if (fn) fn(p, el);
    }
  }
  function tick() { if (!queued) { queued = true; requestAnimationFrame(update); } }
  addEventListener("scroll", tick, { passive: true });
  addEventListener("resize", tick);

  // Real 3D iPhones: body layers for the edge, then the back with the camera plateau.
  const LAYERS = 16;
  document.querySelectorAll(".iphone").forEach((ph) => {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < LAYERS; i++) {
      const l = document.createElement("span");
      const f = i / (LAYERS - 1);                       // 0 back … 1 front
      l.className = "layer" + (i === 0 ? " shadow" : "");
      // brushed edge: brighter in the middle of the band, darker toward both faces
      const shade = Math.sin(f * Math.PI);
      l.style.setProperty("--c", shade > 0.75 ? "var(--edge-hi)" : shade > 0.35 ? "var(--edge-mid)" : "var(--edge-lo)");
      l.style.transform = `translateZ(calc(var(--w) * var(--depth) * ${(f - 0.5).toFixed(3)} - ${i === LAYERS - 1 ? 1 : 0}px))`;
      frag.append(l);
    }
    const back = document.createElement("span");
    back.className = "back";
    back.innerHTML = '<span class="plateau"><i class="lens a"></i><i class="lens b"></i><i class="lens c"></i><i class="flash"></i><i class="mic"></i><i class="lidar"></i></span><span class="glass"></span>';
    frag.append(back);
    ph.prepend(frag);
  });

  window.Landing = {
    reduceMotion: () => reduce.matches,
    scene(name, fn) {
      scenes.set(name, fn);
      document.querySelectorAll(`[data-scene="${name}"]`).forEach((el) => sceneIO.observe(el));
      tick();
    },
    clamp: (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)),
    // Show the back of a 3D iPhone when its total Y rotation (degrees) turns it away from the viewer
    phoneSide(el, deg) { const c = Math.cos((deg * Math.PI) / 180); el.dataset.side = c < 0 ? "back" : "front"; },
    // progress of p inside [a, b], eased
    range(p, a, b) { const t = Math.min(1, Math.max(0, (p - a) / (b - a))); return t; },
    ease(t) { return 1 - Math.pow(1 - t, 3); },
  };
  document.querySelectorAll("[data-scene]").forEach((el) => sceneIO.observe(el));
})();
