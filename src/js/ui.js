/**
 * Shared UI polish — staggered reveals and nav micro-bounce.
 */
function initStaggerReveal() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      el.classList.add('is-visible');
    });
    return;
  }

  const items = document.querySelectorAll('[data-reveal]');
  if (!items.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  items.forEach((el, i) => {
    el.style.setProperty('--reveal-delay', `${i * 80}ms`);
    observer.observe(el);
  });

  // Reveal items already in view on first paint (observer can miss initial frame).
  requestAnimationFrame(() => {
    items.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
        el.classList.add('is-visible');
        observer.unobserve(el);
      }
    });
  });
}

function initNavBounce() {
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      link.classList.remove('nav-bounce');
      void link.offsetWidth;
      link.classList.add('nav-bounce');
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initStaggerReveal();
  initNavBounce();
});
