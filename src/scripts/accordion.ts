// Shared open/close behaviour for animated accordions (Cue, CollapsibleCard).
// Animation timing lives in custom.css (.cue-content-wrapper): 300ms cubic-bezier(0, 0, 0.2, 1).

const SELECTOR = 'details.cue-accordion';
const ANIMATION_FALLBACK_MS = 350;

const closeTimeouts = new WeakMap<HTMLDetailsElement, number>();

function getContent(details: HTMLDetailsElement) {
  return details.querySelector<HTMLElement>('.cue-content-wrapper');
}

// The element carrying the accordion's id: the Card wrapper for CollapsibleCard, else the details
function getAnchor(details: HTMLDetailsElement) {
  return details.classList.contains('collapsible-card-details')
    ? (details.closest<HTMLElement>('.collapsible-card') ?? details)
    : details;
}

function getParentAccordion(el: Element) {
  return el.parentElement?.closest<HTMLDetailsElement>(SELECTOR) ?? null;
}

function getHashTarget() {
  const id = decodeURIComponent(window.location.hash.slice(1));
  return id ? document.getElementById(id) : null;
}

// replaceState doesn't fire hashchange, so clicking doesn't also trigger a scroll
function setHash(id: string) {
  const url = id ? `#${id}` : window.location.pathname + window.location.search;
  history.replaceState(history.state, '', url);
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
      // Ignore clicks in this accordion's content (a nested accordion's summary still counts)
      const wrapper = (e.target as HTMLElement).closest('.cue-content-wrapper');
      if (wrapper && details.contains(wrapper)) return;

      e.preventDefault();
      if (details.classList.contains('is-open')) {
        closeAccordion(details);

        // Don't leave the url pointing into a closed accordion: fall back to the enclosing one
        const hashTarget = getHashTarget();
        if (hashTarget && getAnchor(details).contains(hashTarget)) {
          const parent = getParentAccordion(details);
          setHash(parent ? getAnchor(parent).id : '');
        }
      } else {
        openAccordion(details);
        const { id } = getAnchor(details);
        if (id) setHash(id);
      }
    });
  });
}

// id in the url -> scroll to it, opening its accordion and any it's nested in
// (the id can be a Cue, a CollapsibleCard, or a heading inside either)
export function openAccordionFromHash(smooth = false) {
  const target = getHashTarget();
  if (!target) return;

  const accordions: HTMLDetailsElement[] = [];
  const own = target.matches(SELECTOR)
    ? (target as HTMLDetailsElement)
    : target.querySelector<HTMLDetailsElement>(`:scope > ${SELECTOR}`);
  if (own) accordions.push(own);
  for (let el = getParentAccordion(target); el; el = getParentAccordion(el)) {
    accordions.push(el);
  }

  const needsOpen = accordions.filter((details) => !details.classList.contains('is-open'));
  needsOpen.forEach(openAccordion);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scroll = () =>
    target.scrollIntoView({ block: 'start', behavior: smooth && !reduceMotion ? 'smooth' : 'auto' });

  // Wait for the open animation so the target has settled into place
  window.setTimeout(scroll, needsOpen.length ? ANIMATION_FALLBACK_MS : 0);
}

let hashListenerBound = false;
let hashHandledFor = '';

export function initAccordions() {
  setupAccordions();

  // Cue and CollapsibleCard both call this on load; only handle the hash once per page
  if (hashHandledFor !== window.location.href) {
    hashHandledFor = window.location.href;
    openAccordionFromHash();
  }

  if (!hashListenerBound) {
    hashListenerBound = true;
    window.addEventListener('hashchange', () => openAccordionFromHash(true));
  }
}
