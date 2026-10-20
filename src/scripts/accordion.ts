// Shared open/close behaviour for animated accordions (Cue, CollapsibleCard).
// Animation timing lives in custom.css (.cue-content-wrapper): 300ms cubic-bezier(0, 0, 0.2, 1).

const SELECTOR = 'details.cue-accordion';
const ANIMATION_FALLBACK_MS = 350;

const closeTimeouts = new WeakMap<HTMLDetailsElement, number>();

function getContent(details: HTMLDetailsElement) {
  return details.querySelector<HTMLElement>('.cue-content-wrapper');
}

export function openAccordion(details: HTMLDetailsElement) {
  const content = getContent(details);
  if (!content || details.classList.contains('is-open')) return;

  window.clearTimeout(closeTimeouts.get(details));

  details.setAttribute('open', '');
  // Force layout reflow so transition starts cleanly from 0fr / opacity 0
  void content.offsetHeight;
  requestAnimationFrame(() => {
    details.classList.add('is-open');
    content.removeAttribute('aria-hidden');
  });
}

function closeAccordion(details: HTMLDetailsElement) {
  const content = getContent(details);
  if (!content) return;

  details.classList.remove('is-open');
  content.setAttribute('aria-hidden', 'true');

  const finish = () => {
    content.removeEventListener('transitionend', handleTransitionEnd);
    if (!details.classList.contains('is-open')) {
      details.removeAttribute('open');
    }
  };

  const handleTransitionEnd = (evt: TransitionEvent) => {
    if (evt.target !== content || evt.propertyName !== 'grid-template-rows') return;
    finish();
  };

  content.addEventListener('transitionend', handleTransitionEnd);
  window.clearTimeout(closeTimeouts.get(details));
  closeTimeouts.set(details, window.setTimeout(finish, ANIMATION_FALLBACK_MS));
}

export function setupAccordions() {
  document.querySelectorAll<HTMLDetailsElement>(SELECTOR).forEach((details) => {
    if (details.dataset.cueBound === 'true') return;
    details.dataset.cueBound = 'true';

    if (!details.querySelector('summary') || !getContent(details)) return;

    if (details.hasAttribute('open')) {
      details.classList.add('is-open');
    }

    details.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.cue-content-wrapper')) return;

      e.preventDefault();
      if (details.classList.contains('is-open')) {
        closeAccordion(details);
      } else {
        openAccordion(details);
      }
    });
  });
}

// id in the url -> scroll to and open the matching accordion
export function openAccordionFromHash(smooth = false) {
  const id = decodeURIComponent(window.location.hash.slice(1));
  if (!id) return;

  const target = document.getElementById(id);
  const details =
    target?.closest<HTMLDetailsElement>(SELECTOR) ??
    target?.querySelector<HTMLDetailsElement>(SELECTOR);
  if (!target || !details) return;

  const wasOpen = details.classList.contains('is-open');
  openAccordion(details);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scroll = () =>
    target.scrollIntoView({ block: 'start', behavior: smooth && !reduceMotion ? 'smooth' : 'auto' });

  // Wait for the open animation so the page is tall enough to reach the target
  window.setTimeout(scroll, wasOpen ? 0 : ANIMATION_FALLBACK_MS);
}

let hashListenerBound = false;

export function initAccordions() {
  setupAccordions();
  openAccordionFromHash();

  if (!hashListenerBound) {
    hashListenerBound = true;
    window.addEventListener('hashchange', () => openAccordionFromHash(true));
  }
}
