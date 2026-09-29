import test from 'node:test';
import assert from 'node:assert/strict';
import { legalCards, trickWinner, matadors, computeValue, settle, sumPoints, newDeck, BID_VALUES, nextBid, sortHand } from '../js/skat.js';
import { bestBid, chooseDeclaration, chooseCard } from '../js/ai.js';
import { simulateGame } from '../js/sim.js';

const kreuz = { type: 'suit', trump: 'C' };
const grand = { type: 'grand' };
const nul = { type: 'null' };

test('Kartensatz hat 120 Augen', () => {
  assert.equal(newDeck().length, 32);
  assert.equal(sumPoints(newDeck()), 120);
});

test('Buben sind Trumpf und gehören nicht zu ihrer Farbe', () => {
  assert.deepEqual(legalCards(['HJ', 'H7', 'C8'], 'HA', kreuz), ['H7']);
  assert.deepEqual(legalCards(['HJ', 'H7', 'C8'], 'CA', kreuz).sort(), ['C8', 'HJ'].sort());
  assert.deepEqual(legalCards(['HJ', 'H7'], 'SA', kreuz).sort(), ['H7', 'HJ'].sort());
  assert.deepEqual(legalCards(['HJ', 'H7', 'D8'], 'H10', nul), ['HJ', 'H7']);
});

test('Stichgewinner', () => {
  assert.equal(trickWinner(['HA', 'H10', 'C7'], kreuz), 2);
  assert.equal(trickWinner(['C7', 'DJ', 'CJ'], kreuz), 2);
  assert.equal(trickWinner(['HA', 'SA', 'DA'], grand), 0);
  assert.equal(trickWinner(['H10', 'HJ', 'HA'], nul), 2);
  assert.equal(trickWinner(['H10', 'HJ', 'H9'], nul), 1);
  assert.equal(trickWinner(['H10', 'HK', 'HA'], grand), 2);
  assert.equal(trickWinner(['H10', 'HK', 'HQ'], grand), 0);
});

test('Spitzen', () => {
  assert.deepEqual(matadors(['CJ', 'SJ', 'DJ'], kreuz), { mit: true, count: 2 });
  assert.deepEqual(matadors(['HJ', 'C7'], kreuz), { mit: false, count: 2 });
  assert.deepEqual(matadors(['CJ', 'SJ', 'HJ', 'DJ', 'CA', 'C10'], kreuz), { mit: true, count: 6 });
  assert.deepEqual(matadors(['H7'], grand), { mit: false, count: 4 });
});

test('Spielwerte', () => {
  assert.equal(computeValue(kreuz, ['CJ', 'H7']).value, 24);
  assert.equal(computeValue({ ...grand, hand: true }, ['CJ', 'SJ']).value, 24 * 4);
  assert.equal(computeValue({ type: 'suit', trump: 'H' }, ['SJ']).value, 20);
  assert.equal(computeValue({ type: 'null', hand: true, ouvert: true }, []).value, 59);
});

test('Abrechnung inkl. überreizt', () => {
  const r = settle({ game: kreuz, declarerCards: ['CJ'], declarerPoints: 61, declarerTricks: 4, bid: 18 });
  assert.equal(r.won, true); assert.equal(r.score, 24);
  const l = settle({ game: kreuz, declarerCards: ['CJ'], declarerPoints: 60, declarerTricks: 4, bid: 18 });
  assert.equal(l.score, -48);
  const s = settle({ game: kreuz, declarerCards: ['CJ'], declarerPoints: 25, declarerTricks: 2, bid: 18 });
  assert.equal(s.score, -72);
  const o = settle({ game: { type: 'suit', trump: 'D' }, declarerCards: ['CJ'], declarerPoints: 70, declarerTricks: 5, bid: 20 });
  assert.equal(o.overbid, true); assert.equal(o.score, -2 * 27);
  const ok = settle({ game: { type: 'suit', trump: 'D' }, declarerCards: ['CJ'], declarerPoints: 95, declarerTricks: 8, bid: 27 });
  assert.equal(ok.won, true); assert.equal(ok.score, 27);
});

test('Reizwerte', () => {
  assert.deepEqual(BID_VALUES.slice(0, 8), [18, 20, 22, 23, 24, 27, 30, 33]);
  assert.equal(nextBid(18), 20);
  assert.equal(BID_VALUES.at(-1), 264);
});

test('Sortierung', () => {
  assert.deepEqual(sortHand(['C7', 'HJ', 'CA', 'CJ', 'SA'], kreuz), ['CJ', 'HJ', 'CA', 'C7', 'SA']);
});

test('Simulierte Spiele verlaufen regelkonform', () => {
  for (let i = 0; i < 40; i++) {
    const g = simulateGame();
    const played = g.tricks.flat().map((x) => x.card);
    assert.equal(new Set(played).size, 30);
    assert.equal(sumPoints(played) + sumPoints(g.pushed), 120);
    // Bedienpflicht prüfen
    const hands = g.handsAfterSkat.map((h) => h.slice());
    for (const t of g.tricks) {
      for (let j = 0; j < 3; j++) {
        const { player, card } = t[j];
        const legal = legalCards(hands[player], j ? t[0].card : null, g.game);
        assert.ok(legal.includes(card), `illegal ${card}`);
        hands[player] = hands[player].filter((c) => c !== card);
      }
    }
  }
});

test('KI-Null wird gespielt', () => {
  const r = bestBid(['C7', 'C9', 'S7', 'S8', 'H7', 'H9', 'HJ', 'D7', 'D8', 'D9']);
  assert.equal(r.best.game.type, 'null');
});

test('Starke Kreuz-Hand wird gereizt', () => {
  const r = bestBid(['CJ', 'SJ', 'CA', 'C10', 'CK', 'C9', 'HA', 'H10', 'S7', 'D8']);
  assert.equal(r.best.game.type, 'suit'); assert.equal(r.best.game.trump, 'C'); assert.equal(r.maxBid, 36);
});
