(function () {
  'use strict';

  /* ---------------------------------------------------------
     Page loader — hide once the page is ready, capped so a
     slow connection never blocks the visitor for too long
  --------------------------------------------------------- */
  const pageLoader = document.getElementById('pageLoader');
  if (pageLoader) {
    let loaderDone = false;
    const hideLoader = () => {
      if (loaderDone) return;
      loaderDone = true;
      pageLoader.classList.add('is-done');
    };
    window.addEventListener('load', hideLoader);
    setTimeout(hideLoader, 2200); // never block longer than this
  }

  /* ---------------------------------------------------------
     Hero title — reveal animation on load
     (plain line: word-by-word stagger; gradient line: wipe reveal
     via clip-path, since splitting a gradient-clip text into
     per-character spans would break the single smooth gradient)
  --------------------------------------------------------- */
  const heroLine = document.getElementById('heroTitleLine');
  const heroEmphasis = document.getElementById('heroTitleEmphasis');

  if (heroLine && window.gsap) {
    const words = heroLine.textContent.trim().split(' ');
    heroLine.innerHTML = words
      .map(w => `<span class="word-reveal"><span class="word-reveal-inner">${w}</span></span>`)
      .join(' ');

    gsap.set('.word-reveal-inner', { yPercent: 110, opacity: 0 });
    if (heroEmphasis) gsap.set(heroEmphasis, { clipPath: 'inset(0 100% 0 0)' });

    const tl = gsap.timeline({ delay: 0.25 });
    tl.to('.word-reveal-inner', {
      yPercent: 0, opacity: 1, duration: 0.75, ease: 'power3.out', stagger: 0.06
    });
    if (heroEmphasis) {
      tl.to(heroEmphasis, {
        clipPath: 'inset(0 0% 0 0)', duration: 0.7, ease: 'power3.inOut'
      }, '-=0.35');
    }
  }

  /* ---------------------------------------------------------
     Header: blur + shrink on scroll
  --------------------------------------------------------- */
  const header = document.getElementById('siteHeader');
  const onScrollHeader = () => {
    if (window.scrollY > 40) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  };
  onScrollHeader();
  window.addEventListener('scroll', onScrollHeader, { passive: true });

  /* ---------------------------------------------------------
     Full-screen nav overlay
  --------------------------------------------------------- */
  const menuTrigger = document.getElementById('menuTrigger');
  const navOverlay = document.getElementById('navOverlay');
  const navOverlayClose = document.getElementById('navOverlayClose');

  if (menuTrigger && navOverlay) {
    const overlayLinks = Array.from(navOverlay.querySelectorAll('.nav-overlay-link-inner'));

    const openOverlay = () => {
      navOverlay.classList.add('is-open');
      navOverlay.setAttribute('aria-hidden', 'false');
      menuTrigger.classList.add('is-active');
      menuTrigger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';

      if (window.gsap) {
        gsap.fromTo(overlayLinks,
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', stagger: 0.06, delay: 0.25 }
        );
      }
    };

    const closeOverlay = () => {
      navOverlay.classList.remove('is-open');
      navOverlay.setAttribute('aria-hidden', 'true');
      menuTrigger.classList.remove('is-active');
      menuTrigger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    };

    menuTrigger.addEventListener('click', () => {
      const isOpen = navOverlay.classList.contains('is-open');
      isOpen ? closeOverlay() : openOverlay();
    });

    if (navOverlayClose) navOverlayClose.addEventListener('click', closeOverlay);

    navOverlay.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', closeOverlay);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navOverlay.classList.contains('is-open')) closeOverlay();
    });
  }

  /* ---------------------------------------------------------
     Scroll reveal (fade-up / fade-in) with stagger delays
  --------------------------------------------------------- */
  const revealEls = document.querySelectorAll('[data-reveal]');

  if (!('IntersectionObserver' in window)) {
    // Old/unsupported browser: just show everything, don't risk hidden content
    revealEls.forEach(el => el.classList.add('in-view'));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = el.getAttribute('data-delay') || 0;
          el.style.transitionDelay = `${delay}ms`;
          el.classList.add('in-view');
          revealObserver.unobserve(el);
        }
      });
    }, { threshold: 0.15 });

    revealEls.forEach(el => revealObserver.observe(el));
  }

  /* ---------------------------------------------------------
     Animated counters (floating stat cards in hero)
  --------------------------------------------------------- */
  const counters = document.querySelectorAll('[data-count]');
  const animateCounter = (el) => {
    const target = parseFloat(el.getAttribute('data-count'));
    const decimals = parseInt(el.getAttribute('data-decimal') || '0', 10);
    const suffix = el.getAttribute('data-suffix') || '';
    const duration = 1600;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      const value = target * eased;
      el.textContent = value.toFixed(decimals) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  if (counters.length) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach(c => counterObserver.observe(c));
  }

  /* ---------------------------------------------------------
     Timeline — scroll-scrubbed progress (GSAP ScrollTrigger)
  --------------------------------------------------------- */
  const timelineEl = document.querySelector('.timeline');
  const timelineProgressEl = document.getElementById('timelineProgress');

  if (timelineEl && timelineProgressEl) {
    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      timelineEl.classList.add('in-view'); // icons/line use their lit-up styling throughout the scrub

      gsap.fromTo(timelineProgressEl,
        { '--fill': '0%' },
        {
          '--fill': '100%',
          ease: 'none',
          scrollTrigger: {
            trigger: timelineEl,
            start: 'top 78%',
            end: 'bottom 62%',
            scrub: 0.4
          }
        }
      );
    } else {
      // Fallback: original one-shot reveal if GSAP failed to load
      const timelineObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            timelineEl.classList.add('in-view');
            requestAnimationFrame(() => { timelineProgressEl.style.setProperty('--fill', '100%'); });
            timelineObserver.unobserve(timelineEl);
          }
        });
      }, { threshold: 0.35 });
      timelineObserver.observe(timelineEl);
    }
  }

  /* ---------------------------------------------------------
     Section mesh parallax (GSAP ScrollTrigger)
  --------------------------------------------------------- */
  if (window.gsap && window.ScrollTrigger) {
    document.querySelectorAll('.section-mesh, .hero-mesh').forEach((mesh) => {
      gsap.to(mesh, {
        y: () => (mesh.classList.contains('hero-mesh') ? 60 : 50),
        ease: 'none',
        scrollTrigger: {
          trigger: mesh.closest('.section, .hero'),
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.6
        }
      });
    });
  }

  /* ---------------------------------------------------------
     Serviços — expandable list (single row open at a time)
  --------------------------------------------------------- */
  document.querySelectorAll('.service-row').forEach(row => {
    const head = row.querySelector('.service-row-head');
    head.addEventListener('click', () => {
      const isOpen = row.classList.contains('is-open');

      document.querySelectorAll('.service-row.is-open').forEach(other => {
        if (other !== row) {
          other.classList.remove('is-open');
          other.querySelector('.service-row-head').setAttribute('aria-expanded', 'false');
        }
      });

      row.classList.toggle('is-open', !isOpen);
      head.setAttribute('aria-expanded', String(!isOpen));
    });
  });

  /* ---------------------------------------------------------
     FAQ accordion
  --------------------------------------------------------- */
  document.querySelectorAll('.accordion-item').forEach(item => {
    const trigger = item.querySelector('.accordion-trigger');
    const panel = item.querySelector('.accordion-panel');

    trigger.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      // close all others
      document.querySelectorAll('.accordion-item.open').forEach(other => {
        if (other !== item) {
          other.classList.remove('open');
          other.querySelector('.accordion-trigger').setAttribute('aria-expanded', 'false');
          other.querySelector('.accordion-panel').style.maxHeight = null;
        }
      });

      if (isOpen) {
        item.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        panel.style.maxHeight = null;
      } else {
        item.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
        panel.style.maxHeight = panel.scrollHeight + 'px';
      }
    });
  });

  /* ---------------------------------------------------------
     Smooth-scroll to section — GSAP-eased with a brief
     arrival highlight, falling back to native smooth-scroll
  --------------------------------------------------------- */
  const hasScrollToPlugin = !!(window.gsap && typeof ScrollToPlugin !== 'undefined');
  if (hasScrollToPlugin) {
    gsap.registerPlugin(ScrollToPlugin);
  }

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId.length <= 1) return;
      const target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();
      const offset = 88;

      const flashTarget = target.querySelector('.section-head') || target;
      const showArrival = () => {
        flashTarget.classList.add('section-arrived');
        setTimeout(() => flashTarget.classList.remove('section-arrived'), 900);
      };

      if (hasScrollToPlugin) {
        gsap.to(window, {
          duration: 1.1,
          scrollTo: { y: target, offsetY: offset },
          ease: 'power2.inOut',
          onComplete: showArrival
        });
      } else {
        const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top, behavior: 'smooth' });
        setTimeout(showArrival, 700);
      }
    });
  });

  /* ---------------------------------------------------------
     Hero mockup subtle parallax on mouse move (desktop only)
  --------------------------------------------------------- */
  const browserMock = document.getElementById('browserMock');
  const heroVisual = document.querySelector('.hero-visual');
  if (browserMock && heroVisual && window.matchMedia('(min-width: 1001px)').matches) {
    heroVisual.addEventListener('mousemove', (e) => {
      const rect = heroVisual.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      browserMock.style.transform = `perspective(1400px) rotateY(${-8 + x * 6}deg) rotateX(${3 - y * 6}deg)`;
    });
    heroVisual.addEventListener('mouseleave', () => {
      browserMock.style.transform = '';
    });
  }

  /* ---------------------------------------------------------
     Top scroll progress bar
  --------------------------------------------------------- */
  const progressFill = document.getElementById('scrollProgressFill');
  if (progressFill) {
    const updateProgress = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const pct = maxScroll > 0 ? Math.min(100, Math.max(0, (window.scrollY / maxScroll) * 100)) : 0;
      progressFill.style.width = pct + '%';
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
  }

  /* ---------------------------------------------------------
     Keep ScrollTrigger positions accurate as async content
     (fonts, images, the 3D laptop) settles into final layout
  --------------------------------------------------------- */
  if (window.gsap && window.ScrollTrigger) {
    window.addEventListener('load', () => ScrollTrigger.refresh());
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh());
    }
    // The 3D laptop settles ~1.5s after it boots; nudge a refresh after its entrance tween
    setTimeout(() => ScrollTrigger.refresh(), 2000);
  }

  /* ---------------------------------------------------------
     Card spotlight + subtle 3D tilt (desktop / fine-pointer only)
  --------------------------------------------------------- */
  const spotlightCards = document.querySelectorAll(
    '.benefit-card'
  );
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  spotlightCards.forEach(card => {
    let tiltX, tiltY, liftY;
    if (window.gsap && canHover) {
      tiltX = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3.out' });
      tiltY = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3.out' });
      liftY = gsap.quickTo(card, 'y', { duration: 0.5, ease: 'power3.out' });
      gsap.set(card, { transformPerspective: 800, transformStyle: 'preserve-3d' });
    }

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      card.style.setProperty('--mx', mx + 'px');
      card.style.setProperty('--my', my + 'px');

      if (tiltX && canHover) {
        const px = (mx / rect.width) - 0.5;
        const py = (my / rect.height) - 0.5;
        tiltY(px * 6);
        tiltX(py * -6);
        liftY(-6);
      }
    });
    card.addEventListener('mouseleave', () => {
      if (tiltX && canHover) { tiltX(0); tiltY(0); liftY(0); }
    });
  });

  /* ---------------------------------------------------------
     Magnetic primary CTA buttons
  --------------------------------------------------------- */
  if (window.gsap && canHover) {
    document.querySelectorAll('.btn-primary, .btn-white').forEach(btn => {
      const moveX = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3.out' });
      const moveY = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3.out' });
      const radius = 60;

      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const cx = e.clientX - (rect.left + rect.width / 2);
        const cy = e.clientY - (rect.top + rect.height / 2);
        const dist = Math.sqrt(cx * cx + cy * cy);
        if (dist < radius + rect.width / 2) {
          moveX(cx * 0.25);
          moveY(cy * 0.35);
        }
      });
      btn.addEventListener('mouseleave', () => { moveX(0); moveY(0); });
    });
  }

  /* ---------------------------------------------------------
     Custom cursor (desktop / fine-pointer only)
  --------------------------------------------------------- */
  if (canHover) {
    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');

    if (dot && ring) {
      let dotMoveX, dotMoveY, ringMoveX, ringMoveY;
      if (window.gsap) {
        dotMoveX = gsap.quickTo(dot, 'x', { duration: 0.05, ease: 'none' });
        dotMoveY = gsap.quickTo(dot, 'y', { duration: 0.05, ease: 'none' });
        ringMoveX = gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power3.out' });
        ringMoveY = gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power3.out' });
      }

      let started = false;
      window.addEventListener('mousemove', (e) => {
        if (!started) {
          started = true;
          dot.classList.add('is-active');
          ring.classList.add('is-active');
        }
        if (window.gsap) {
          dotMoveX(e.clientX); dotMoveY(e.clientY);
          ringMoveX(e.clientX); ringMoveY(e.clientY);
        } else {
          dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
          ring.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
        }
      });

      const hoverTargets = 'a, button, .btn, .accordion-trigger';
      document.querySelectorAll(hoverTargets).forEach(el => {
        el.addEventListener('mouseenter', () => ring.classList.add('is-hover'));
        el.addEventListener('mouseleave', () => ring.classList.remove('is-hover'));
      });

      document.addEventListener('mouseleave', () => {
        dot.classList.remove('is-active'); ring.classList.remove('is-active');
      });
      document.addEventListener('mouseenter', () => {
        dot.classList.add('is-active'); ring.classList.add('is-active');
      });
    }
  }
})();
