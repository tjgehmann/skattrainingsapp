// Komplettes Spiel nur mit Computerspielern simulieren (für Übungen zum Mitzählen)
import { deal, trickWinner, sumPoints, nextBid, isTrump } from './skat.js';
import { bestBid, chooseDeclaration, chooseCard } from './ai.js';

export function simulateGame(rng = Math.random, requireSuitOrGrand = true) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const { hands, skat } = deal(rng);
    const bids = hands.map((h) => bestBid(h).maxBid);
    const order = [0, 1, 2].sort((a, b) => bids[b] - bids[a]);
    const declarer = order[0];
    if (bids[declarer] < 18) continue;
    const bid = Math.min(bids[declarer], Math.max(18, nextBid(bids[order[1]]) || 18));
    const start = hands[declarer].slice();
    const decl = chooseDeclaration([...hands[declarer], ...skat], bid);
    if (requireSuitOrGrand && decl.game.type === 'null') continue;
    const game = decl.game;
    const cur = hands.map((h) => h.slice());
    cur[declarer] = decl.rest || [...hands[declarer], ...skat].filter((c) => !decl.skat.includes(c));
    const handsAfterSkat = cur.map((h) => h.slice());
    const tricks = [];
    let leader = 0;
    const taken = [[], [], []];
    for (let t = 0; t < 10; t++) {
      const trick = [];
      for (let i = 0; i < 3; i++) {
        const p = (leader + i) % 3;
        const { card } = chooseCard({ player: p, hand: cur[p], trick, game, declarer, tricks, skat: p === declarer ? decl.skat : null });
        cur[p] = cur[p].filter((c) => c !== card);
        trick.push({ player: p, card });
      }
      const w = trick[trickWinner(trick.map((x) => x.card), game)].player;
      taken[w].push(...trick.map((x) => x.card));
      tricks.push(trick);
      leader = w;
    }
    return { hands, skat, declarer, bid, game, pushed: decl.skat, startHand: start, handsAfterSkat, tricks, taken };
  }
  throw new Error('Simulation fehlgeschlagen');
}

export function trickWinnerPlayer(trick, game) {
  return trick[trickWinner(trick.map((x) => x.card), game)].player;
}

export function pointsOf(cards) { return sumPoints(cards); }
export function trumpsIn(cards, game) { return cards.filter((c) => isTrump(c, game)).length; }
