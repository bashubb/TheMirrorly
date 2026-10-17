// Shared behaviour for bashubb app sites: island nav, scroll reveals,
// word-by-word tagline, current section in the nav and sticky scroll scenes.
// Page scripts register scenes with Landing.scene(name, fn(p, el)).
(function () {
  const root = document.documentElement;
  root.classList.remove("no-js");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  // Phones (portrait and landscape) get their own layout; keep in sync with the query in landing.css
  const phoneMQ = matchMedia("(max-width: 720px), (pointer: coarse) and (max-height: 540px)");
  const phone = phoneMQ.matches;
  root.classList.toggle("is-phone", phone);

  // A phone on its side: show the portrait page, scaled down to fit the height (a frame of the same page).
  // Everything stays whole and nothing stretches; small enough to invite turning the phone back.
  const landMQ = matchMedia("(pointer: coarse) and (orientation: landscape) and (max-height: 540px)");
  const embedded = window.self !== window.top;
  const fitHost = landMQ.matches && !embedded;
  root.classList.toggle("fit-host", fitHost);
  addEventListener("orientationchange", () => { if (matchMedia("(pointer: coarse)").matches) setTimeout(() => location.reload(), 50); });
  landMQ.addEventListener("change", () => { if (!embedded) location.reload(); });
  if (fitHost) {
    document.querySelectorAll("video").forEach((v) => { v.pause(); v.removeAttribute("autoplay"); v.autoplay = false; v.preload = "none"; v.play = () => Promise.resolve(); });
    const short = Math.min(screen.width, screen.height), long = Math.max(screen.width, screen.height);
    const fw = Math.round(short), fh = Math.round(long * 0.86);           // a portrait viewport of this phone, minus Safari's bars
    const f = document.createElement("iframe");
    f.className = "fit-frame"; f.title = document.title; f.src = location.href;
    f.style.width = fw + "px"; f.style.height = fh + "px";
    const place = () => {
      const s = innerHeight / fh;
      f.style.transform = `translate3d(${((innerWidth - fw * s) / 2).toFixed(1)}px, 0, 0) scale(${s.toFixed(4)})`;
    };
    place(); addEventListener("resize", place);
    document.body.append(f);
  }
  // inside the frame, pages and the App Store open full size, not inside the small frame
  if (embedded) document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (a && !a.getAttribute("href").startsWith("#")) a.target = "_top";
  }, true);

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
      const keep = island.classList.contains("keep-pill");   // a site can keep the pill on desktop
      const d = phone || !keep;   // a fixed bar everywhere; only "keep-pill" sites keep the pill on desktop
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

  // Card mockups: once a phone has stood up, drop the perspective so it is perfectly flat
  document.addEventListener("transitionend", (e) => {
    if (e.propertyName !== "transform" || !e.target.classList || !e.target.classList.contains("iphone")) return;
    const box = e.target.parentElement;
    if (box && box.closest(".in")) box.classList.add("settled");
  });

  // crossing between the desktop scenes and the phone layout (resizing a desktop window) starts clean
  phoneMQ.addEventListener("change", () => { if (!fitHost) location.reload(); });
  // links to a desktop scene go to its phone version (#how → #how-m) when there is one
  if (phone) document.querySelectorAll('a[href^="#"]').forEach((a) => {
    const id = a.getAttribute("href").slice(1);
    if (id && document.getElementById(id + "-m")) a.setAttribute("href", "#" + id + "-m");
  });

  // Carousels: [data-carousel] > .m-track (slides) + .m-dots. Two ways: they move by themselves, in a loop
  // (transform, not scrolling), and a sideways swipe moves them too. A finger held still pauses them;
  // a swipe up or down belongs to the page (touch-action: pan-y). Fires "slide" (detail = index) on change.
  document.querySelectorAll("[data-carousel]").forEach((car) => {
    const track = car.querySelector(".m-track"), slides = [...track.children], dots = car.querySelector(".m-dots");
    const n = slides.length, dur = +car.dataset.carousel || 5000;
    track.setAttribute("aria-roledescription", "carousel");
    slides.forEach((s, i) => { s.setAttribute("role", "group"); s.setAttribute("aria-roledescription", "slide"); s.setAttribute("aria-label", `${i + 1} of ${n}`); });
    const loop = slides[0].cloneNode(true);             // the first slide again at the end: the loop never runs backwards
    loop.setAttribute("aria-hidden", "true"); loop.removeAttribute("id"); loop.querySelectorAll("[id]").forEach((e) => e.removeAttribute("id"));
    track.append(loop);
    const btns = slides.map((_, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.setAttribute("aria-label", `Show ${i + 1} of ${n}`);
      b.addEventListener("click", () => show(i, true));
      dots && dots.append(b);
      return b;
    });
    let pos = 0, timer = 0, left = dur, since = 0, visible = false, holding = false, dragging = false;
    const auto = !reduce.matches;
    const place = (x, animate) => {                     // x in slides (may be fractional while dragging)
      track.style.transition = animate ? `transform ${reduce.matches ? 0 : 700}ms var(--ease)` : "none";
      track.style.transform = `translate3d(${(-x * 100).toFixed(3)}%, 0, 0)`;
    };
    let cur = -1;
    const mark = (i) => {
      if (i === cur) return;
      cur = i;
      btns.forEach((b, k) => b.setAttribute("aria-current", String(k === i)));
      slides.forEach((s, k) => s.classList.toggle("on", k === i));
      car.dispatchEvent(new CustomEvent("slide", { detail: i }));
    };
    const show = (i, animate) => { pos = i; place(i, animate); mark(i % n); left = dur; run(); };
    track.addEventListener("transitionend", (e) => { if (e.target === track && pos === n) { pos = 0; place(0, false); } });
    const next = () => { if (pos === n) { pos = 0; place(0, false); void track.offsetWidth; } show(pos + 1, true); };
    const prev = () => { if (pos === 0) { pos = n; place(n, false); void track.offsetWidth; } show(pos - 1, true); };
    const run = () => {
      clearTimeout(timer);
      if (!auto || !visible || holding || dragging || document.hidden) return;
      since = performance.now();
      timer = setTimeout(next, left);
    };
    const pause = () => { clearTimeout(timer); left = Math.max(0, left - (performance.now() - since)); };
    // touch: hold still to pause, swipe sideways to move; vertical movement stays the page's.
    // Touch events (iOS Safari's most reliable path): the first clear direction decides, sideways blocks the page scroll.
    let x0 = 0, y0 = 0, t0 = 0, ht = 0, w = 1, base = 0, axis = "";
    const begin = (x, y) => {
      x0 = x; y0 = y; t0 = performance.now(); w = track.clientWidth || 1; axis = "";
      clearTimeout(ht);
      ht = setTimeout(() => { if (!axis) { holding = true; pause(); } }, 180);
    };
    const move = (x, y, e) => {
      const dx = x - x0, dy = y - y0;
      if (!axis && Math.hypot(dx, dy) > 8) {
        clearTimeout(ht);
        axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (axis === "x") {
          dragging = true; pause();
          if (holding) holding = false;
          if (pos === n) pos = 0; else if (pos === 0 && dx > 0) pos = n;
          base = pos;
        }
      }
      if (axis !== "x") return;
      if (e && e.cancelable) e.preventDefault();
      place(base - dx / w, false);
    };
    const end = (x) => {
      clearTimeout(ht);
      if (dragging) {
        dragging = false;
        const dx = x - x0, v = dx / Math.max(1, performance.now() - t0);
        pos = base;
        if (dx < -w * 0.2 || v < -0.4) next();
        else if (dx > w * 0.2 || v > 0.4) prev();
        else show(pos, true);
      }
      if (holding) { holding = false; left = dur; }
      axis = ""; run();
    };
    let lastX = 0;
    const area = car.closest("section") || track;           // the whole section answers to a swipe, not just the slides
    area.style.touchAction = "pan-y";
    area.addEventListener("touchstart", (e) => { const t = e.touches[0]; lastX = t.clientX; begin(t.clientX, t.clientY); }, { passive: true });
    area.addEventListener("touchmove", (e) => { const t = e.touches[0]; lastX = t.clientX; move(t.clientX, t.clientY, e); }, { passive: false });
    area.addEventListener("touchend", () => end(lastX), { passive: true });
    area.addEventListener("touchcancel", () => end(lastX), { passive: true });
    // mouse (desktop testing): the same with pointer events
    let mouse = false;
    area.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") return; mouse = true; begin(e.clientX, e.clientY); });
    addEventListener("pointermove", (e) => { if (mouse) move(e.clientX, e.clientY, null); });
    addEventListener("pointerup", (e) => { if (mouse) { mouse = false; end(e.clientX); } });
    track.addEventListener("contextmenu", (e) => e.preventDefault());
    new IntersectionObserver((es) => es.forEach((e) => { visible = e.isIntersecting; if (visible) run(); else pause(); }), { threshold: 0.5 }).observe(car);
    document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); else run(); });
    addEventListener("resize", () => place(pos, false));
    show(0, false);
  });

  // The film that opens the phone page: fills the screen, starts from the beginning and plays each time it
  // comes into view, and holds the page while it is on screen (touch-action: none, so Safari itself can't scroll).
  // A hard swipe or Skip leaves early; when it ends the page scrolls on to the next section by itself.
  document.querySelectorAll("[data-film-intro]").forEach((sec) => {
    if (!phone || fitHost) return;
    const v = sec.querySelector("video"), skip = sec.querySelector(".film-intro-skip");
    const tall = innerHeight >= innerWidth;
    // iOS autoplays only a muted inline video: set it all as properties too, before the source
    v.muted = true; v.defaultMuted = true; v.playsInline = true; v.autoplay = !reduce.matches;
    v.setAttribute("muted", ""); v.setAttribute("playsinline", "");
    v.poster = tall ? v.dataset.tallPoster : v.dataset.widePoster;
    v.src = tall ? v.dataset.tall : v.dataset.wide;
    const end = +v.dataset.end || 0;                    // a cut that must stop early (before a rewind)
    let held = false, away = true;
    const setHeld = (h) => { held = h; sec.classList.toggle("held", h); root.classList.toggle("film-held", h); };
    const relax = () => { sec.classList.remove("pulling"); sec.style.setProperty("--tug", "0px"); };
    const moveOn = () => { const n = sec.nextElementSibling; if (n) n.scrollIntoView({ behavior: reduce.matches ? "auto" : "smooth", block: "start" }); };
    const atFilm = () => scrollY < sec.offsetTop + sec.offsetHeight / 2;
    // a play() that fails while the clip is still loading is retried when it can play; only a real
    // "not allowed" (Low Power Mode) asks for a tap, which the touch handler below turns into play()
    const play = () => {
      const pr = v.play();
      if (pr) pr.catch((err) => { if (err && err.name === "NotAllowedError") sec.classList.add("tap"); });
    };
    v.addEventListener("canplay", () => { if (held && v.paused) play(); });
    v.addEventListener("playing", () => sec.classList.remove("tap"));
    const start = () => {                               // each time it shows up: from the beginning, playing, holding
      sec.classList.remove("done");
      try { v.currentTime = 0; } catch (e) {}
      if (!reduce.matches) { play(); setHeld(true); }
    };
    const finish = (jump) => {
      v.pause(); setHeld(false); relax(); sec.classList.add("done");
      if (jump) moveOn();
    };
    v.addEventListener("timeupdate", () => {
      if (end && v.currentTime >= end && !v.paused) finish(held && atFilm());
    });
    v.addEventListener("ended", () => finish(held && atFilm()));
    skip.addEventListener("click", () => finish(true));
    if (reduce.matches) { v.controls = true; sec.classList.add("done"); }
    new IntersectionObserver((es) => es.forEach((e) => {
      if (e.intersectionRatio >= 0.85 && away) { away = false; start(); }
      else if (e.intersectionRatio < 0.05) { away = true; v.pause(); setHeld(false); relax(); }
      else if (e.intersectionRatio < 0.85 && held) setHeld(false);      // half scrolled away: let the page move
    }), { threshold: [0, 0.05, 0.5, 0.85, 1] }).observe(sec);
    // the hold: a soft swipe only tugs the film; a long or fast one lets go
    let y0 = 0, t0 = 0, dy = 0;
    sec.addEventListener("touchstart", (e) => { y0 = e.touches[0].clientY; t0 = performance.now(); dy = 0; if (held && v.paused) play(); }, { passive: true });
    sec.addEventListener("click", () => { if (held && v.paused) play(); });
    sec.addEventListener("touchmove", (e) => {
      if (!held) return;
      if (e.cancelable) e.preventDefault();
      dy = y0 - e.touches[0].clientY;
      if (dy <= 0) { relax(); return; }
      const speed = dy / Math.max(1, performance.now() - t0);         // px per ms
      if (dy > 160 || speed > 1) { finish(true); return; }
      sec.classList.add("pulling");
      sec.style.setProperty("--tug", (64 * (1 - Math.exp(-dy / 140))).toFixed(1) + "px");
    }, { passive: false });
    sec.addEventListener("touchend", relax, { passive: true });
    let pull = 0, last = 0, wt = 0;
    addEventListener("wheel", (e) => {
      if (e.deltaY <= 0 || !held || !atFilm()) return;
      e.preventDefault();
      const now = performance.now();
      pull = pull * Math.exp(-(now - last) / 380) + e.deltaY; last = now;
      if (pull > 600) { pull = 0; finish(true); return; }
      sec.classList.add("pulling");
      sec.style.setProperty("--tug", (64 * (1 - Math.exp(-pull / 220))).toFixed(1) + "px");
      clearTimeout(wt); wt = setTimeout(relax, 220);
    }, { passive: false });
  });

  // Marquees drift only while on screen
  const mqIO = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle("run", e.isIntersecting)));
  document.querySelectorAll(".m-marquee").forEach((m) => mqIO.observe(m));

  // Links to a section jump straight there: no smooth scroll through the pinned scenes on the way,
  // so nothing plays backwards or flickers. Scenes pick up their state from where the page lands.
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const id = decodeURIComponent(a.getAttribute("href").slice(1));
    const t = id ? document.getElementById(id) : null;
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: "instant", block: "start" });
    history.pushState(null, "", "#" + id);
    requestAnimationFrame(() => { if (window.Landing && Landing._tick) Landing._tick(); });
  });

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
    phone,
    _tick: () => tick(),
    scene(name, fn) {
      if (phone) return;                                 // phones have no pinned scenes
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
  if (!phone) document.querySelectorAll("[data-scene]").forEach((el) => sceneIO.observe(el));
})();
