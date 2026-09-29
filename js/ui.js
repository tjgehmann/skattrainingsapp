import { suitOf, rankOf, SUIT_SYMBOLS, RANK_SHORT, cardName } from './skat.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// Karte als HTML. opts: { size: 'sm'|'md'|'lg', cls, attrs, back }
export function cardHTML(c, opts = {}) {
  const size = opts.size || 'md';
  if (opts.back || !c) return `<div class="card back ${size} ${opts.cls || ''}" aria-label="verdeckte Karte"></div>`;
  const s = suitOf(c), r = rankOf(c);
  const sym = SUIT_SYMBOLS[s];
  const face = ['J', 'Q', 'K'].includes(r);
  const center = face ? `<span class="face">${RANK_SHORT[r]}</span><span class="face-sym">${sym}</span>` : `<span class="pip">${sym}</span>`;
  return `<button type="button" class="card s-${s} ${size} ${r === 'J' ? 'jack' : ''} ${opts.cls || ''}" data-card="${c}" aria-label="${cardName(c)}" title="${cardName(c)}" ${opts.attrs || ''}>
    <span class="corner tl">${RANK_SHORT[r]}<br>${sym}</span>
    <span class="center">${center}</span>
    <span class="corner br">${RANK_SHORT[r]}<br>${sym}</span>
  </button>`;
}

export function cardsHTML(cards, opts = {}) {
  return `<div class="cards ${opts.fan ? 'fan' : ''}">${cards.map((c) => cardHTML(c, opts)).join('')}</div>`;
}

export function inlineCard(c) {
  const s = suitOf(c), r = rankOf(c);
  return `<span class="icard s-${s}">${SUIT_SYMBOLS[s]}${RANK_SHORT[r]}</span>`;
}

export function suitInline(s, name) {
  return `<span class="icard s-${s}">${SUIT_SYMBOLS[s]}${name ? ' ' + name : ''}</span>`;
}

export function toast(msg, ms = 2200) {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), ms);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
