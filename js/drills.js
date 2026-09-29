import {
  SUITS, SUIT_NAMES, BASE, newDeck, shuffle, points, sumPoints, cardName, rankOf, suitOf, isTrump, effSuit,
  power, legalCards, trickWinner, sortHand, matadors, computeValue, trumpSequence, gameName, nextBid, BID_VALUES,
  settle, allGames, baseValue,
} from './skat.js';
import { evaluate, bestBid, chooseDeclaration } from './ai.js';
import { simulateGame } from './sim.js';
import { cardsHTML, inlineCard as ic } from './ui.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const icList = (cs) => cs.map(ic).join(' ');
const POS = ['Du', 'Links', 'Rechts'];

function randomGame(weights = { suit: 5, grand: 2, null: 1 }) {
  const pool = [];
  for (const [t, w] of Object.entries(weights)) for (let i = 0; i < w; i++) pool.push(t);
  const t = pick(pool);
  return t === 'suit' ? { type: 'suit', trump: pick(SUITS) } : { type: t };
}

function gameBadge(game) {
  return `<div class="game-badge">Spiel: <strong>${gameName(game)}</strong>${game.type === 'suit' ? ` <span class="s-${game.trump}">${'♣♠♥♦'[SUITS.indexOf(game.trump)]}</span>` : ''}</div>`;
}

function uniqueOptions(correct, candidates, n = 4) {
  const set = new Set([correct]);
  for (const c of shuffle(candidates)) {
    if (set.size >= n) break;
    if (c !== undefined && c !== null) set.add(c);
  }
  return shuffle([...set]);
}

export const DRILLS = {
  augen: {
    title: 'Augen zählen',
    intro: 'Wie viele Augen liegen hier? Ass 11 · Zehn 10 · König 4 · Dame 3 · Bube 2.',
    make() {
      const cs = shuffle(newDeck()).slice(0, randInt(2, 5));
      const sum = sumPoints(cs);
      return {
        prompt: `<p>Wie viele Augen sind das zusammen?</p>${cardsHTML(cs)}`,
        kind: 'number',
        check: (v) => ({
          ok: Number(v) === sum,
          explanation: `${cs.map((c) => `${ic(c)} = ${points(c)}`).join(' · ')} → <strong>${sum} Augen</strong>`,
        }),
      };
    },
  },

  hoechste: {
    title: 'Höchste Karte',
    intro: 'Tippe die Karte an, die am höchsten ist. Denk an die Rangfolge der Trümpfe!',
    make() {
      const game = randomGame({ suit: 4, grand: 2, null: 2 });
      let pool;
      if (game.type === 'null') {
        const s = pick(SUITS);
        pool = newDeck().filter((c) => suitOf(c) === s);
      } else if (game.type === 'grand') {
        const s = pick(SUITS);
        pool = newDeck().filter((c) => rankOf(c) === 'J' || suitOf(c) === s);
      } else {
        pool = trumpSequence(game);
        if (Math.random() < 0.3) pool = newDeck().filter((c) => isTrump(c, game) || suitOf(c) === pick(SUITS.filter((x) => x !== game.trump)));
      }
      const cs = shuffle(pool).slice(0, 4);
      const winner = cs.slice().sort((a, b) => {
        const ta = isTrump(a, game), tb = isTrump(b, game);
        if (ta !== tb) return ta ? -1 : 1;
        return power(b, game) - power(a, game);
      })[0];
      const why = game.type === 'null'
        ? 'Im Null gilt: Ass, König, Dame, Bube, 10, 9, 8, 7 – ohne Trumpf.'
        : game.type === 'grand'
          ? 'Im Grand sind nur die Buben Trumpf (Kreuz > Pik > Herz > Karo), danach Ass, 10, König, Dame, 9, 8, 7.'
          : `Trumpf-Reihenfolge: Kreuz-, Pik-, Herz-, Karo-Bube, dann ${SUIT_NAMES[game.trump]} Ass, 10, König, Dame, 9, 8, 7. Trumpf ist höher als jede Fehlfarbe.`;
      return {
        prompt: `${gameBadge(game)}<p>Welche Karte ist am höchsten?</p>`,
        kind: 'pick', cards: cs,
        check: (c) => ({ ok: c === winner, correct: [winner], explanation: `Am höchsten ist ${ic(winner)}. ${why}` }),
      };
    },
  },

  bedienen: {
    title: 'Bedienen',
    intro: 'Markiere alle Karten, die du auf die ausgespielte Karte legen darfst.',
    make() {
      const game = randomGame({ suit: 5, grand: 2, null: 1 });
      const deck = shuffle(newDeck());
      let hand = deck.slice(0, randInt(6, 10));
      let lead;
      // interessante Fälle bevorzugen: Bube in der Hand, dessen Farbe angespielt wird
      const jackInHand = hand.find((c) => rankOf(c) === 'J');
      const rest = deck.filter((c) => !hand.includes(c));
      if (jackInHand && game.type !== 'null' && Math.random() < 0.5) {
        lead = rest.find((c) => suitOf(c) === suitOf(jackInHand) && !isTrump(c, game)) || pick(rest);
      } else lead = pick(rest);
      hand = sortHand(hand, game);
      const legal = legalCards(hand, lead, game);
      const e = effSuit(lead, game);
      const ledName = e === 'T' ? 'Trumpf' : SUIT_NAMES[e];
      return {
        prompt: `${gameBadge(game)}<p>Ausgespielt wird ${ic(lead)} (${cardName(lead)}). Welche Karten darfst du spielen?</p>`,
        kind: 'multi', cards: hand,
        check: (sel) => {
          const ok = sel.length === legal.length && sel.every((c) => legal.includes(c));
          const follow = hand.filter((c) => effSuit(c, game) === e);
          let expl = `Angespielt ist <strong>${ledName}</strong>. `;
          if (follow.length) expl += `Du musst bedienen: ${icList(follow)}.`;
          else expl += 'Du hast keine Karte dieser Farbe – du darfst jede Karte spielen.';
          if (game.type !== 'null' && e !== 'T' && hand.some((c) => rankOf(c) === 'J' && suitOf(c) === e)) expl += ' Achtung: Der Bube dieser Farbe ist Trumpf und zählt nicht zur Farbe!';
          if (e === 'T' && game.type === 'suit') expl += ` Trumpf sind alle Buben und alle ${SUIT_NAMES[game.trump]}-Karten.`;
          return { ok, correct: legal, explanation: expl };
        },
      };
    },
  },

  stich: {
    title: 'Wer bekommt den Stich?',
    intro: 'Drei Karten liegen im Stich. Tippe die Karte an, die gewinnt.',
    make() {
      const game = randomGame({ suit: 5, grand: 2, null: 2 });
      const deck = shuffle(newDeck());
      const lead = deck[0];
      // zweite/dritte Karte oft passend zur Farbe, damit es knifflig wird
      const cand = deck.slice(1);
      const same = cand.filter((c) => effSuit(c, game) === effSuit(lead, game));
      const cs = [lead];
      for (let i = 0; i < 2; i++) {
        const from = Math.random() < 0.55 && same.length ? same : cand;
        const c = from.find((x) => !cs.includes(x));
        cs.push(c);
      }
      const w = trickWinner(cs, game);
      const trumpIn = cs.some((c) => isTrump(c, game));
      const expl = trumpIn
        ? `Im Stich liegt Trumpf – der höchste Trumpf gewinnt: ${ic(cs[w])}.`
        : `Kein Trumpf im Stich – die höchste Karte der angespielten Farbe (${SUIT_NAMES[suitOf(lead)]}) gewinnt: ${ic(cs[w])}.`;
      return {
        prompt: `${gameBadge(game)}<p>Die Karten wurden in dieser Reihenfolge gespielt (zuerst ausgespielt: ${ic(lead)}). Welche gewinnt?</p>`,
        kind: 'pick', cards: cs, ordered: true,
        check: (c) => ({ ok: c === cs[w], correct: [cs[w]], explanation: `${expl} Der Stich enthält ${sumPoints(cs)} Augen.` }),
      };
    },
  },

  spitzen: {
    title: 'Spitzen bestimmen',
    intro: 'Mit oder ohne wie viele? Hand und Skat zählen zusammen.',
    make() {
      const game = randomGame({ suit: 3, grand: 2 });
      const seq = trumpSequence(game);
      const max = game.type === 'grand' ? 4 : 6;
      const k = Math.min(max, pick([1, 1, 1, 2, 2, 2, 3, 3, 4, 5]));
      const mit = Math.random() < 0.55;
      const cards = [], excluded = [];
      for (let i = 0; i < k; i++) (mit ? cards : excluded).push(seq[i]);
      if (seq[k]) (mit ? excluded : cards).push(seq[k]);
      const rest = shuffle(newDeck().filter((c) => !cards.includes(c) && !excluded.includes(c)));
      while (cards.length < 12) cards.push(rest.pop());
      const m = matadors(cards, game);
      const label = (mt, n) => `${mt ? 'mit' : 'ohne'} ${n}`;
      const correct = label(m.mit, m.count);
      const cands = [];
      for (const mt of [true, false]) for (const n of [m.count - 1, m.count, m.count + 1]) if (n >= 1 && n <= (game.type === 'grand' ? 4 : 11)) cands.push(label(mt, n));
      const opts = uniqueOptions(correct, cands, 4);
      return {
        prompt: `${gameBadge(game)}<p>Hand + Skat des Alleinspielers:</p>${cardsHTML(sortHand(cards, game), { size: 'sm' })}<p>Mit oder ohne wie viele Spitzen?</p>`,
        kind: 'choice', options: opts.map((o) => ({ label: o, value: o })),
        check: (v) => ({
          ok: v === correct, correct: [correct],
          explanation: `Die Trumpfreihe beginnt mit ${icList(seq.slice(0, Math.min(seq.length, m.count + 1)))}. ${m.mit ? 'Der Kreuz-Bube ist da' : 'Der Kreuz-Bube fehlt'} → <strong>${correct}</strong>.`,
        }),
      };
    },
  },

  spielwert: {
    title: 'Spielwert berechnen',
    intro: 'Spielwert = Grundwert × (Spitzen + 1 + Extras).',
    make() {
      const game = randomGame({ suit: 4, grand: 2 });
      const seq = trumpSequence(game);
      const k = pick([1, 1, 2, 2, 3, 4]);
      const mit = Math.random() < 0.6;
      const cards = [], excluded = [];
      for (let i = 0; i < k; i++) (mit ? cards : excluded).push(seq[i]);
      if (seq[k]) (mit ? excluded : cards).push(seq[k]);
      const rest = shuffle(newDeck().filter((c) => !cards.includes(c) && !excluded.includes(c)));
      while (cards.length < 12) cards.push(rest.pop());
      game.hand = Math.random() < 0.3;
      if (game.hand && Math.random() < 0.3) game.schneiderAnnounced = true;
      const outcome = { schneider: game.schneiderAnnounced || Math.random() < 0.25 };
      const v = computeValue(game, cards, outcome);
      const extras = [];
      if (game.hand) extras.push('Hand gespielt');
      if (game.schneiderAnnounced) extras.push('Schneider angesagt und erreicht');
      else if (outcome.schneider) extras.push('Schneider erreicht (≥ 90 Augen)');
      return {
        prompt: `${gameBadge({ type: game.type, trump: game.trump })}<p>Hand + Skat:</p>${cardsHTML(sortHand(cards, game), { size: 'sm' })}
          <p>${extras.length ? extras.join(', ') + '.' : 'Skat aufgenommen, gewonnen ohne Schneider.'} Wie hoch ist der Spielwert?</p>`,
        kind: 'number',
        check: (x) => ({
          ok: Number(x) === v.value,
          explanation: `${v.parts.map((p) => `${p.label} (${p.n})`).join(' + ')} = <strong>${v.factor} Stufen</strong> × Grundwert ${v.base} = <strong>${v.value}</strong>`,
        }),
      };
    },
  },

  reizfolge: {
    title: 'Reizwerte kennen',
    intro: 'Die Reizwerte muss man im Schlaf können.',
    make() {
      const type = pick(['next', 'next', 'base', 'value']);
      if (type === 'next') {
        const i = randInt(0, 22);
        const v = BID_VALUES[i];
        const correct = BID_VALUES[i + 1];
        const opts = uniqueOptions(correct, [BID_VALUES[i + 2], BID_VALUES[i + 3], v + 1, v + 2, correct + 1, BID_VALUES[Math.max(0, i - 1)]].filter((x) => x !== v));
        return {
          prompt: `<p>Es wurde <strong>${v}</strong> gereizt. Was ist der nächste Reizwert?</p>`,
          kind: 'choice', options: opts.map((o) => ({ label: String(o), value: o })),
          check: (x) => ({ ok: x === correct, correct: [correct], explanation: `Reizfolge: … ${BID_VALUES.slice(Math.max(0, i - 2), i + 3).join(' · ')} …` }),
        };
      }
      if (type === 'base') {
        const g = pick([...SUITS.map((s) => ({ type: 'suit', trump: s })), { type: 'grand' }, { type: 'null' }, { type: 'null', hand: true }, { type: 'null', ouvert: true }]);
        const correct = baseValue(g);
        const opts = uniqueOptions(correct, [9, 10, 11, 12, 23, 24, 35, 46, 59]);
        return {
          prompt: `<p>Welchen ${g.type === 'null' ? 'festen Wert' : 'Grundwert'} hat <strong>${gameName(g)}</strong>?</p>`,
          kind: 'choice', options: opts.map((o) => ({ label: String(o), value: o })),
          check: (x) => ({ ok: x === correct, correct: [correct], explanation: 'Karo 9 · Herz 10 · Pik 11 · Kreuz 12 · Grand 24 · Null 23 · Null Hand 35 · Null ouvert 46 · Null ouvert Hand 59' }),
        };
      }
      const g = randomGame({ suit: 3, grand: 1 });
      const n = randInt(1, g.type === 'grand' ? 4 : 4);
      g.hand = Math.random() < 0.3;
      const correct = (n + 1 + (g.hand ? 1 : 0)) * baseValue(g);
      const b = baseValue(g);
      const opts = uniqueOptions(correct, [(n + (g.hand ? 1 : 0)) * b, (n + 2 + (g.hand ? 1 : 0)) * b, correct + b * 2, correct - 1 > 0 ? n * b : 18]);
      return {
        prompt: `<p>Wie viel ist <strong>${gameName(g)} mit ${n}</strong> wert?</p>`,
        kind: 'choice', options: opts.map((o) => ({ label: String(o), value: o })),
        check: (x) => ({ ok: x === correct, correct: [correct], explanation: `mit ${n} + Spiel${g.hand ? ' + Hand' : ''} = ${n + 1 + (g.hand ? 1 : 0)} Stufen × ${b} = <strong>${correct}</strong>` }),
      };
    },
  },

  reizwert: {
    title: 'Bis wohin reizen?',
    intro: 'Rechne aus deinen 10 Handkarten den Wert des geplanten Spiels aus.',
    make() {
      const game = randomGame({ suit: 4, grand: 1 });
      const deck = shuffle(newDeck());
      let hand = deck.slice(0, 10);
      // Hand mit einigen Trümpfen erzeugen
      for (let tries = 0; tries < 300; tries++) {
        const h = shuffle(newDeck()).slice(0, 10);
        const t = h.filter((c) => isTrump(c, game)).length;
        if ((game.type === 'suit' && t >= 5) || (game.type === 'grand' && t >= 2)) { hand = h; break; }
      }
      const v = computeValue(game, hand);
      const m = v.matadors;
      return {
        prompt: `<p>Du möchtest <strong>${gameName(game)}</strong> spielen (Skat aufnehmen). Bis zu welchem Wert darfst du höchstens reizen?</p>${cardsHTML(sortHand(hand, game), { size: 'sm' })}`,
        kind: 'number',
        check: (x) => ({
          ok: Number(x) === v.value,
          explanation: `${m.mit ? 'Mit' : 'Ohne'} ${m.count}, Spiel ${m.count + 1} → ${m.count + 1} × ${v.base} = <strong>${v.value}</strong>.${!m.mit ? ' Vorsicht: Bei „ohne“ kann ein Bube im Skat liegen und dein Spiel weniger wert machen.' : ''}`,
        }),
      };
    },
  },

  spielwahl: {
    title: 'Spielwahl',
    intro: 'Welches Spiel würdest du mit dieser Hand reizen und spielen?',
    make() {
      for (let tries = 0; tries < 500; tries++) {
        const hand = shuffle(newDeck()).slice(0, 10);
        const { best, options } = bestBid(hand);
        const sorted = options.slice().sort((a, b) => b.margin - a.margin);
        const allBad = sorted[0].margin < -1.2;
        const clear = best && sorted[1] && best.margin - sorted.filter((o) => o.game !== best.game)[0].margin > 0.7;
        if (!allBad && !clear) continue;
        const key = (g) => (g ? (g.type === 'suit' ? g.trump : g.type) : 'pass');
        const correct = allBad ? 'pass' : key(best.game);
        const acceptable = new Set([correct]);
        if (!allBad) for (const o of options) if (o.margin >= 0 && best.margin - o.margin < 0.4) acceptable.add(key(o.game));
        const opts = [
          ...SUITS.map((s) => ({ label: SUIT_NAMES[s], value: s })),
          { label: 'Grand', value: 'grand' }, { label: 'Null', value: 'null' }, { label: 'Passen', value: 'pass' },
        ];
        const nameOf = (v) => opts.find((o) => o.value === v).label;
        return {
          prompt: `<p>Deine Hand:</p>${cardsHTML(sortHand(hand), { size: 'sm' })}<p>Welches Spiel würdest du reizen?</p>`,
          kind: 'choice', options: opts,
          check: (x) => {
            const detail = sorted.slice(0, 3).map((o) => `${gameName(o.game)}: ${o.info}`).join('<br>');
            return {
              ok: acceptable.has(x), correct: [...acceptable],
              explanation: allBad
                ? `Hier solltest du <strong>passen</strong> – kein Spiel ist sicher genug.<br><small>${detail}</small>`
                : `Am besten: <strong>${nameOf(correct)}</strong> (bis ${best.value} reizen).<br><small>${detail}</small>`,
            };
          },
        };
      }
      return this.make();
    },
  },

  druecken: {
    title: 'Skat drücken',
    intro: 'Du hast den Skat aufgenommen. Wähle die 2 Karten, die du drücken willst.',
    make() {
      for (let tries = 0; tries < 400; tries++) {
        const cards12 = shuffle(newDeck()).slice(0, 12);
        const decl = chooseDeclaration(cards12, 18);
        if (decl.game.type === 'null' && Math.random() < 0.7) continue;
        const game = decl.game;
        const ev = (skat) => {
          const rest = cards12.filter((c) => !skat.includes(c));
          let s = evaluate(rest, game, true).margin;
          if (game.type !== 'null') { s += sumPoints(skat) * 0.03; if (skat.some((c) => isTrump(c, game))) s -= 0.3; }
          return s;
        };
        const bestScore = ev(decl.skat);
        if (bestScore < -0.5) continue;
        return {
          prompt: `${gameBadge(game)}<p>Deine 12 Karten. Tippe 2 Karten zum Drücken an:</p>`,
          kind: 'pick2', cards: sortHand(cards12, game),
          check: (sel) => {
            const s = ev(sel);
            const ok = s >= bestScore - 0.35;
            const tips = [];
            if (sel.some((c) => isTrump(c, game))) tips.push('Trümpfe zu drücken schwächt dein Spiel.');
            if (sel.some((c) => rankOf(c) === 'A') && game.type !== 'null') tips.push('Asse machen meist sowieso einen Stich – lieber behalten.');
            return {
              ok, correct: decl.skat,
              explanation: `${ok ? 'Gute Wahl!' : 'Nicht optimal.'} Empfehlung: ${icList(decl.skat)}${game.type !== 'null' ? ` (${sumPoints(decl.skat)} Augen sicher im Skat)` : ''}. ${tips.join(' ')}
                ${game.type === 'null' ? 'Im Null drückt man die gefährlichsten hohen Karten.' : 'Faustregeln: Farben blank machen, blanke Zehnen drücken, keine Trümpfe weglegen.'}`,
            };
          },
        };
      }
      return this.make();
    },
  },

  abrechnung: {
    title: 'Abrechnung',
    intro: 'Gewonnen: + Spielwert. Verloren: − doppelter Spielwert. Überreizt: verloren!',
    make() {
      const game = randomGame({ suit: 4, grand: 1 });
      const seq = trumpSequence(game);
      const k = pick([1, 1, 2, 2, 3]);
      const mit = Math.random() < 0.6;
      const cards = [], excl = [];
      for (let i = 0; i < k; i++) (mit ? cards : excl).push(seq[i]);
      if (seq[k]) (mit ? excl : cards).push(seq[k]);
      const rest = shuffle(newDeck().filter((c) => !cards.includes(c) && !excl.includes(c)));
      while (cards.length < 12) cards.push(rest.pop());
      const pts = pick([randInt(61, 89), randInt(40, 60), randInt(61, 89), randInt(90, 110), randInt(20, 30)]);
      const base = computeValue(game, cards).value;
      const bid = Math.random() < 0.25 ? (nextBid(base) || base) : pick(BID_VALUES.filter((b) => b <= base));
      const r = settle({ game, declarerCards: cards, declarerPoints: pts, declarerTricks: pts >= 90 ? 8 : pts <= 30 ? 2 : 5, bid });
      const cands = [r.score, -r.score, r.won ? -2 * r.value : r.value, r.value + r.calc.base, -2 * (r.value + r.calc.base), r.won ? r.value - r.calc.base : -r.value];
      const opts = uniqueOptions(r.score, cands.filter((x) => x !== 0));
      const m = r.calc.matadors;
      return {
        prompt: `${gameBadge(game)}<p>Der Alleinspieler hat <strong>${m.mit ? 'mit' : 'ohne'} ${m.count}</strong>, es wurde bis <strong>${bid}</strong> gereizt. Er erreicht <strong>${pts} Augen</strong>. Wie wird abgerechnet?</p>`,
        kind: 'choice', options: opts.map((o) => ({ label: (o > 0 ? '+' : '') + o, value: o })),
        check: (x) => ({
          ok: x === r.score, correct: [r.score],
          explanation: `${r.reason} Spielwert: ${r.calc.parts.map((p) => p.label).join(' + ')} = ${r.calc.factor} × ${r.calc.base} = ${r.calc.value}.
            ${r.overbid ? ` Überreizt → Wert = nächstes Vielfaches des Grundwerts ≥ ${bid}: ${r.value}.` : ''}
            ${r.won ? `Gewonnen: <strong>+${r.value}</strong>` : `Verloren: −2 × ${r.value} = <strong>${r.score}</strong>`}`,
        }),
      };
    },
  },

  mitzaehlen: {
    title: 'Augen mitzählen',
    intro: 'Schau dir die Stiche nacheinander an und zähle die Augen des Alleinspielers mit – ohne Notizen!',
    make() {
      const sim = simulateGame();
      const n = randInt(4, 8);
      const tricks = sim.tricks.slice(0, n);
      const declName = POS[sim.declarer] === 'Du' ? 'Unten' : POS[sim.declarer];
      const names = ['Unten', 'Links', 'Rechts'];
      let declPts = 0;
      const steps = tricks.map((t, i) => {
        const w = t[trickWinner(t.map((x) => x.card), sim.game)].player;
        if (w === sim.declarer) declPts += sumPoints(t.map((x) => x.card));
        return `<p class="muted">Stich ${i + 1} von ${n}</p>
          <div class="trick-row">${t.map((x) => `<div class="trick-slot"><span class="who ${x.player === sim.declarer ? 'decl' : ''}">${names[x.player]}</span>${cardsHTML([x.card])}</div>`).join('')}</div>
          <p>Stich geht an <strong>${names[w]}</strong>${w === sim.declarer ? ' (Alleinspieler)' : ''}.</p>`;
      });
      return {
        prompt: `${gameBadge(sim.game)}<p>Alleinspieler ist <strong>${declName}</strong>. Zähle seine Augen aus den Stichen (ohne Skat).</p>`,
        kind: 'number', steps,
        question: `Wie viele Augen hat der Alleinspieler nach ${n} Stichen?`,
        check: (x) => ({ ok: Number(x) === declPts, explanation: `Der Alleinspieler hat <strong>${declPts} Augen</strong> in ${n} Stichen, die Gegenspieler ${sumPoints(tricks.flat().map((p) => p.card)) - declPts}.` }),
      };
    },
  },

  trumpfzaehlen: {
    title: 'Trümpfe zählen',
    intro: 'Du bist Alleinspieler. Merke dir, wie viele Trümpfe die Gegner noch haben.',
    make() {
      let sim;
      do { sim = simulateGame(); } while (sim.game.type === 'null');
      // Perspektive: der Alleinspieler ist „Du“
      const rot = (p) => (p - sim.declarer + 3) % 3;
      const names = ['Du', 'Links', 'Rechts'];
      const game = sim.game;
      const myHand = sortHand(sim.handsAfterSkat[sim.declarer], game);
      const total = game.type === 'grand' ? 4 : 11;
      const mine = myHand.filter((c) => isTrump(c, game)).length + sim.pushed.filter((c) => isTrump(c, game)).length;
      const n = randInt(3, 6);
      const tricks = sim.tricks.slice(0, n);
      const oppPlayed = tricks.flat().filter((x) => x.player !== sim.declarer && isTrump(x.card, game)).length;
      const answer = total - mine - oppPlayed;
      const steps = tricks.map((t, i) => `<p class="muted">Stich ${i + 1} von ${n}</p>
        <div class="trick-row">${t.map((x) => `<div class="trick-slot"><span class="who ${x.player === sim.declarer ? 'decl' : ''}">${names[rot(x.player)]}</span>${cardsHTML([x.card])}</div>`).join('')}</div>`);
      return {
        prompt: `${gameBadge(game)}<p>Deine Karten nach dem Drücken (gedrückt: ${icList(sim.pushed)}):</p>${cardsHTML(myHand, { size: 'sm' })}
          <p>Im ${game.type === 'grand' ? 'Grand gibt es 4' : 'Farbspiel gibt es 11'} Trümpfe. Merke dir, wie viele die Gegner haben, und verfolge die Stiche.</p>`,
        kind: 'number', steps, hidePromptDuringSteps: false,
        question: `Wie viele Trümpfe haben die Gegner nach ${n} Stichen noch?`,
        check: (x) => ({
          ok: Number(x) === answer,
          explanation: `${total} Trümpfe − ${mine} eigene (inkl. Skat) = ${total - mine} bei den Gegnern. Davon wurden ${oppPlayed} gespielt → <strong>${answer}</strong> sind noch draußen.`,
        }),
      };
    },
  },
};

export { allGames, BASE };
