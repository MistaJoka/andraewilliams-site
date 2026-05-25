/**
 * Text-aware project card measurement via Pretext (Tier 1: prepare + layout).
 * Bundled for static GitHub Pages — do not import @chenglou/pretext raw on homepage.
 */
import { prepare, layout } from '@chenglou/pretext';

const TITLE_FONT = '600 15.2px Inter, sans-serif';
const BODY_FONT = '400 13.6px Inter, sans-serif';
const TITLE_LINE_HEIGHT = 24;
const BODY_LINE_HEIGHT = 22;

const preparedCache = new Map();

function cacheKey(text, font) {
  return `${font}\0${text}`;
}

function getCardWidth(card) {
  const simulated = card.dataset.cardWidth;
  if (simulated) return Number(simulated);
  const style = getComputedStyle(card);
  const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  return Math.max(120, card.clientWidth - padX);
}

function measureBlock(text, font, lineHeight, width) {
  if (!text) return { lineCount: 0, height: 0 };
  const key = cacheKey(text, font);
  let cached = preparedCache.get(key);
  if (!cached) {
    cached = { font, prepared: prepare(text, font) };
    preparedCache.set(key, cached);
  }
  return layout(cached.prepared, width, lineHeight);
}

function updateBadges(card, state) {
  const badges = card.querySelector('.pretext-badges');
  if (!badges) return;

  const safeEl = badges.querySelector('[data-badge="safe"]');
  const overflowEl = badges.querySelector('[data-badge="overflow"]');
  const measuredEl = badges.querySelector('[data-badge="measured"]');
  const responsiveEl = badges.querySelector('[data-badge="responsive"]');

  if (safeEl) {
    safeEl.hidden = state.overflow;
    safeEl.classList.toggle('pretext-badge--active', !state.overflow);
  }
  if (overflowEl) {
    overflowEl.hidden = !state.overflow;
    overflowEl.classList.toggle('pretext-badge--active', state.overflow);
  }
  if (measuredEl) measuredEl.classList.add('pretext-badge--active');
  if (responsiveEl) responsiveEl.classList.toggle('pretext-badge--active', state.responsive);
}

function updateReading(card, state) {
  const reading = card.querySelector('.pretext-reading');
  if (!reading) return;

  reading.textContent =
    `Width: ${Math.round(state.width)}px · ` +
    `Title: ${state.titleLines}/${state.titleMax} · ` +
    `Body: ${state.bodyLines}/${state.bodyMax} · ` +
    `Height: ${state.totalHeight}px · ` +
    `Overflow: ${state.overflow ? 'RISK' : 'Safe'}`;
}

function measureCard(card, responsive = false) {
  const title =
    card.dataset.pretextTitle?.trim() ||
    card.querySelector('.lab-card-name')?.textContent?.trim() ||
    '';
  const body =
    card.dataset.pretextBody?.trim() ||
    card.querySelector('.lab-card-note')?.textContent?.trim() ||
    '';

  const titleMax = Number(card.dataset.titleMaxLines) || 2;
  const bodyMax = Number(card.dataset.descriptionMaxLines) || 4;
  const width = getCardWidth(card);

  const titleResult = measureBlock(title, TITLE_FONT, TITLE_LINE_HEIGHT, width);
  const bodyResult = measureBlock(body, BODY_FONT, BODY_LINE_HEIGHT, width);

  const overflow = titleResult.lineCount > titleMax || bodyResult.lineCount > bodyMax;
  const totalHeight = titleResult.height + bodyResult.height;

  const state = {
    width,
    titleLines: titleResult.lineCount,
    bodyLines: bodyResult.lineCount,
    titleMax,
    bodyMax,
    totalHeight,
    overflow,
    responsive,
  };

  updateBadges(card, state);
  updateReading(card, state);

  const proofReading = card.querySelector('.project-card-proof-reading');
  if (proofReading) {
    proofReading.innerHTML =
      `<li>Width: ${Math.round(state.width)}px</li>` +
      `<li>Title lines: ${state.titleLines} / ${state.titleMax}</li>` +
      `<li>Description lines: ${state.bodyLines} / ${state.bodyMax}</li>` +
      `<li>Predicted height: ${state.totalHeight}px</li>` +
      `<li>Overflow risk: ${state.overflow ? 'OVERFLOW RISK' : 'Safe'}</li>`;
  }

  card.dataset.pretextMeasured = 'true';
  return state;
}

function wireProofToggle(card) {
  const toggle = card.querySelector('[data-proof-toggle]');
  const panel = card.querySelector('.project-card-proof');
  if (!toggle || !panel) return;

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    panel.hidden = expanded;
  });
}

function observeCard(card) {
  measureCard(card);

  if (typeof ResizeObserver === 'undefined') return;

  const observer = new ResizeObserver(() => {
    measureCard(card, true);
  });
  observer.observe(card);
}

export function initPretextCards() {
  const run = () => {
    const cards = document.querySelectorAll('[data-pretext-card]:not([data-pretext-init])');
    cards.forEach((card) => {
      card.dataset.pretextInit = 'true';
      wireProofToggle(card);
      observeCard(card);
    });
  };

  if (document.fonts?.ready) {
    document.fonts.ready.then(run);
  } else {
    run();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initPretextCards();
});

document.addEventListener('lab-ready', () => {
  initPretextCards();
});
