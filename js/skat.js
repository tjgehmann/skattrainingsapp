// Skat-Regelwerk (nach Internationaler Skatordnung, ISkO)
// Karten werden als Strings kodiert: Farbe + Rang, z. B. "CJ" (Kreuz-Bube), "H10" (Herz-Zehn).

export const SUITS = ['C', 'S', 'H', 'D'];
export const RANKS = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const SUIT_NAMES = { C: 'Kreuz', S: 'Pik', H: 'Herz', D: 'Karo' };
export const SUIT_SYMBOLS = { C: '♣', S: '♠', H: '♥', D: '♦' };
export const RANK_NAMES = { '7': 'Sieben', '8': 'Acht', '9': 'Neun', '10': 'Zehn', J: 'Bube', Q: 'Dame', K: 'König', A: 'Ass' };
export const RANK_SHORT = { '7': '7', '8': '8', '9': '9', '10': '10', J: 'B', Q: 'D', K: 'K', A: 'A' };
export const POINTS = { '7': 0, '8': 0, '9': 0, '10': 10, J: 2, Q: 3, K: 4, A: 11 };
export const BASE = { C: 12, S: 11, H: 10, D: 9 };
export const GRAND_BASE = 24;
export const JACKS = ['CJ', 'SJ', 'HJ', 'DJ'];

export const suitOf = (c) => c[0];
export const rankOf = (c) => c.slice(1);
export const points = (c) => POINTS[rankOf(c)];
export const sumPoints = (cards) => cards.reduce((s, c) => s + points(c), 0);

export function cardName(c) {
  return `${SUIT_NAMES[suitOf(c)]}-${RANK_NAMES[rankOf(c)]}`;
}

export function newDeck() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push(s + r);
  return d;
}

export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function deal(rng = Math.random) {
  const d = shuffle(newDeck(), rng);
  return { hands: [d.slice(0, 10), d.slice(10, 20), d.slice(20, 30)], skat: d.slice(30, 32) };
}

// ---------- Spiele ----------
// game = { type: 'suit'|'grand'|'null', trump?: 'C'|'S'|'H'|'D', hand, ouvert, schneiderAnnounced, schwarzAnnounced }

export function gameName(game) {
  if (!game) return '';
  let n;
  if (game.type === 'suit') n = SUIT_NAMES[game.trump];
  else if (game.type === 'grand') n = 'Grand';
  else n = 'Null';
  const extras = [];
  if (game.hand) extras.push('Hand');
  if (game.type !== 'null') {
    if (game.schwarzAnnounced && !game.ouvert) extras.push('Schwarz angesagt');
    else if (game.schneiderAnnounced && !game.ouvert) extras.push('Schneider angesagt');
  }
  if (game.ouvert) extras.push('Ouvert');
  return [n, ...extras].join(' ');
}

export function isTrump(c, game) {
  if (game.type === 'null') return false;
  if (rankOf(c) === 'J') return true;
  return game.type === 'suit' && suitOf(c) === game.trump;
}

// Effektive Farbe: 'T' für Trumpf, sonst die Kartenfarbe
export function effSuit(c, game) {
  return isTrump(c, game) ? 'T' : suitOf(c);
}

const NORMAL_ORDER = { '7': 1, '8': 2, '9': 3, Q: 4, K: 5, '10': 6, A: 7 };
const NULL_ORDER = { '7': 1, '8': 2, '9': 3, '10': 4, J: 5, Q: 6, K: 7, A: 8 };
const JACK_ORDER = { C: 4, S: 3, H: 2, D: 1 };

// Stärke einer Karte innerhalb ihrer effektiven Farbe
export function power(c, game) {
  if (game.type === 'null') return NULL_ORDER[rankOf(c)];
  if (rankOf(c) === 'J') return 100 + JACK_ORDER[suitOf(c)];
  const base = NORMAL_ORDER[rankOf(c)];
  return isTrump(c, game) ? 50 + base : base;
}

export function legalCards(hand, leadCard, game) {
  if (!leadCard) return hand.slice();
  const lead = effSuit(leadCard, game);
  const follow = hand.filter((c) => effSuit(c, game) === lead);
  return follow.length ? follow : hand.slice();
}

// Index der Karte, die den Stich gewinnt
export function trickWinner(cards, game) {
  let best = 0;
  for (let i = 1; i < cards.length; i++) {
    const c = cards[i], b = cards[best];
    const ce = effSuit(c, game), be = effSuit(b, game);
    if (ce === be && power(c, game) > power(b, game)) best = i;
    else if (ce === 'T' && be !== 'T') best = i;
  }
  return best;
}

// Anzeige-Sortierung
export function sortHand(hand, game) {
  const g = game || { type: 'grand' };
  const suitOrder = g.type === 'suit' ? [g.trump, ...SUITS.filter((s) => s !== g.trump)] : SUITS;
  const key = (c) => {
    const e = effSuit(c, g);
    const group = e === 'T' ? (rankOf(c) === 'J' ? -2 : -1) : suitOrder.indexOf(e);
    return [group === -1 ? -2 : group, -power(c, g)];
  };
  return hand.slice().sort((a, b) => {
    const ka = key(a), kb = key(b);
    return ka[0] - kb[0] || ka[1] - kb[1];
  });
}

// ---------- Spitzen / Spielwert ----------

export function trumpSequence(game) {
  const seq = JACKS.slice();
  if (game.type === 'suit') for (const r of ['A', '10', 'K', 'Q', '9', '8', '7']) seq.push(game.trump + r);
  return seq;
}

export function matadors(cards, game) {
  const seq = trumpSequence(game);
  const set = new Set(cards);
  const mit = set.has(seq[0]);
  let count = 0;
  for (const c of seq) {
    if (set.has(c) === mit) count++;
    else break;
  }
  return { mit, count };
}

export function nullValue(game) {
  if (game.ouvert) return game.hand ? 59 : 46;
  return game.hand ? 35 : 23;
}

export function baseValue(game) {
  if (game.type === 'grand') return GRAND_BASE;
  if (game.type === 'suit') return BASE[game.trump];
  return nullValue(game);
}

// Berechnet den Spielwert. declarerCards = 10 Handkarten + Skat (12 Karten, bzw. 10 zur Reiz-Schätzung)
// outcome = { schneider, schwarz } – tatsächlich erreichte Stufen
export function computeValue(game, declarerCards, outcome = {}) {
  if (game.type === 'null') {
    const v = nullValue(game);
    return { value: v, base: v, factor: 1, parts: [], matadors: null };
  }
  const base = baseValue(game);
  const m = matadors(declarerCards, game);
  const parts = [
    { label: `${m.mit ? 'mit' : 'ohne'} ${m.count}`, n: m.count },
    { label: 'Spiel', n: 1 },
  ];
  const schwarzAnn = !!(game.schwarzAnnounced || game.ouvert);
  const schneiderAnn = !!(game.schneiderAnnounced || schwarzAnn);
  const schwarz = !!(outcome.schwarz || schwarzAnn);
  const schneider = !!(outcome.schneider || schneiderAnn || schwarz);
  if (game.hand) parts.push({ label: 'Hand', n: 1 });
  if (schneider) parts.push({ label: 'Schneider', n: 1 });
  if (schneiderAnn) parts.push({ label: 'Schneider angesagt', n: 1 });
  if (schwarz) parts.push({ label: 'Schwarz', n: 1 });
  if (schwarzAnn) parts.push({ label: 'Schwarz angesagt', n: 1 });
  if (game.ouvert) parts.push({ label: 'Ouvert', n: 1 });
  const factor = parts.reduce((s, p) => s + p.n, 0);
  return { value: factor * base, base, factor, parts, matadors: m };
}

// Alle möglichen Reizwerte
export const BID_VALUES = (() => {
  const set = new Set([23, 35, 46, 59]);
  for (const b of [9, 10, 11, 12]) for (let f = 2; f <= 18; f++) set.add(b * f);
  for (let f = 2; f <= 11; f++) set.add(24 * f);
  return [...set].filter((v) => v >= 18).sort((a, b) => a - b);
})();

export function nextBid(v) {
  return BID_VALUES.find((b) => b > v);
}

// Abrechnung eines Spiels
export function settle({ game, declarerCards, declarerPoints, declarerTricks, bid }) {
  if (game.type === 'null') {
    const value = nullValue(game);
    const overbid = value < bid;
    const won = declarerTricks === 0 && !overbid;
    let v = value;
    if (overbid) v = [23, 35, 46, 59].find((x) => x >= bid) || value;
    return { won, overbid, value: v, score: won ? v : -2 * v, calc: computeValue(game, declarerCards), schneider: false, schwarz: false, reason: won ? 'Keinen Stich bekommen.' : overbid ? 'Überreizt.' : 'Der Alleinspieler hat einen Stich bekommen.' };
  }
  const schneider = declarerPoints >= 90 || declarerPoints <= 30;
  const schwarz = declarerTricks === 10 || declarerTricks === 0;
  let won = declarerPoints >= 61;
  let reason = won ? `${declarerPoints} Augen – mindestens 61 erreicht.` : `Nur ${declarerPoints} Augen – 61 wären nötig gewesen.`;
  const schwarzAnn = game.schwarzAnnounced || game.ouvert;
  if (game.schneiderAnnounced && !schwarzAnn && declarerPoints < 90) { won = false; reason = 'Schneider angesagt, aber keine 90 Augen erreicht.'; }
  if (schwarzAnn && declarerTricks < 10) { won = false; reason = 'Schwarz angesagt, aber nicht alle Stiche gemacht.'; }
  const calc = computeValue(game, declarerCards, { schneider, schwarz });
  let value = calc.value;
  let overbid = false;
  if (value < bid) {
    overbid = true;
    won = false;
    value = Math.ceil(bid / calc.base) * calc.base;
    reason = `Überreizt: Spielwert ${calc.value} ist kleiner als der Reizwert ${bid}.`;
  }
  return { won, overbid, value, score: won ? value : -2 * value, calc, schneider, schwarz, reason };
}

export function allGames() {
  return [
    ...SUITS.map((s) => ({ type: 'suit', trump: s })),
    { type: 'grand' },
    { type: 'null' },
  ];
}
