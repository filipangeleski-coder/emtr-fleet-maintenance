/* ==========================================================================
   EMTR - site interactions
   ========================================================================== */
(function () {
  "use strict";

  var reduced0 = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Lenis smooth scroll ---- */
  var lenis = null;
  if (window.Lenis && !reduced0) {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
  }

  /* ---- cinematic preloader ---- */
  (function () {
    var pre = document.getElementById("preloader");
    if (!pre) return;
    if (reduced0) { pre.remove(); return; }
    var bar = pre.querySelector(".preloader__bar i");
    var pct = pre.querySelector(".preloader__pct");
    if (lenis) lenis.stop();
    var n = 0, done = false;
    function finish() {
      if (done) return; done = true;
      pre.classList.add("done");
      if (lenis) lenis.start();
      setTimeout(function () { if (pre.parentNode) pre.parentNode.removeChild(pre); }, 1100);
    }
    var iv = setInterval(function () {
      n = Math.min(100, n + Math.random() * 9 + 4);
      bar.style.width = n + "%";
      pct.textContent = Math.round(n) + "%";
      if (n >= 100) { clearInterval(iv); setTimeout(finish, 350); }
    }, 75);
    setTimeout(finish, 4500); // failsafe
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
    document.querySelectorAll(".svc, .gallery figure").forEach(function (el) {
      var max = el.classList.contains("svc--feature") ? 3.5 : 6;
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

  /* ---- hero text fades as you dive into the engine ---- */
  (function () {
    var stage = document.querySelector(".hero-stage");
    var inner = document.querySelector(".hero__inner");
    var cue = document.querySelector(".hero__scroll");
    var sp = document.querySelector(".hero__spline");
    if (!stage || !inner || reduced0) return;
    function upd() {
      var range = stage.offsetHeight - window.innerHeight;
      var p = range > 0 ? Math.min(1, Math.max(0, (window.scrollY || 0) / range)) : 0;
      inner.style.opacity = String(1 - Math.min(1, p * 1.5));
      inner.style.transform = "translateY(" + (-p * 40) + "px)";
      if (cue) cue.style.opacity = String(1 - Math.min(1, p * 4));
      if (sp) sp.style.transform = "scale(" + (1 + p * 0.9) + ")";   // dive into the engine
    }
    if (lenis) lenis.on("scroll", upd);
    window.addEventListener("scroll", upd, { passive: true });
    upd();
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

  /* ---- hero headline clip-wipe (times with the preloader lift) ---- */
  (function () {
    var hh = document.querySelector(".hero-h1");
    if (!hh) return;
    if (reduced0) { hh.classList.add("shown"); return; }
    setTimeout(function () { hh.classList.add("shown"); }, 1500);
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
