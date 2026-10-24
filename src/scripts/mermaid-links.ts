// Diagram nodes linked with `click <node> href "#id"` scroll to their target
// with the same timing as the accordions (accordion.ts / .cue-content-wrapper):
// 300ms cubic-bezier(0, 0, 0.2, 1). Native smooth scrolling can't be timed.

const DURATION_MS = 300;

// cubic-bezier(0, 0, 0.2, 1): solve x(t) = progress for t, then return y(t)
function ease(progress: number) {
  const x = (t: number) => 0.6 * (1 - t) * t * t + t * t * t;
  const y = (t: number) => 3 * (1 - t) * t * t + t * t * t;

  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (x(mid) < progress) lo = mid;
    else hi = mid;
  }
  return y((lo + hi) / 2);
}

let frame = 0;

function scrollToElement(target: HTMLElement) {
  // Starlight offsets anchors below the fixed header with scroll-padding-top
  const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const start = window.scrollY;
  const distance = target.getBoundingClientRect().top - padding;

  cancelAnimationFrame(frame);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.scrollTo(0, start + distance);
    return;
  }

  const startTime = performance.now();
  const step = (now: number) => {
    const progress = Math.min((now - startTime) / DURATION_MS, 1);
    window.scrollTo(0, start + distance * ease(progress));
    if (progress < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
}

let bound = false;

export function initMermaidLinks() {
  if (bound) return;
  bound = true;

  document.addEventListener('click', (e) => {
    if (!(e.target instanceof Element)) return;
    const link = e.target.closest('.mermaid a');
    const href = link?.getAttribute('xlink:href') ?? link?.getAttribute('href');
    if (!href?.startsWith('#')) return;

    const target = document.getElementById(decodeURIComponent(href.slice(1)));
    if (!target) return;

    e.preventDefault();
    // pushState doesn't fire hashchange, so the accordion hash handler stays out of it
    history.pushState(null, '', href);
    scrollToElement(target);
  });
}
