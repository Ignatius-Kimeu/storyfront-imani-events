/* Imani Events — shared behaviour for every page. Vanilla JS, no libraries. */
(() => {
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINE = matchMedia("(pointer: fine)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const WA = "254723413097";

  /* ---------- splash ---------- */
  const splash = $(".splash");
  const startHero = () => { const sc = $(".scene"); if (sc) setTimeout(() => sc.classList.add("open"), RM ? 0 : 250); };
  let splashDone = false;
  const endSplash = () => {
    if (splashDone) return; splashDone = true;
    if (splash) splash.classList.add("done");
    startHero();
  };
  if (splash) {
    window.addEventListener("load", () => setTimeout(endSplash, RM ? 0 : 650));
    setTimeout(endSplash, 2600); // never hold the page hostage on slow data
  } else startHero();

  /* ---------- smart sticky header ---------- */
  const hdr = $(".hdr");
  let lastY = scrollY, ticking = false;
  const onScroll = () => {
    const y = scrollY;
    if (hdr) {
      hdr.classList.toggle("scrolled", y > 10);
      if (!document.documentElement.classList.contains("menu-open")) {
        if (y > lastY + 6 && y > 140) hdr.classList.add("hide");
        else if (y < lastY - 6 || y < 140) hdr.classList.remove("hide");
      }
    }
    lastY = y; ticking = false;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { onScroll(); heroScroll(); printScroll(); }); } }, { passive: true });

  /* ---------- mobile menu ---------- */
  const mb = $(".menu-btn");
  if (mb) mb.addEventListener("click", () => {
    const open = document.documentElement.classList.toggle("menu-open");
    mb.setAttribute("aria-expanded", open);
    hdr.classList.remove("hide");
  });
  $$(".mobile-panel a").forEach(a => a.addEventListener("click", () => {
    document.documentElement.classList.remove("menu-open"); mb && mb.setAttribute("aria-expanded", "false");
  }));
  addEventListener("keydown", e => { if (e.key === "Escape" && document.documentElement.classList.contains("menu-open")) mb.click(); });

  /* ---------- reveals ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px", threshold: .12 });
  $$(".fold,.rise").forEach(el => RM ? el.classList.add("in") : io.observe(el));

  /* ---------- hero: the invitation ---------- */
  const scene = $(".scene");
  function heroScroll() {
    if (!scene || RM) return;
    const p = Math.min(1, Math.max(0, scrollY / (innerHeight * .9)));
    scene.style.setProperty("--sp", p.toFixed(3));
  }
  if (scene && !RM) {
    let tx = 0, ty = 0, cx = 0, cy = 0, raf;
    const loop = () => {
      cx += (tx - cx) * .07; cy += (ty - cy) * .07;
      scene.style.setProperty("--ry", (cx * 12).toFixed(2) + "deg");
      scene.style.setProperty("--rx", (-cy * 9).toFixed(2) + "deg");
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > .001 ? requestAnimationFrame(loop) : null;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    if (FINE) addEventListener("pointermove", e => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; kick(); }, { passive: true });
    // phones: gentle gyro tilt where the browser allows it without a permission prompt
    if (!FINE && "DeviceOrientationEvent" in window && typeof DeviceOrientationEvent.requestPermission !== "function") {
      addEventListener("deviceorientation", e => {
        if (e.gamma == null) return;
        tx = Math.max(-.5, Math.min(.5, e.gamma / 50)); ty = Math.max(-.5, Math.min(.5, (e.beta - 45) / 60)); kick();
      }, { passive: true });
    }
  }

  /* ---------- tilt on hover (cards, prints, guestbook) ---------- */
  if (FINE && !RM) $$("[data-tilt]").forEach(el => {
    const max = parseFloat(el.dataset.tilt) || 5;
    el.addEventListener("pointermove", e => {
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.setProperty("--ty", (x * max).toFixed(2) + "deg");
      el.style.setProperty("--tx", (-y * max).toFixed(2) + "deg");
      el.style.setProperty("--sx", (100 - (x + .5) * 140).toFixed(0) + "%");
    });
    el.addEventListener("pointerleave", () => { el.style.setProperty("--tx", "0deg"); el.style.setProperty("--ty", "0deg"); el.style.setProperty("--sx", "120%"); });
  });

  /* ---------- scroll-linked tilt on gallery prints (kept under ±1°) ---------- */
  const scrollPrints = $$(".gallery-grid .print");
  function printScroll() {
    if (RM || !scrollPrints.length) return;
    const h = innerHeight;
    scrollPrints.forEach(p => {
      const r = p.getBoundingClientRect();
      if (r.bottom < 0 || r.top > h) return;
      const k = ((r.top + r.height / 2) / h - .5) * 2; // -1..1
      p.style.setProperty("--i", (k * (p.dataset.dir === "l" ? -.9 : .9)).toFixed(3));
    });
  }
  scrollPrints.forEach((p, i) => p.dataset.dir = i % 2 ? "l" : "r");
  printScroll();

  /* ---------- lightbox (all photo grids) ---------- */
  const groups = {};
  $$("[data-lb]").forEach(b => (groups[b.dataset.lb] ||= []).push(b));
  let lb, lbImg, lbCap, lbCount, cur = [], idx = 0, lastFocus;
  const buildLb = () => {
    lb = document.createElement("div");
    lb.className = "lb"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true"); lb.setAttribute("aria-label", "Photo viewer");
    lb.innerHTML = `<div class="lb-top"><span class="lb-count"></span><button class="icon-btn lb-close" aria-label="Close">${ICON.x}</button></div>
      <div class="lb-stage"><button class="icon-btn lb-nav lb-prev" aria-label="Previous photo">${ICON.l}</button><img alt=""><button class="icon-btn lb-nav lb-next" aria-label="Next photo">${ICON.r}</button></div>
      <p class="lb-cap"></p>`;
    document.body.append(lb);
    lbImg = $("img", lb); lbCap = $(".lb-cap", lb); lbCount = $(".lb-count", lb);
    $(".lb-close", lb).onclick = closeLb; $(".lb-prev", lb).onclick = () => show(idx - 1); $(".lb-next", lb).onclick = () => show(idx + 1);
    lb.addEventListener("click", e => { if (e.target === lb || e.target.classList.contains("lb-stage")) closeLb(); });
    let sx = null;
    lb.addEventListener("touchstart", e => sx = e.touches[0].clientX, { passive: true });
    lb.addEventListener("touchend", e => { if (sx == null) return; const d = e.changedTouches[0].clientX - sx; if (Math.abs(d) > 50) show(idx + (d < 0 ? 1 : -1)); sx = null; });
  };
  const show = i => {
    idx = (i + cur.length) % cur.length; const b = cur[idx];
    lbImg.src = b.dataset.full; lbImg.alt = $("img", b).alt;
    lbCap.textContent = b.dataset.caption || $("img", b).alt;
    lbCount.textContent = `${idx + 1} / ${cur.length}`;
  };
  function closeLb() { lb.classList.remove("open"); document.body.style.overflow = ""; lastFocus && lastFocus.focus(); }
  Object.values(groups).forEach(g => g.forEach((b, i) => b.addEventListener("click", () => {
    if (!lb) buildLb(); cur = g; lastFocus = b; show(i);
    lb.classList.add("open"); document.body.style.overflow = "hidden"; $(".lb-close", lb).focus();
  })));
  addEventListener("keydown", e => {
    if (!lb || !lb.classList.contains("open")) return;
    if (e.key === "Escape") closeLb(); if (e.key === "ArrowRight") show(idx + 1); if (e.key === "ArrowLeft") show(idx - 1);
  });

  /* ---------- films: muted autoplay in view, one sound at a time, full-size player ---------- */
  const films = $$(".film video");
  const setSound = (v, on) => {
    v.muted = !on; const b = v.closest(".film").querySelector(".snd");
    b.setAttribute("aria-pressed", on); b.innerHTML = on ? ICON.on : ICON.off; b.setAttribute("aria-label", on ? "Mute film" : "Play sound");
  };
  const vio = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) {
      if (!v.src) v.src = v.dataset.src;
      if (!RM) v.play().catch(() => {});
    } else { v.pause(); if (!v.muted) setSound(v, false); }
  }), { threshold: .5 });
  films.forEach(v => {
    vio.observe(v);
    const f = v.closest(".film");
    $(".snd", f).addEventListener("click", () => {
      const on = v.muted;
      films.forEach(o => { if (o !== v && !o.muted) setSound(o, false); });
      if (!v.src) v.src = v.dataset.src;
      setSound(v, on); if (on) v.play().catch(() => {});
    });
    const openFull = () => openFilm(v);
    $(".full", f).addEventListener("click", openFull);
    v.addEventListener("click", openFull);
  });
  let fo;
  function openFilm(v) {
    films.forEach(o => { o.pause(); if (!o.muted) setSound(o, false); });
    if (!fo) {
      fo = document.createElement("div"); fo.className = "lb"; fo.setAttribute("role", "dialog"); fo.setAttribute("aria-modal", "true"); fo.setAttribute("aria-label", "Film player");
      fo.innerHTML = `<div class="lb-top"><span class="fo-title"></span><button class="icon-btn fo-close" aria-label="Close">${ICON.x}</button></div>
        <div class="lb-stage"><video playsinline loop></video><div class="fo-ui"><button class="icon-btn fo-play" aria-label="Pause">${ICON.pause}</button><button class="icon-btn fo-snd" aria-label="Mute">${ICON.on}</button></div></div><p class="lb-cap"></p>`;
      document.body.append(fo);
      const fv = $("video", fo);
      $(".fo-close", fo).onclick = closeFilm;
      $(".fo-play", fo).onclick = () => { fv.paused ? fv.play() : fv.pause(); };
      fv.onplay = () => { $(".fo-play", fo).innerHTML = ICON.pause; $(".fo-play", fo).setAttribute("aria-label", "Pause"); };
      fv.onpause = () => { $(".fo-play", fo).innerHTML = ICON.play; $(".fo-play", fo).setAttribute("aria-label", "Play"); };
      fv.onclick = () => { fv.paused ? fv.play() : fv.pause(); };
      $(".fo-snd", fo).onclick = () => { fv.muted = !fv.muted; $(".fo-snd", fo).innerHTML = fv.muted ? ICON.off : ICON.on; $(".fo-snd", fo).setAttribute("aria-label", fv.muted ? "Play sound" : "Mute"); };
      addEventListener("keydown", e => { if (e.key === "Escape" && fo.classList.contains("open")) closeFilm(); });
    }
    const fv = $("video", fo), f = v.closest(".film");
    fv.src = v.dataset.src; fv.poster = v.poster; fv.muted = false; fv.currentTime = 0;
    $(".fo-snd", fo).innerHTML = ICON.on;
    $(".fo-title", fo).textContent = $("figcaption b", f)?.textContent || "";
    $(".lb-cap", fo).textContent = $("figcaption span", f)?.textContent || "";
    fo.classList.add("open"); document.body.style.overflow = "hidden";
    fv.play().catch(() => { fv.muted = true; $(".fo-snd", fo).innerHTML = ICON.off; fv.play().catch(() => {}); });
    $(".fo-close", fo).focus();
  }
  function closeFilm() { const fv = $("video", fo); fv.pause(); fv.removeAttribute("src"); fv.load(); fo.classList.remove("open"); document.body.style.overflow = ""; }

  /* ---------- booking: reply card -> structured WhatsApp message ---------- */
  const book = $("#book-form");
  if (book) {
    const reply = book.closest(".reply"), pre = $("#msg-preview"), send = $("#send-wa"), err = $("#book-err");
    const val = n => (book.elements[n]?.value || "").trim();
    const fmtDate = s => { if (!s) return "Not set yet"; const d = new Date(s + "T00:00"); return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); };
    book.addEventListener("submit", e => {
      e.preventDefault();
      if (!book.checkValidity()) { err.textContent = "Please add your name, the event type and the service you need."; book.reportValidity(); return; }
      err.textContent = "";
      const lines = [
        "Hello Imani Events ✨",
        "I'd like to enquire about planning an event.",
        "",
        `• Name: ${val("name")}`,
        `• Event: ${val("event")}`,
        `• Service: ${val("service")}`,
        `• Date: ${fmtDate(val("date"))}`,
        `• Location / venue: ${val("venue") || "Not decided yet"}`,
        `• Guests: ${val("guests") || "Not sure yet"}`,
        `• Budget guide: ${val("budget") || "Prefer to discuss"}`
      ];
      if (val("vision")) lines.push("", "My vision:", val("vision"));
      lines.push("", "(Sent from the Imani Events website)");
      const msg = lines.join("\n");
      pre.textContent = msg;
      send.href = `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
      reply.classList.add("flipped");
      $(".reply-front", reply).setAttribute("aria-hidden", "true"); $(".reply-back", reply).removeAttribute("aria-hidden");
      setTimeout(() => send.focus({ preventScroll: true }), RM ? 0 : 700);
      // keep the flipped card's height in step with the form side
      reply.scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "start" });
    });
    $("#edit-msg").addEventListener("click", () => {
      reply.classList.remove("flipped");
      $(".reply-back", reply).setAttribute("aria-hidden", "true"); $(".reply-front", reply).removeAttribute("aria-hidden");
      book.elements.name.focus({ preventScroll: true });
    });
  }

  /* ---------- review guestbook (FormSubmit) ---------- */
  const rv = $("#review-form");
  if (rv) {
    if (new URLSearchParams(location.search).get("review") === "thanks") {
      $("#review-thanks").classList.add("show");
    }
    rv.addEventListener("submit", e => {
      if (rv.elements._honey.value) { e.preventDefault(); return; }
      if (!rv.checkValidity()) { e.preventDefault(); $("#review-err").textContent = "Please add your name and a few words about your event."; rv.reportValidity(); }
    });
  }

  /* keep the floating WhatsApp button off the keyboard while someone is filling in a form */
  const fab = $(".fab");
  if (fab) {
    document.addEventListener("focusin", e => { if (e.target.matches("input,select,textarea")) fab.style.display = "none"; });
    document.addEventListener("focusout", () => { fab.style.display = ""; });
  }

  /* footer year */
  $$(".yr").forEach(y => y.textContent = new Date().getFullYear());
})();

/* icons (inline SVG strings) */
var ICON = {
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  l: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M15 5l-7 7 7 7"/></svg>',
  r: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 5l7 7-7 7"/></svg>',
  on: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"/></svg>',
  off: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>'
};
