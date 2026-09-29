// Computergegner: Handbewertung, Reizen, Skat drücken und Kartenspiel.
// Jede Entscheidung liefert eine Begründung mit, damit die App daraus Tipps machen kann.
import {
  SUITS, SUIT_NAMES, rankOf, suitOf, points, sumPoints, isTrump, effSuit, power, legalCards,
  trickWinner, computeValue, newDeck, cardName, allGames, gameName,
} from './skat.js';

// ---------- Handbewertung ----------

function countBy(cards, pred) { return cards.filter(pred).length; }

// Liefert { margin, info } – margin >= 0 bedeutet: spielbar
export function evaluate(cards, game, withSkat = false) {
  if (game.type === 'null') return evalNull(cards, game);
  if (game.type === 'grand') return evalGrand(cards, withSkat);
  return evalSuit(cards, game, withSkat);
}

function evalSuit(cards, game, withSkat) {
  const t = cards.filter((c) => isTrump(c, game));
  const jacks = t.filter((c) => rankOf(c) === 'J');
  let s = t.length;
  if (cards.includes('CJ')) s += 0.5;
  if (cards.includes('SJ')) s += 0.3;
  if (jacks.length >= 3) s += 0.4;
  if (cards.includes(game.trump + 'A')) s += 0.3;
  if (cards.includes(game.trump + '10')) s += 0.2;
  let aces = 0, tensWithAce = 0, blankTens = 0, voids = 0;
  for (const su of SUITS) {
    if (su === game.trump) continue;
    const sc = cards.filter((c) => suitOf(c) === su && rankOf(c) !== 'J');
    if (!sc.length) { voids++; continue; }
    const hasA = sc.some((c) => rankOf(c) === 'A');
    const hasT = sc.some((c) => rankOf(c) === '10');
    if (hasA) aces++;
    if (hasA && hasT) tensWithAce++;
    if (hasT && !hasA && sc.length === 1) blankTens++;
  }
  s += aces + 0.8 * tensWithAce - 0.4 * blankTens;
  if (t.length >= 5) s += 0.5 * voids;
  const threshold = withSkat ? 8.2 : 7.2;
  let margin = s - threshold;
  if (t.length < 5 || jacks.length === 0 && t.length < 7) margin = Math.min(margin, -0.5);
  return {
    margin,
    info: `${t.length} Trümpfe (${jacks.length} Buben), ${aces} Ass(e) nebenher${voids ? `, ${voids} Fehlfarbe(n) blank` : ''}`,
  };
}

function evalGrand(cards, withSkat) {
  const jv = { CJ: 1.5, SJ: 1.3, HJ: 1.1, DJ: 1.0 };
  const jacks = cards.filter((c) => rankOf(c) === 'J');
  let s = jacks.reduce((a, c) => a + jv[c], 0);
  let aces = 0;
  for (const su of SUITS) {
    const sc = cards.filter((c) => suitOf(c) === su && rankOf(c) !== 'J');
    const has = (r) => sc.some((c) => rankOf(c) === r);
    if (has('A')) { s += 1; aces++; if (has('10')) { s += 1; if (has('K')) s += 0.5; } }
    else if (has('10') && sc.length === 1) s -= 0.6;
    else if (has('10') && sc.length >= 3) s += 0.3;
    if (has('A') && sc.length >= 4) s += 0.5 * (sc.length - 3);
  }
  const threshold = withSkat ? 8.0 : 7.9;
  let margin = s - threshold;
  if (jacks.length < 2 || !(cards.includes('CJ') || cards.includes('SJ'))) margin = Math.min(margin, -0.5);
  return { margin, info: `${jacks.length} Buben, ${aces} Ass(e)` };
}

// Risiko für Null: je Farbe, ob die niedrigen Karten „durchkommen“
export function nullRisk(cards) {
  const NO = { '7': 0, '8': 1, '9': 2, '10': 3, J: 4, Q: 5, K: 6, A: 7 };
  let risk = 0;
  const bad = [];
  for (const su of SUITS) {
    const sc = cards.filter((c) => suitOf(c) === su).map((c) => NO[rankOf(c)]).sort((a, b) => a - b);
    let worst = 0;
    sc.forEach((v, i) => { worst = Math.max(worst, v - 2 * i); });
    if (sc.length >= 5) worst = Math.max(0, worst - 1);
    if (worst > 0) { risk += worst; bad.push(SUIT_NAMES[su]); }
  }
  return { risk, bad };
}

function evalNull(cards, game) {
  const { risk, bad } = nullRisk(cards);
  const margin = (game.ouvert ? 0 : 1.2) - risk;
  return { margin, info: risk === 0 ? 'alle Farben sicher' : `unsicher in ${bad.join(', ')}` };
}

// Bestes Spiel für eine 10-Karten-Hand beim Reizen
export function bestBid(cards) {
  let best = null;
  const options = [];
  for (const g of allGames()) {
    const ev = evaluate(cards, g, false);
    const value = computeValue(g, cards).value;
    options.push({ game: g, margin: ev.margin, value, info: ev.info });
    if (ev.margin >= 0 && (!best || value > best.value || (value === best.value && ev.margin > best.margin))) {
      best = { game: g, value, margin: ev.margin, info: ev.info };
    }
  }
  options.sort((a, b) => b.margin - a.margin);
  return { best, maxBid: best ? best.value : 0, options };
}

// Bestes Spiel + Drücken nach Skataufnahme (12 Karten)
export function chooseDeclaration(cards12, bid) {
  const results = [];
  const games = bid > 23 ? [...allGames(), { type: 'null', ouvert: true }] : allGames();
  for (const g of games) {
    let bestForGame = null;
    for (let i = 0; i < 12; i++) {
      for (let j = i + 1; j < 12; j++) {
        const skat = [cards12[i], cards12[j]];
        const rest = cards12.filter((_, k) => k !== i && k !== j);
        const ev = evaluate(rest, g, true);
        let score = ev.margin;
        if (g.type !== 'null') {
          score += sumPoints(skat) * 0.03;
          if (skat.some((c) => isTrump(c, g))) score -= 0.3;
        }
        if (!bestForGame || score > bestForGame.score) bestForGame = { game: g, skat, rest, score, margin: ev.margin };
      }
    }
    bestForGame.value = computeValue(g, cards12).value;
    results.push(bestForGame);
  }
  const ok = results.filter((r) => r.value >= bid);
  let choice;
  if (ok.length) {
    const playable = ok.filter((r) => r.margin >= 0);
    const pool = playable.length ? playable : ok;
    // Unter spielbaren Spielen: das sicherste, bei ähnlicher Sicherheit das wertvollere
    pool.sort((a, b) => (b.score + b.value / 40) - (a.score + a.value / 40));
    choice = pool[0];
  } else {
    results.sort((a, b) => b.value - a.value);
    choice = results[0];
  }
  return { game: { ...choice.game, hand: false }, skat: choice.skat, results };
}

// ---------- Kartenspiel ----------
// ctx = { player, hand, trick:[{player,card}], game, declarer, tricks:[[{player,card}]], skat (nur Alleinspieler) }

function knowledge(ctx) {
  const seen = new Set(ctx.hand);
  for (const t of ctx.tricks) for (const p of t) seen.add(p.card);
  for (const p of ctx.trick) seen.add(p.card);
  if (ctx.player === ctx.declarer && ctx.skat) ctx.skat.forEach((c) => seen.add(c));
  const unseen = newDeck().filter((c) => !seen.has(c));
  // Bekannte Fehlfarben
  const voids = [new Set(), new Set(), new Set()];
  for (const t of [...ctx.tricks, ctx.trick]) {
    if (!t.length) continue;
    const lead = effSuit(t[0].card, ctx.game);
    for (const p of t.slice(1)) if (effSuit(p.card, ctx.game) !== lead) voids[p.player].add(lead);
  }
  return { unseen, voids };
}

function lowest(cards, game) {
  return cards.slice().sort((a, b) =>
    points(a) - points(b) || (isTrump(a, game) ? 1 : 0) - (isTrump(b, game) ? 1 : 0) || power(a, game) - power(b, game))[0];
}
function highestPoints(cards, game) {
  return cards.slice().sort((a, b) => points(b) - points(a) || power(a, game) - power(b, game))[0];
}

export function chooseCard(ctx) {
  const { hand, trick, game } = ctx;
  const legal = legalCards(hand, trick.length ? trick[0].card : null, game);
  if (legal.length === 1) return { card: legal[0], reason: 'Das ist die einzige Karte, die du spielen darfst.' };
  const k = knowledge(ctx);
  if (game.type === 'null') return nullPlay(ctx, legal, k);
  return trick.length === 0 ? leadCard(ctx, legal, k) : followCard(ctx, legal, k);
}

function isTop(c, game, unseen) {
  const e = effSuit(c, game);
  return !unseen.some((u) => effSuit(u, game) === e && power(u, game) > power(c, game));
}

function leadCard(ctx, legal, k) {
  const { game, player, declarer } = ctx;
  const trumps = legal.filter((c) => isTrump(c, game));
  const side = legal.filter((c) => !isTrump(c, game));
  const unseenTrumps = k.unseen.filter((c) => isTrump(c, game));

  if (player === declarer) {
    const opps = [0, 1, 2].filter((p) => p !== declarer);
    if (trumps.length && unseenTrumps.length) {
      const top = trumps.filter((c) => isTop(c, game, k.unseen)).sort((a, b) => points(a) - points(b) || power(a, game) - power(b, game));
      if (top.length) return { card: top[0], reason: 'Trumpf ziehen: Mit dem höchsten Trumpf holst du den Gegnern ihre Trümpfe heraus, damit deine Asse später nicht gestochen werden.' };
      if (trumps.length > unseenTrumps.length || trumps.length >= 4) {
        const low = trumps.slice().sort((a, b) => power(a, game) - power(b, game))[0];
        return { card: low, reason: 'Trumpf ziehen: Du hast mehr Trümpfe als die Gegner – spiele einen kleinen Trumpf, um ihre Trümpfe herauszulocken.' };
      }
    }
    const safe = side.filter((c) => isTop(c, game, k.unseen) && (unseenTrumps.length === 0 || !opps.some((o) => k.voids[o].has(suitOf(c)))));
    if (safe.length) return { card: highestPoints(safe, game), reason: 'Freie hohe Karte: Diese Karte ist die höchste ihrer Farbe – sie bringt sicher Augen.' };
    if (side.length) {
      // längste Nebenfarbe mit einer kleinen Karte entwickeln
      const bySuit = {};
      side.forEach((c) => { (bySuit[suitOf(c)] ||= []).push(c); });
      const longest = Object.values(bySuit).sort((a, b) => b.length - a.length)[0];
      return { card: lowest(longest, game), reason: 'Farbe entwickeln: Spiele eine kleine Karte deiner längsten Nebenfarbe, damit die hohen Karten der Gegner fallen.' };
    }
    return { card: lowest(trumps, game), reason: 'Nur noch Trümpfe übrig.' };
  }

  // Gegenspieler spielt aus
  const partner = [0, 1, 2].find((p) => p !== player && p !== declarer);
  const declVoid = k.voids[declarer];
  const shortWay = (player + 1) % 3 === declarer; // Alleinspieler sitzt direkt hinter mir
  if (side.length) {
    // Partnerfarbe zurückspielen
    for (const t of ctx.tricks) {
      if (t[0].player === partner && !isTrump(t[0].card, game)) {
        const su = suitOf(t[0].card);
        const mine = side.filter((c) => suitOf(c) === su);
        if (mine.length) {
          const top = mine.filter((c) => isTop(c, game, k.unseen));
          return { card: top.length ? highestPoints(top, game) : lowest(mine, game), reason: `Partnerfarbe zurückspielen: Dein Mitspieler hat ${SUIT_NAMES[su]} angespielt – spiel die Farbe zurück.` };
        }
      }
    }
    const aces = side.filter((c) => rankOf(c) === 'A' && !declVoid.has(suitOf(c)));
    if (aces.length) return { card: aces[0], reason: 'Ass vorspielen: Ein Ass bringt sichere Augen, solange der Alleinspieler die Farbe noch bedienen muss.' };
    const bySuit = {};
    side.forEach((c) => { (bySuit[suitOf(c)] ||= []).push(c); });
    const suits = Object.values(bySuit).filter((cs) => !declVoid.has(suitOf(cs[0])));
    const pool = suits.length ? suits : Object.values(bySuit);
    // blanke Zehn möglichst nicht anspielen
    const nonBlankTen = pool.filter((cs) => !(cs.length === 1 && rankOf(cs[0]) === '10'));
    const pool2 = nonBlankTen.length ? nonBlankTen : pool;
    if (shortWay) {
      const longest = pool2.sort((a, b) => b.length - a.length)[0];
      return { card: lowest(longest, game), reason: 'Kurzer Weg – lange Farbe: Der Alleinspieler sitzt direkt hinter dir. Spiele deine lange Farbe an, dein Partner sitzt dahinter und kann reagieren.' };
    }
    const shortest = pool2.sort((a, b) => a.length - b.length)[0];
    return { card: lowest(shortest, game), reason: 'Langer Weg – kurze Farbe: Der Alleinspieler sitzt hinten. Spiele eine kurze Farbe an, damit dein Partner vor ihm mit hohen Karten reagieren kann.' };
  }
  return { card: lowest(trumps, game), reason: 'Nur noch Trümpfe – spiele den kleinsten.' };
}

function followCard(ctx, legal, k) {
  const { game, player, declarer, trick } = ctx;
  const cards = trick.map((p) => p.card);
  const wi = trickWinner(cards, game);
  const winner = trick[wi].player;
  const isLast = trick.length === 2;
  const trickPts = sumPoints(cards);
  const beats = (c) => trickWinner([...cards, c], game) === cards.length;
  const winners = legal.filter(beats).sort((a, b) => power(a, game) - power(b, game) || points(a) - points(b));
  const losers = legal.filter((c) => !beats(c));
  const leadSuit = effSuit(cards[0], game);
  const canFollow = legal.some((c) => effSuit(c, game) === leadSuit);
  const unseenTrumps = k.unseen.filter((c) => isTrump(c, game));
  const cheapWinner = () => winners.slice().sort((a, b) => (isTrump(a, game) ? 1 : 0) - (isTrump(b, game) ? 1 : 0) || power(a, game) - power(b, game))[0];

  if (player === declarer) {
    if (winners.length) {
      if (isLast) {
        const w = cheapWinner();
        if (trickPts === 0 && isTrump(w, game) && leadSuit !== 'T' && losers.length) {
          return { card: lowest(losers, game), reason: 'Keine Augen im Stich – Trumpf sparen und eine wertlose Karte abwerfen.' };
        }
        return { card: w, reason: 'Du sitzt hinten: Nimm den Stich mit der kleinstmöglichen Karte, die ihn gewinnt.' };
      }
      const next = [0, 1, 2].find((p) => p !== player && p !== trick[0].player);
      const sure = winners.filter((c) => isTop(c, game, k.unseen) && !(k.voids[next].has(effSuit(cards[0], game)) && !isTrump(c, game) && unseenTrumps.length));
      if (sure.length) return { card: highestPoints(sure, game), reason: 'Sicherer Stich: Deine Karte kann nicht mehr überstochen werden – nimm möglichst viele Augen mit.' };
      if (trickPts >= 10 && winners.length) {
        const w = winners[winners.length - 1];
        return { card: w, reason: 'Viele Augen im Stich: Mit einer hohen Karte versuchen, den Stich zu halten.' };
      }
      return { card: lowest(legal, game), reason: 'Kein sicherer Stich: Bleib niedrig und spare deine hohen Karten.' };
    }
    return { card: lowest(legal, game), reason: 'Du kannst den Stich nicht gewinnen – gib so wenig Augen wie möglich ab.' };
  }

  // Gegenspieler
  const partnerWinning = winner !== declarer;
  const declarerStillToPlay = !trick.some((p) => p.player === declarer);
  if (partnerWinning) {
    const partnerCard = cards[wi];
    const declarerMayTrump = !isTrump(partnerCard, game) && k.voids[declarer].has(leadSuit) && unseenTrumps.length > 0;
    const partnerSafe = !declarerStillToPlay || (isTop(partnerCard, game, k.unseen) && !declarerMayTrump);
    if (partnerSafe) {
      const nonTrumps = legal.filter((c) => !isTrump(c, game));
      const smear = highestPoints(canFollow || !nonTrumps.length ? legal : nonTrumps, game);
      return { card: smear, reason: 'Schmieren: Dein Partner bekommt den Stich sicher – gib ihm eine Karte mit vielen Augen.' };
    }
    if (winners.length && declarerStillToPlay) {
      const sure = winners.filter((c) => isTop(c, game, k.unseen));
      if (sure.length) return { card: sure[0], reason: 'Übernehmen: Deine Karte ist sicher höher als alles, was der Alleinspieler noch haben kann.' };
    }
    return { card: lowest(legal, game), reason: 'Der Alleinspieler kommt noch – spiel niedrig und warte ab.' };
  }
  // Alleinspieler liegt vorn
  if (winners.length) {
    if (isLast) {
      const w = cheapWinner();
      return { card: w, reason: 'Stich übernehmen: Der Alleinspieler liegt vorn – nimm ihm den Stich mit der kleinsten ausreichenden Karte ab.' };
    }
    // Partner kommt noch nach mir
    const sure = winners.filter((c) => isTop(c, game, k.unseen));
    if (sure.length && trickPts + points(sure[0]) >= 4) return { card: highestPoints(sure, game), reason: 'Sicherer Stich gegen den Alleinspieler – hol die Augen.' };
    if (trickPts >= 10) return { card: winners[winners.length - 1], reason: 'Viele Augen im Stich – versuche, ihn dem Alleinspieler abzunehmen.' };
  }
  return { card: lowest(legal, game), reason: 'Du kannst den Stich nicht sicher holen – wirf eine Karte mit wenig Augen ab.' };
}

function nullPlay(ctx, legal, k) {
  const { game, player, declarer, trick } = ctx;
  const by = (a, b) => power(a, game) - power(b, game);
  if (player === declarer) {
    if (!trick.length) {
      const safe = legal.filter((c) => k.unseen.some((u) => suitOf(u) === suitOf(c)) && k.unseen.filter((u) => suitOf(u) === suitOf(c)).every((u) => power(u, game) > power(c, game)));
      if (safe.length) return { card: safe.sort(by)[safe.length - 1], reason: 'Null: Diese Karte ist niedriger als alle Karten der Gegner in dieser Farbe – sie kann keinen Stich machen.' };
      return { card: legal.slice().sort(by)[0], reason: 'Null: Spiele deine niedrigste Karte.' };
    }
    const cards = trick.map((p) => p.card);
    const win = cards[trickWinner(cards, game)];
    const leadSuit = suitOf(cards[0]);
    if (legal.some((c) => suitOf(c) === leadSuit)) {
      const under = legal.filter((c) => power(c, game) < power(win, game)).sort(by);
      if (under.length) return { card: under[under.length - 1], reason: 'Null: Bleib unter der höchsten Karte im Stich – mit der höchsten Karte, die das schafft.' };
      return { card: legal.slice().sort(by)[0], reason: 'Null: Leider musst du drüber.' };
    }
    return { card: legal.slice().sort(by)[legal.length - 1], reason: 'Null: Du kannst nicht bedienen – wirf deine gefährlichste (höchste) Karte ab.' };
  }
  // Gegenspieler im Null
  if (!trick.length) {
    const declVoid = k.voids[declarer];
    const cand = legal.filter((c) => !declVoid.has(suitOf(c)));
    const pool = cand.length ? cand : legal;
    return { card: pool.slice().sort(by)[0], reason: 'Null-Gegenspiel: Spiele niedrig an, damit der Alleinspieler drüber muss.' };
  }
  const cards = trick.map((p) => p.card);
  const leadSuit = suitOf(cards[0]);
  const canFollow = legal.some((c) => suitOf(c) === leadSuit);
  const declPlayed = trick.find((p) => p.player === declarer);
  if (!canFollow) return { card: legal.slice().sort(by)[legal.length - 1], reason: 'Null-Gegenspiel: Nicht bedienen können – wirf eine hohe Karte ab.' };
  if (declPlayed) {
    const win = cards[trickWinner(cards, game)];
    if (win === declPlayed.card) {
      const under = legal.filter((c) => power(c, game) < power(win, game)).sort(by);
      if (under.length) return { card: under[under.length - 1], reason: 'Null-Gegenspiel: Der Alleinspieler liegt vorn – bleib drunter, dann muss er den Stich nehmen!' };
    }
    return { card: legal.slice().sort(by)[legal.length - 1], reason: 'Null-Gegenspiel: Den Stich bekommt ohnehin ein Gegenspieler – hohe Karte loswerden.' };
  }
  return { card: legal.slice().sort(by)[0], reason: 'Null-Gegenspiel: Der Alleinspieler kommt noch – spiel niedrig, damit er drüber muss.' };
}

// Kurztext zur Handbewertung (für Tipps beim Reizen)
export function bidAdvice(cards) {
  const { best, options } = bestBid(cards);
  if (!best) {
    const o = options[0];
    return { maxBid: 0, text: `Eher passen: Kein Spiel ist sicher genug. Am ehesten ginge ${gameName(o.game)} (${o.info}).` };
  }
  const m = computeValue(best.game, cards).matadors;
  const how = best.game.type === 'null' ? 'Null (Grundwert 23)' : `${gameName(best.game)} ${m.mit ? 'mit' : 'ohne'} ${m.count}, spielt ${m.count + 1} → ${m.count + 1} × ${computeValue(best.game, cards).base}`;
  return { maxBid: best.value, game: best.game, text: `Dein bestes Spiel: ${how} = ${best.value}. Du kannst bis ${best.value} reizen (${best.info}).` };
}

export { cardName };
