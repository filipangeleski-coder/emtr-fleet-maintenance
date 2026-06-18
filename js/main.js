/* ==========================================================================
   EMTR - site interactions
   ========================================================================== */
(function () {
  "use strict";

  var reduced0 = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function requestIdle(fn) { (window.requestIdleCallback || function (f) { return setTimeout(f, 1); })(fn); }

  /* ---- Lenis smooth scroll ---- */
  var lenis = null;
  if (window.Lenis && !reduced0 && window.innerWidth > 1024) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
  }

  /* ---- preloader: dismiss on real load (short cap), not fake progress ---- */
  (function () {
    var pre = document.getElementById("preloader");
    function signalLoaded() { window.dispatchEvent(new CustomEvent("emtr:preloaded")); }
    if (!pre) { signalLoaded(); return; }
    if (reduced0) { pre.remove(); signalLoaded(); return; }
    var bar = pre.querySelector(".preloader__bar i");
    var pct = pre.querySelector(".preloader__pct");
    if (lenis) lenis.stop();
    var n = 0, done = false;
    function finish() {
      if (done) return; done = true;
      bar.style.width = "100%"; pct.textContent = "100%";
      pre.classList.add("done");
      if (lenis) lenis.start();
      signalLoaded();
      setTimeout(function () { if (pre.parentNode) pre.parentNode.removeChild(pre); }, 900);
    }
    // bar tracks toward real readiness; completion is the window 'load' event or a short cap, never a fake timer
    var iv = setInterval(function () {
      n = Math.min(96, n + Math.random() * 14 + 6);
      bar.style.width = n + "%"; pct.textContent = Math.round(n) + "%";
    }, 60);
    function ready() { clearInterval(iv); finish(); }
    if (document.readyState === "complete") { setTimeout(ready, 200); }
    else { window.addEventListener("load", function () { setTimeout(ready, 150); }); }
    setTimeout(ready, 1200); // hard cap: never gate the hero longer than this
  })();

  /* ---- smooth anchor links ---- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (!id || id.length < 2) return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(el, { offset: -70 });
      else el.scrollIntoView({ behavior: "smooth" });
    });
  });

  /* ---- magnetic primary CTAs ---- */
  if (!reduced0 && window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll(".btn--primary").forEach(function (btn) {
      btn.addEventListener("pointermove", function (e) {
        var r = btn.getBoundingClientRect();
        var mx = e.clientX - (r.left + r.width / 2);
        var my = e.clientY - (r.top + r.height / 2);
        btn.style.transform = "translate(" + mx * 0.18 + "px," + my * 0.3 + "px)";
      });
      btn.addEventListener("pointerleave", function () { btn.style.transform = ""; });
    });
  }

  /* ---- 3D tilt-toward-cursor on cards ---- */
  if (!reduced0 && window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll(".gallery figure").forEach(function (el) {
      var max = 6;
      el.addEventListener("pointerenter", function () { el.style.transition = "transform .12s ease-out"; });
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = "perspective(820px) rotateX(" + (-py * max) + "deg) rotateY(" + (px * max) + "deg) translateY(-6px)";
      });
      el.addEventListener("pointerleave", function () { el.style.transition = ""; el.style.transform = ""; });
    });
  }

  /* ---- HERO: cartographic backdrop + drawn route + fault→cleared beat ---- */
  (function () {
    var hero = document.querySelector(".hero");
    if (!hero) return;
    var line = hero.querySelector(".route__line");
    var diag = document.getElementById("diagLine");

    // On phones the SVG slice-crops the sides; swap to a portrait-friendly near-vertical
    // route so the base AND the breakdown pin both stay in frame (the money-shot survives).
    (function applyMobileRoute() {
      var svg = hero.querySelector(".hero__route");
      if (!svg || window.innerWidth >= 768) return;
      svg.setAttribute("viewBox", "0 0 480 760");
      var radius = svg.querySelector(".route__radius");
      if (radius) { radius.setAttribute("cx", "240"); radius.setAttribute("cy", "636"); radius.setAttribute("r", "150"); }
      if (line) line.setAttribute("d", "M240,636 C 304,556 192,452 268,372 S 222,210 250,118");
      var base = svg.querySelector(".route__base");
      if (base) base.setAttribute("transform", "translate(240,636)");
      var pin = svg.querySelector(".route__pin");
      if (pin) pin.setAttribute("transform", "translate(250,112)");
      var eta = svg.querySelector(".route__eta");
      if (eta) { eta.setAttribute("x", "240"); eta.setAttribute("y", "158"); eta.setAttribute("text-anchor", "middle"); }
    })();

    function flip() {
      if (!diag) return;
      var cleared = diag.getAttribute("data-cleared");
      setTimeout(function () { diag.textContent = cleared; diag.classList.add("cleared"); }, reduced0 ? 0 : 250);
    }
    function draw() {
      hero.classList.add("in-view");
      var len = 0;
      if (line) { try { len = line.getTotalLength(); } catch (e) { len = 0; } }
      if (reduced0 || !line || !len) {
        if (line && len) { line.style.strokeDasharray = len; line.style.strokeDashoffset = 0; }
        hero.classList.add("routed"); flip(); return;
      }
      line.style.strokeDasharray = len;
      line.style.strokeDashoffset = len;
      line.getBoundingClientRect(); // force reflow
      line.style.transition = "stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1)";
      requestAnimationFrame(function () { line.style.strokeDashoffset = 0; });
      setTimeout(function () { hero.classList.add("routed"); flip(); }, 1550);
    }
    // gate behind first paint so the headline + CALL button are never blocked
    if (reduced0) { draw(); } else { setTimeout(draw, 900); }
  })();

  /* ---- coverage map (Leaflet) — lazy-init when it scrolls into view ---- */
  (function () {
    var el = document.getElementById("emtr-map");
    if (!el || !window.L) return;
    var built = false;
    function build() {
      if (built) return; built = true;
      var center = [-33.85, 150.90]; // Western Sydney
      var map = window.L.map(el, {
        center: center, zoom: 9,
        scrollWheelZoom: false, dragging: false, touchZoom: false,
        doubleClickZoom: false, boxZoom: false, keyboard: false,
        zoomControl: false, attributionControl: true
      });
      window.L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19, attribution: "&copy; OpenStreetMap, &copy; CARTO"
      }).addTo(map);
      window.L.circle(center, { radius: 60000, color: "#3a8bff", weight: 1.5, opacity: 0.85, fillColor: "#2f7dff", fillOpacity: 0.12 }).addTo(map);
      window.L.circleMarker(center, { radius: 7, color: "#bcd6ff", weight: 2, fillColor: "#2f7dff", fillOpacity: 1 }).addTo(map);
      setTimeout(function () { map.invalidateSize(); }, 300);
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { build(); io.disconnect(); } });
      }, { rootMargin: "200px" });
      io.observe(el);
    } else { build(); }
  })();

  /* ---- scroll progress bar ---- */
  (function () {
    var sb = document.getElementById("scrollbar");
    if (!sb) return;
    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      var p = max > 0 ? (window.scrollY || doc.scrollTop) / max : 0;
      sb.style.width = (p * 100) + "%";
    }
    if (lenis) lenis.on("scroll", update);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    update();
  })();

  /* ---- hero headline clip-wipe (fires when the preloader lifts, not a hard delay) ---- */
  (function () {
    var hh = document.querySelector(".hero-h1");
    if (!hh) return;
    if (reduced0) { hh.classList.add("shown"); return; }
    var shown = false;
    function show() { if (shown) return; shown = true; hh.classList.add("shown"); }
    window.addEventListener("emtr:preloaded", function () { setTimeout(show, 120); });
    setTimeout(show, 1500); // fallback only if the event never fires
  })();

  /* ---- year ---- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- sticky header state ---- */
  var header = document.getElementById("header");
  function onScroll() {
    if (window.scrollY > 30) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- mobile nav ---- */
  var toggle = document.getElementById("navToggle");
  var drawer = document.getElementById("mobileNav");
  if (toggle && drawer) {
    function setOpen(open) {
      drawer.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
    }
    toggle.addEventListener("click", function () {
      setOpen(!drawer.classList.contains("open"));
    });
    drawer.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { setOpen(false); });
    });
  }

  /* ---- scroll reveal ---- */
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var reveals = document.querySelectorAll(".reveal");
  if (reduced || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("in"); });
  } else {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); ro.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { ro.observe(el); });
  }

  /* ---- seamless marquee (duplicate the track) ---- */
  var marquee = document.getElementById("marquee");
  if (marquee) {
    marquee.innerHTML += marquee.innerHTML;
  }

  /* ---- FAQ: close siblings when one opens ---- */
  var faqItems = document.querySelectorAll(".faq__item");
  faqItems.forEach(function (item) {
    item.addEventListener("toggle", function () {
      if (item.open) {
        faqItems.forEach(function (other) { if (other !== item) other.open = false; });
      }
    });
  });

  /* ---- "rev the engine" on hover over call-to-action ---- */
  document.querySelectorAll("[data-rev]").forEach(function (el) {
    el.addEventListener("pointerenter", function () {
      window.dispatchEvent(new CustomEvent("emtr:rev", { detail: 1 }));
    });
    el.addEventListener("pointerleave", function () {
      window.dispatchEvent(new CustomEvent("emtr:rev", { detail: 0 }));
    });
  });

  /* ---- enquiry form: Netlify Forms when deployed, mailto fallback otherwise ---- */
  var form = document.getElementById("enquiryForm");
  var status = document.getElementById("formStatus");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }

      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });

      function mailtoFallback(note) {
        var subject = "Website enquiry - " + (data.urgency || "") + " - " + (data.name || "");
        var body =
          "Name: " + (data.name || "") + "\n" +
          "Phone: " + (data.phone || "") + "\n" +
          "Email: " + (data.email || "") + "\n" +
          "Urgency: " + (data.urgency || "") + "\n" +
          "Vehicle/machine: " + (data.vehicle || "") + "\n" +
          "Location: " + (data.location || "") + "\n\n" +
          (data.message || "");
        window.location.href =
          "mailto:info@emtr.com.au?subject=" + encodeURIComponent(subject) +
          "&body=" + encodeURIComponent(body);
        setStatus(note || "Opening your email app, just press send. Or call 0451 073 733.", "ok");
      }

      function setStatus(msg, cls) {
        if (!status) return;
        status.textContent = msg;
        status.className = "form__status " + (cls || "");
      }

      var host = location.hostname;
      var isLocal = location.protocol === "file:" || host === "localhost" || host === "127.0.0.1" || host === "";

      setStatus("Sending...", "");

      if (isLocal) { mailtoFallback(); return; }

      var encoded = Object.keys(data).map(function (k) {
        return encodeURIComponent(k) + "=" + encodeURIComponent(data[k]);
      }).join("&");

      fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: encoded
      }).then(function (res) {
        if (res.ok) {
          form.reset();
          setStatus("Thanks, we've got it. We'll be in touch shortly. For breakdowns, call 0451 073 733.", "ok");
        } else {
          mailtoFallback();
        }
      }).catch(function () {
        mailtoFallback();
      });
    });
  }

  /* ---- animated stat counters ---- */
  var counters = document.querySelectorAll(".stat__num .num[data-count]");
  function animateCount(el) {
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    if (reduced) { el.textContent = target; return; }
    var start = null, dur = 1300;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(step); else el.textContent = target;
    }
    requestAnimationFrame(step);
  }
  if ("IntersectionObserver" in window) {
    var co = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { animateCount(e.target); co.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { co.observe(c); });
  } else {
    counters.forEach(animateCount);
  }

  /* ---- gallery lightbox ---- */
  var lb = document.getElementById("lightbox");
  if (lb) {
    var lbImg = lb.querySelector("img");
    function closeLb() {
      lb.classList.remove("open");
      lb.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
    document.querySelectorAll(".gallery figure img").forEach(function (img) {
      img.style.cursor = "zoom-in";
      img.addEventListener("click", function () {
        lbImg.src = img.currentSrc || img.src;
        lbImg.alt = img.alt;
        lb.classList.add("open");
        lb.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
      });
    });
    lb.addEventListener("click", function (e) {
      if (e.target === lb || e.target.classList.contains("lightbox__close")) closeLb();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeLb(); });
  }
})();
