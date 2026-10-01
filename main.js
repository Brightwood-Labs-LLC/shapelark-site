(() => {
  const doc = document.documentElement;
  doc.classList.add("js");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* header: transparent over the hero, solid after it */
  const header = document.querySelector("[data-header]");
  const hero = document.querySelector(".hero");
  const setHeader = () => {
    const limit = window.matchMedia("(max-width: 760px)").matches ? 40 : Math.max(80, hero.offsetHeight - 80);
    header.classList.toggle("is-solid", window.scrollY > limit);
  };
  setHeader();
  window.addEventListener("scroll", setHeader, { passive: true });
  window.addEventListener("resize", setHeader);

  /* smooth in-page anchor jumps (programmatic scrolling stays instant) */
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute("href").length < 2) return;
    const target = document.querySelector(a.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
    history.pushState(null, "", a.getAttribute("href"));
    if (target.id === "main" || a.classList.contains("skip")) { target.setAttribute("tabindex", "-1"); target.focus({ preventScroll: true }); }
  });

  /* reveal on scroll */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion.matches) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
    // safety net: anything already scrolled past (fast flings, anchor jumps) is shown too
    const sweep = () => {
      const vh = window.innerHeight;
      reveals.forEach((el) => { if (!el.classList.contains("in") && el.getBoundingClientRect().top < vh) { el.classList.add("in"); io.unobserve(el); } });
    };
    window.addEventListener("scroll", sweep, { passive: true });
    window.addEventListener("load", sweep);
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }

  /* model / render comparison */
  document.querySelectorAll("[data-compare]").forEach((box) => {
    const range = box.querySelector(".compare-range");
    const set = (v) => {
      const pct = Math.max(0, Math.min(100, v));
      box.style.setProperty("--pos", pct + "%");
      range.value = Math.round(pct);
      range.setAttribute("aria-valuetext", Math.round(pct) + "% bare model");
    };
    range.addEventListener("input", () => set(+range.value));
    // pointer drag anywhere on the image (touch friendly); the range keeps keyboard support
    range.style.pointerEvents = "none";
    let dragging = false;
    const fromEvent = (e) => {
      const r = box.getBoundingClientRect();
      set(((e.clientX - r.left) / r.width) * 100);
    };
    box.addEventListener("pointerdown", (e) => {
      dragging = true; box.setPointerCapture(e.pointerId); fromEvent(e); range.focus({ preventScroll: true });
    });
    box.addEventListener("pointermove", (e) => { if (dragging) fromEvent(e); });
    const stop = () => { dragging = false; };
    box.addEventListener("pointerup", stop);
    box.addEventListener("pointercancel", stop);

    // a gentle one-time sweep hints that the image is interactive
    if (!reduceMotion.matches && "IntersectionObserver" in window) {
      const hint = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        hint.disconnect();
        let t0 = null;
        const dur = 1800;
        const step = (t) => {
          if (dragging) return;
          if (t0 === null) t0 = t;
          const k = Math.min(1, (t - t0) / dur);
          const ease = 0.5 - Math.cos(k * Math.PI * 2) / 2; // 0 → 1 → 0
          set(66 - ease * 26);
          if (k < 1) requestAnimationFrame(step);
        };
        setTimeout(() => requestAnimationFrame(step), 500);
      }, { threshold: 0.6 });
      hint.observe(box);
    }
    set(66);
  });

  /* turntable video: plays in view unless reduced motion; always pausable */
  document.querySelectorAll(".frame-video").forEach((frame) => {
    const video = frame.querySelector("video");
    const btn = frame.querySelector("[data-video-toggle]");
    let userPaused = reduceMotion.matches;
    const sync = () => btn.setAttribute("aria-pressed", String(!video.paused));
    video.addEventListener("play", sync);
    video.addEventListener("pause", sync);
    btn.addEventListener("click", () => {
      if (video.paused) { userPaused = false; video.play().catch(() => {}); }
      else { userPaused = true; video.pause(); }
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting && !userPaused) { video.preload = "auto"; video.play().catch(() => {}); }
        else if (!e.isIntersecting && !video.paused) video.pause();
      }, { threshold: 0.35 }).observe(video);
    }
    sync();
  });

  /* copy email */
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    const label = btn.querySelector("[data-copy-label]");
    const status = document.querySelector("[data-copy-status]");
    const original = label.textContent;
    btn.addEventListener("click", async () => {
      const text = btn.getAttribute("data-copy");
      let ok = false;
      try { await navigator.clipboard.writeText(text); ok = true; } catch (_) { ok = false; }
      label.textContent = ok ? "Copied" : text;
      if (status) status.textContent = ok ? "Email address copied to clipboard" : "Email address: " + text;
      setTimeout(() => { label.textContent = original; }, 2200);
    });
  });
})();
