// Übungsspiel: Du gegen zwei Computergegner – mit Reizen, Skat, Stichen und Abrechnung.
import {
  deal, legalCards, trickWinner, sumPoints, sortHand, nextBid, gameName, computeValue, settle, isTrump,
  SUIT_NAMES, SUIT_SYMBOLS, SUITS, cardName, nullValue, trumpSequence,
} from './skat.js';
import { bestBid, chooseDeclaration, chooseCard, bidAdvice } from './ai.js';
import { cardHTML, esc, sleep, toast, inlineCard as ic } from './ui.js';
import { store } from './store.js';

const NAMES = ['Du', 'Links', 'Rechts'];
const ROLE = ['Vorhand', 'Mittelhand', 'Hinterhand'];
let dealer = 1; // wird vor jedem Spiel weitergedreht → im ersten Spiel bist du Vorhand
const session = { results: [], total: 0 };
const ASSISTS = {
  anfaenger: 'Anfänger – alle Hilfen',
  fortgeschritten: 'Fortgeschritten – Tipps auf Knopfdruck',
  profi: 'Profi – ohne Hilfen, mit Mitzähl-Test',
};

export function mountPlay(root) {
  let alive = true;
  const Abort = new Error('abort');
  const guard = () => { if (!alive) throw Abort; };
  const speed = () => ({ langsam: 1.6, normal: 1, schnell: 0.45 }[store.get().settings.speed] || 1);
  const wait = async (ms) => { await sleep(ms * speed()); guard(); };
  const assist = () => store.get().settings.assist;
  let st = null;

  root.innerHTML = `
    <div class="play-top">
      <label>Modus <select id="assist">${Object.entries(ASSISTS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
      <label>Tempo <select id="speed"><option value="langsam">langsam</option><option value="normal">normal</option><option value="schnell">schnell</option></select></label>
      <span class="session-score" id="sessionScore"></span>
    </div>
    <div id="table" class="table"></div>
    <details class="session-log"><summary>Spielliste dieser Sitzung</summary><div id="sessionLog"></div></details>`;
  const selA = root.querySelector('#assist');
  const selS = root.querySelector('#speed');
  selA.value = assist();
  selS.value = store.get().settings.speed;
  selA.onchange = () => { store.setSetting('assist', selA.value); render(); };
  selS.onchange = () => store.setSetting('speed', selS.value);
  const table = root.querySelector('#table');

  // ---------- Rendering ----------
  function roleOf(p) { return ROLE[(p - (st.dealer + 1) + 3) % 3]; }
  function say(p, text) { st.speech[p] = text; render(); }

  function oppHTML(p) {
    const n = st.hands[p].length;
    const open = st.game && st.game.ouvert && st.declarer === p && st.phase === 'play';
    const cards = open
      ? `<div class="cards open-hand">${sortHand(st.hands[p], st.game).map((c) => cardHTML(c, { size: 'xs' })).join('')}</div>`
      : `<div class="backs">${Array.from({ length: n }, () => '<div class="card back xs"></div>').join('')}</div>`;
    const decl = st.declarer === p ? '<span class="badge decl">Alleinspieler</span>' : '';
    const tricks = st.taken[p].length / 3;
    return `<div class="opp opp-${p}">
      <div class="opp-head"><strong>${NAMES[p]}</strong> <span class="badge">${roleOf(p)}</span> ${decl}</div>
      ${cards}
      <div class="opp-foot">${tricks ? `${tricks} Stich${tricks > 1 ? 'e' : ''}` : ''}</div>
      ${st.speech[p] ? `<div class="bubble">${esc(st.speech[p])}</div>` : ''}
    </div>`;
  }

  function infoHTML() {
    const parts = [];
    if (st.game) parts.push(`Spiel: <strong>${gameName(st.game)}</strong>`);
    if (st.bid) parts.push(`Reizwert: <strong>${st.bid}</strong>`);
    if (st.declarer !== null && st.game) parts.push(`Alleinspieler: <strong>${NAMES[st.declarer]}</strong>`);
    if (st.game && st.phase === 'play' && assist() === 'anfaenger') {
      const dp = sumPoints(st.taken[st.declarer]);
      const op = sumPoints([...st.taken[(st.declarer + 1) % 3], ...st.taken[(st.declarer + 2) % 3]]);
      parts.push(`Augen: Alleinspieler <strong>${dp}</strong> · Gegner <strong>${op}</strong>`);
      if (st.game.type !== 'null') {
        const total = st.game.type === 'grand' ? 4 : 11;
        const gone = st.tricks.flat().filter((x) => isTrump(x.card, st.game)).length + st.trick.filter((x) => isTrump(x.card, st.game)).length;
        parts.push(`Trümpfe gespielt: <strong>${gone}/${total}</strong>`);
      }
    }
    return parts.join(' · ') || 'Neues Spiel';
  }

  function trickHTML() {
    const shown = st.trick.length ? st.trick : st.showTrick || [];
    const slots = [1, 2, 0].map((p) => {
      const e = shown.find((x) => x.player === p);
      const win = st.trickWinnerShown === p && st.showTrick ? 'win' : '';
      return `<div class="slot slot-${p} ${win}">${e ? cardHTML(e.card, { size: 'md' }) : ''}</div>`;
    });
    let skat = '';
    if (st.phase === 'bidding' || (st.phase === 'declare' && (!st.skatTaken || st.skatVisible))) {
      skat = `<div class="skat">${st.skatVisible ? st.skat.map((c) => cardHTML(c, { size: 'sm' })).join('') : '<div class="card back sm"></div><div class="card back sm"></div>'}<div class="label">Skat</div></div>`;
    }
    return `<div class="trick">${slots.join('')}${skat}</div>`;
  }

  function handHTML() {
    const hand = sortHand(st.hands[0], st.game);
    const aw = st.awaiting;
    const showLegal = aw && aw.type === 'card' && assist() !== 'profi';
    return `<div class="myhand ${hand.length > 10 ? 'twelve' : ''}">${hand.map((c) => {
      const cls = [];
      if (showLegal && !aw.legal.includes(c)) cls.push('illegal');
      if (showLegal && aw.legal.includes(c)) cls.push('playable');
      if (st.selected.has(c)) cls.push('selected');
      if (st.hintCard === c) cls.push('hint');
      return cardHTML(c, { size: 'lg', cls: cls.join(' ') });
    }).join('')}</div>`;
  }

  function panelHTML() {
    const p = st.panel;
    if (!p) return '';
    return `<div class="panel">
      <div class="panel-text">${p.html}</div>
      ${p.extra || ''}
      <div class="panel-btns">${(p.buttons || []).map((b, i) => `<button class="btn ${b.primary ? 'primary' : ''}" data-btn="${i}" ${b.disabled ? 'disabled' : ''}>${b.label}</button>`).join('')}</div>
    </div>`;
  }

  function render() {
    if (!alive || !st) return;
    const my = st.declarer === 0 ? '<span class="badge decl">Alleinspieler</span>' : '';
    const canHint = assist() !== 'profi' && st.awaiting && st.awaiting.type === 'card';
    table.innerHTML = `
      <div class="info-bar">${infoHTML()}</div>
      <div class="opps">${oppHTML(1)}${oppHTML(2)}</div>
      ${trickHTML()}
      <div class="me-head"><strong>Du</strong> <span class="badge">${roleOf(0)}</span> ${my}
        ${st.speech[0] ? `<span class="bubble inline">${esc(st.speech[0])}</span>` : ''}
        <span class="spacer"></span>
        ${canHint ? '<button class="btn small" data-act="hint">💡 Tipp</button>' : ''}
        ${st.lastTrick && st.phase === 'play' && assist() !== 'profi' ? '<button class="btn small ghost" data-act="last">Letzter Stich</button>' : ''}
      </div>
      ${st.hint ? `<div class="hint-box">${st.hint}</div>` : ''}
      ${panelHTML()}
      ${handHTML()}`;
    root.querySelector('#sessionScore').innerHTML = `Sitzung: <strong>${session.total > 0 ? '+' : ''}${session.total}</strong> Punkte`;
  }

  // ---------- Eingaben ----------
  table.addEventListener('click', (ev) => {
    if (!st) return;
    const btn = ev.target.closest('[data-btn]');
    if (btn && st.panel) {
      const b = st.panel.buttons[Number(btn.dataset.btn)];
      if (b.onClick) { b.onClick(); return; }
      const res = st.panel.res;
      st.panel = null;
      res(b.value);
      return;
    }
    const act = ev.target.closest('[data-act]');
    if (act) {
      if (act.dataset.act === 'hint') {
        const r = chooseCard(ctxFor(0));
        st.hint = `💡 ${ic(r.card)} – ${r.reason}`;
        st.hintCard = r.card;
        render();
      } else if (act.dataset.act === 'last' && st.lastTrick) {
        const t = st.lastTrick;
        toast(`Letzter Stich: ${t.trick.map((x) => `${NAMES[x.player]} ${cardName(x.card)}`).join(', ')} → ${NAMES[t.winner]}`, 4000);
      } else if (act.dataset.act === 'game') {
        Object.assign(st.gameSel, JSON.parse(act.dataset.val));
        refreshGamePanel();
      }
      return;
    }
    const cardEl = ev.target.closest('.myhand [data-card]');
    if (cardEl) {
      const c = cardEl.dataset.card;
      const aw = st.awaiting;
      if (aw && aw.type === 'card') {
        if (!aw.legal.includes(c)) {
          toast('Diese Karte darfst du nicht spielen – du musst bedienen!');
          if (assist() === 'profi') st.mistakes++;
          return;
        }
        st.awaiting = null;
        aw.res(c);
      } else if (aw && aw.type === 'discard') {
        if (st.selected.has(c)) st.selected.delete(c);
        else if (st.selected.size < 2) st.selected.add(c);
        aw.update();
      }
    }
  });
  table.addEventListener('change', (ev) => {
    if (ev.target.matches('[data-opt]')) {
      st.gameSel[ev.target.dataset.opt] = ev.target.checked;
      refreshGamePanel();
    }
  });

  function ask(html, buttons, extra) {
    return new Promise((res) => { st.panel = { html, buttons, extra, res }; render(); });
  }

  // ---------- Spielablauf ----------
  function ctxFor(p) {
    return { player: p, hand: st.hands[p], trick: st.trick, game: st.game, declarer: st.declarer, tricks: st.tricks, skat: p === st.declarer ? st.pushed : null };
  }

  async function bidding() {
    const vh = (st.dealer + 1) % 3, mh = (st.dealer + 2) % 3, hh = st.dealer;
    const maxBids = st.hands.map((h) => bestBid(h).maxBid);
    const adviceText = () => {
      const a = bidAdvice(st.hands[0]);
      return `<div class="advice">💡 ${a.text}</div>`;
    };
    const wantsBid = async (p, v, to) => {
      if (p === 0) {
        const tip = assist() === 'anfaenger' ? adviceText() : '';
        const b = [{ label: `${v} sagen`, value: true, primary: true }, { label: 'Passe', value: false }];
        if (assist() === 'fortgeschritten') b.push({ label: '💡 Tipp', onClick: () => { st.panel.extra = adviceText(); render(); } });
        return ask(`Reizen: Sagst du <strong>${v}</strong> zu ${NAMES[to]}?`, b, tip);
      }
      await wait(650);
      return maxBids[p] >= v;
    };
    const wantsHold = async (p, v, from) => {
      if (p === 0) {
        const tip = assist() === 'anfaenger' ? adviceText() : '';
        const b = [{ label: 'Ja (halten)', value: true, primary: true }, { label: 'Passe', value: false }];
        if (assist() === 'fortgeschritten') b.push({ label: '💡 Tipp', onClick: () => { st.panel.extra = adviceText(); render(); } });
        return ask(`${NAMES[from]} ${from === 0 ? 'sagst' : 'sagt'} <strong>${v}</strong>. Hältst du mit?`, b, tip);
      }
      await wait(650);
      return maxBids[p] >= v;
    };
    const round = async (bidder, listener, start) => {
      let value = start;
      for (;;) {
        const nb = nextBid(value);
        if (!(await wantsBid(bidder, nb, listener))) { say(bidder, 'passe'); return { winner: listener, value }; }
        say(bidder, String(nb));
        if (!(await wantsHold(listener, nb, bidder))) { say(listener, 'passe'); return { winner: bidder, value: nb }; }
        say(listener, 'ja');
        value = nb;
      }
    };
    const r1 = await round(mh, vh, 0);
    await wait(300);
    const r2 = await round(hh, r1.winner, r1.value);
    if (r2.value === 0) {
      const p = r2.winner;
      let plays;
      if (p === 0) plays = await ask('Niemand hat gereizt. Möchtest du für <strong>18</strong> spielen?', [{ label: 'Ja, spielen', value: true, primary: true }, { label: 'Passe (einpassen)', value: false }], assist() === 'anfaenger' ? adviceText() : '');
      else { await wait(600); plays = maxBids[p] >= 18; }
      if (!plays) { say(p, 'passe'); return false; }
      st.declarer = p; st.bid = 18;
    } else {
      st.declarer = r2.winner; st.bid = r2.value;
    }
    return true;
  }

  function gamePanelContent() {
    const s = st.gameSel;
    const isHand = !st.skatTaken;
    const known = isHand ? st.hands[0] : [...st.hands[0], ...st.pushed];
    const types = [...SUITS.map((t) => ({ type: 'suit', trump: t, label: `<span class="s-${t}">${SUIT_SYMBOLS[t]}</span> ${SUIT_NAMES[t]}` })), { type: 'grand', label: 'Grand' }, { type: 'null', label: 'Null' }];
    const btns = types.map((t) => {
      const active = s.type === t.type && (t.type !== 'suit' || s.trump === t.trump);
      return `<button class="btn chip ${active ? 'active' : ''}" data-act="game" data-val='${JSON.stringify({ type: t.type, trump: t.trump || null })}'>${t.label}</button>`;
    }).join('');
    const opts = [];
    if (s.type) {
      opts.push(`<label><input type="checkbox" data-opt="ouvert" ${s.ouvert ? 'checked' : ''} ${s.type !== 'null' && !isHand ? 'disabled' : ''}> Ouvert</label>`);
      if (s.type !== 'null' && isHand) {
        opts.push(`<label><input type="checkbox" data-opt="schneider" ${s.schneider ? 'checked' : ''}> Schneider angesagt</label>`);
        opts.push(`<label><input type="checkbox" data-opt="schwarz" ${s.schwarz ? 'checked' : ''}> Schwarz angesagt</label>`);
      }
    }
    let preview = '';
    let ok = false;
    const g = buildGame();
    if (g) {
      const v = computeValue(g, known);
      ok = true;
      const breakdown = g.type === 'null' ? `fester Wert ${v.value}` : `${v.parts.map((x) => x.label).join(' + ')} = ${v.factor} × ${v.base}`;
      preview = `<div class="preview">Spielwert: <strong>${v.value}</strong> <small>(${breakdown}${isHand && g.type !== 'null' ? ', Skat unbekannt' : ''})</small></div>`;
      if (v.value < st.bid) {
        if (g.type === 'null') { ok = false; preview += `<div class="warn">Null ist nur ${v.value} wert – du hast bis ${st.bid} gereizt.</div>`; }
        else preview += `<div class="warn">⚠️ Wert unter deinem Reizwert ${st.bid}! Du bist überreizt, außer du erreichst eine höhere Stufe (z. B. Schneider).</div>`;
      }
    }
    return { html: `<div class="game-choice">${btns}</div><div class="game-opts">${opts.join('')}</div>${preview}`, ok };
  }

  function buildGame() {
    const s = st.gameSel;
    if (!s.type) return null;
    const hand = !st.skatTaken;
    const g = { type: s.type, hand };
    if (s.type === 'suit') g.trump = s.trump;
    if (s.type === 'null') g.ouvert = !!s.ouvert;
    else if (hand) {
      g.ouvert = !!s.ouvert;
      g.schwarzAnnounced = !!(s.schwarz || s.ouvert);
      g.schneiderAnnounced = !!(s.schneider || g.schwarzAnnounced);
    }
    return g;
  }

  function refreshGamePanel() {
    if (!st.panel || !st.panel.isGame) return;
    const c = gamePanelContent();
    st.panel.extra = c.html;
    st.panel.buttons[0].disabled = !c.ok;
    render();
  }

  async function declare() {
    const d = st.declarer;
    st.declHand10 = st.hands[d].slice();
    if (d !== 0) {
      say(d, 'nimmt den Skat');
      await wait(900);
      const r = chooseDeclaration([...st.hands[d], ...st.skat], st.bid);
      st.hands[d] = [...st.hands[d], ...st.skat].filter((c) => !r.skat.includes(c));
      st.pushed = r.skat;
      st.game = r.game;
      st.skatTaken = true;
      say(d, gameName(st.game));
      await ask(`<strong>${NAMES[d]}</strong> spielt <strong>${gameName(st.game)}</strong> (gereizt bis ${st.bid}). Du bist Gegenspieler zusammen mit ${NAMES[3 - d]}.`, [{ label: 'Los geht’s', value: 1, primary: true }]);
      return;
    }
    // Du bist Alleinspieler
    let tip = '';
    if (assist() !== 'profi') {
      const a = bidAdvice(st.hands[0]);
      tip = `<div class="advice">💡 Meist nimmt man den Skat auf. Handspiel lohnt sich bei sehr starken Karten (bringt eine Stufe mehr). ${a.text}</div>`;
    }
    const choice = await ask(`Du bist Alleinspieler bei <strong>${st.bid}</strong>. Nimmst du den Skat auf?`, [{ label: 'Skat aufnehmen', value: 'skat', primary: true }, { label: 'Hand spielen', value: 'hand' }], tip);
    if (choice === 'skat') {
      st.skatTaken = true;
      st.skatVisible = true;
      render();
      await wait(700);
      st.hands[0] = [...st.hands[0], ...st.skat];
      st.skatVisible = false;
      st.phase = 'discard';
      st.selected = new Set();
      await new Promise((res) => {
        const update = () => {
          const n = st.selected.size;
          let extra = '';
          if (assist() !== 'profi') extra = '<div class="advice">💡 Faustregeln: Farben blank machen, blanke Zehnen drücken, keine Trümpfe und Asse weglegen. Gedrückte Augen zählen für dich.</div>';
          st.panel = {
            html: `Wähle <strong>2 Karten</strong> zum Drücken (${n}/2 gewählt).`,
            extra,
            buttons: [
              { label: 'Drücken', primary: true, disabled: n !== 2, onClick: () => { st.panel = null; st.awaiting = null; res(); } },
              ...(assist() !== 'profi' ? [{ label: '💡 Vorschlag', onClick: () => {
                const r = chooseDeclaration(st.hands[0], st.bid);
                st.selected = new Set(r.skat);
                st.hint = `💡 Vorschlag: ${gameName(r.game)} spielen und ${r.skat.map(ic).join(' ')} drücken.`;
                update();
              } }] : []),
            ],
          };
          render();
        };
        st.awaiting = { type: 'discard', update };
        update();
      });
      st.pushed = [...st.selected];
      st.hands[0] = st.hands[0].filter((c) => !st.selected.has(c));
      st.selected = new Set();
    } else {
      st.pushed = st.skat.slice();
    }
    st.phase = 'declare';
    st.gameSel = { type: null };
    const c = gamePanelContent();
    const game = await new Promise((res) => {
      st.panel = {
        isGame: true,
        html: 'Welches Spiel sagst du an?',
        extra: c.html,
        buttons: [
          { label: 'Spiel ansagen', primary: true, disabled: !c.ok, onClick: () => { const g = buildGame(); st.panel = null; res(g); } },
          ...(assist() !== 'profi' ? [{ label: '💡 Tipp', onClick: () => {
            const known = [...st.hands[0], ...(st.skatTaken ? st.pushed : [])];
            const b = bestBid(st.hands[0]);
            const g = b.best ? b.best.game : null;
            st.hint = g ? `💡 Empfehlung: ${gameName(g)} (${b.best.info}). Wert: ${computeValue({ ...g, hand: !st.skatTaken }, known).value}.` : '💡 Keins deiner Spiele ist wirklich sicher – nimm das Spiel mit den meisten Trümpfen.';
            render();
          } }] : []),
        ],
      };
      render();
    });
    st.game = game;
    st.hint = null;
    say(0, gameName(game));
  }

  async function humanCard() {
    const legal = legalCards(st.hands[0], st.trick.length ? st.trick[0].card : null, st.game);
    return new Promise((res) => { st.awaiting = { type: 'card', legal, res }; render(); });
  }

  async function playTricks() {
    st.phase = 'play';
    st.speech = ['', '', ''];
    let leader = (st.dealer + 1) % 3;
    for (let t = 0; t < 10; t++) {
      st.trick = [];
      for (let i = 0; i < 3; i++) {
        const p = (leader + i) % 3;
        let card;
        if (p === 0) {
          card = await humanCard();
          guard();
          st.hint = null; st.hintCard = null;
        } else {
          await wait(i === 0 && t > 0 ? 500 : 750);
          card = chooseCard(ctxFor(p)).card;
        }
        st.hands[p] = st.hands[p].filter((c) => c !== card);
        st.trick.push({ player: p, card });
        st.showTrick = null;
        render();
      }
      const w = st.trick[trickWinner(st.trick.map((x) => x.card), st.game)].player;
      st.showTrick = st.trick;
      st.trickWinnerShown = w;
      const done = st.trick;
      st.trick = [];
      render();
      await wait(1300);
      st.taken[w].push(...done.map((x) => x.card));
      st.tricks.push(done);
      st.lastTrick = { trick: done, winner: w };
      st.showTrick = null;
      leader = w;
      render();
      if (st.game.type === 'null' && w === st.declarer) break;
      if (st.game.type !== 'null' && st.game.schwarzAnnounced && w !== st.declarer) break;
    }
  }

  async function finish() {
    const d = st.declarer;
    const declPts = sumPoints(st.taken[d]) + sumPoints(st.pushed);
    const declTricks = st.taken[d].length / 3;
    const r = settle({ game: st.game, declarerCards: [...st.declHand10, ...st.skat], declarerPoints: declPts, declarerTricks: declTricks, bid: st.bid });
    st.phase = 'end';
    // Profi: Mitzähl-Test
    let countLine = '';
    if (assist() === 'profi' && st.game.type !== 'null' && st.tricks.length === 10) {
      const myParty = d === 0;
      const truth = myParty ? declPts : 120 - declPts;
      const guess = await new Promise((res) => {
        st.panel = {
          html: `Mitzähl-Test: Wie viele Augen hat ${myParty ? 'deine Partei (inkl. Skat)' : 'eure Gegenspieler-Partei'}?`,
          extra: '<input id="countGuess" class="num" type="number" inputmode="numeric" min="0" max="120">',
          buttons: [{ label: 'Antworten', primary: true, onClick: () => { const v = Number(table.querySelector('#countGuess').value); st.panel = null; res(v); } }],
        };
        render();
        setTimeout(() => { const i = table.querySelector('#countGuess'); if (i) i.focus(); }, 50);
      });
      const g = store.get().games;
      g.countGuesses++;
      const diff = Math.abs(guess - truth);
      if (diff === 0) g.countExact++;
      countLine = `<div class="${diff === 0 ? 'good' : diff <= 5 ? 'ok' : 'bad'}">Mitzählen: Du hast ${guess} gesagt, richtig sind <strong>${truth}</strong>. ${diff === 0 ? 'Perfekt! 🎯' : diff <= 5 ? 'Knapp daneben.' : 'Da geht noch was.'}</div>`;
    }

    // Statistik
    const g = store.get().games;
    g.played++;
    const myScore = d === 0 ? r.score : 0;
    if (d === 0) { g.declared++; if (r.won) g.declaredWon++; g.score += r.score; }
    else { g.defended++; if (!r.won) g.defendedWon++; }
    store.save();
    session.total += myScore;
    session.results.push({ game: gameName(st.game), decl: NAMES[d], won: r.won, score: r.score });
    renderSession();

    const iWon = d === 0 ? r.won : !r.won;
    const calc = st.game.type === 'null'
      ? `Null-Spiel, fester Wert ${r.calc.value}`
      : `${r.calc.parts.map((p) => p.label).join(' + ')} = ${r.calc.factor} × ${r.calc.base} = ${r.calc.value}`;
    const skatLine = `Skat: ${st.skat.map(ic).join(' ')}${st.skatTaken && d === 0 ? ` · gedrückt: ${st.pushed.map(ic).join(' ')}` : st.skatTaken ? ` · ${NAMES[d]} hat gedrückt: ${st.pushed.map(ic).join(' ')}` : ' (Hand gespielt)'}`;
    const review = st.tricks.map((t, i) => {
      const w = t[trickWinner(t.map((x) => x.card), st.game)].player;
      return `<li><span class="muted">${i + 1}.</span> ${t.map((x) => `<span class="${x.player === w ? 'tw' : ''}">${NAMES[x.player]} ${ic(x.card)}</span>`).join(' · ')} → <strong>${NAMES[w]}</strong> (${sumPoints(t.map((x) => x.card))})</li>`;
    }).join('');
    const html = `
      <div class="result ${iWon ? 'won' : 'lost'}">
        <h3>${iWon ? '🎉 Gewonnen!' : '😕 Verloren'}</h3>
        <p>${d === 0 ? 'Du' : NAMES[d]} ${d === 0 ? 'hast' : 'hat'} <strong>${gameName(st.game)}</strong> ${r.won ? 'gewonnen' : 'verloren'}. ${r.reason}</p>
        ${st.game.type !== 'null' ? `<p>Augen: Alleinspieler <strong>${declPts}</strong> · Gegenspieler <strong>${120 - declPts}</strong>${r.schneider ? ' · <strong>Schneider</strong>' : ''}${r.schwarz ? ' · <strong>Schwarz</strong>' : ''}</p>` : ''}
        <p>Spielwert: ${calc}${r.overbid ? ` → überreizt, gewertet mit ${r.value}` : ''}</p>
        <p>Wertung für ${NAMES[d]}: <strong>${r.score > 0 ? '+' : ''}${r.score}</strong>${!r.won ? ' (verlorene Spiele zählen doppelt)' : ''}</p>
        <p class="muted">${skatLine}</p>
        ${countLine}
        <details><summary>Alle Stiche ansehen</summary><ol class="review">${review}</ol></details>
      </div>`;
    await ask(html, [{ label: 'Nächstes Spiel', value: 1, primary: true }]);
  }

  function renderSession() {
    const el = root.querySelector('#sessionLog');
    if (!el) return;
    el.innerHTML = session.results.length
      ? `<table class="tbl"><tr><th>#</th><th>Spiel</th><th>Alleinspieler</th><th>Ergebnis</th><th>Wert</th></tr>${session.results.map((r, i) => `<tr><td>${i + 1}</td><td>${r.game}</td><td>${r.decl}</td><td>${r.won ? 'gewonnen' : 'verloren'}</td><td>${r.score > 0 ? '+' : ''}${r.score}</td></tr>`).join('')}</table>`
      : '<p class="muted">Noch keine Spiele.</p>';
  }

  async function playOne() {
    dealer = (dealer + 1) % 3;
    const { hands, skat } = deal();
    st = {
      phase: 'bidding', hands, skat, dealer, bid: 0, declarer: null, game: null, trick: [], tricks: [], taken: [[], [], []],
      speech: ['', '', ''], selected: new Set(), panel: null, awaiting: null, hint: null, hintCard: null, lastTrick: null,
      pushed: [], skatTaken: false, skatVisible: false, mistakes: 0, showTrick: null, gameSel: { type: null },
    };
    render();
    const vh = (dealer + 1) % 3, mh = (dealer + 2) % 3;
    await ask(`Neues Spiel. ${NAMES[dealer]} ${dealer === 0 ? 'gibst' : 'gibt'}. <strong>${NAMES[vh]}</strong> ${vh === 0 ? 'bist' : 'ist'} Vorhand und spielt zuerst aus. ${mh === 0 ? 'Du reizt' : `${NAMES[mh]} reizt`} zuerst (Mittelhand sagt Vorhand).`, [{ label: 'Reizen beginnen', value: 1, primary: true }],
      assist() === 'anfaenger' ? '<div class="advice">💡 Schau dir deine Karten an: Wie viele Buben hast du? Welche Farbe ist deine längste?</div>' : '');
    const ok = await bidding();
    if (!ok) {
      await ask('Alle haben gepasst – das Spiel ist <strong>eingepasst</strong>. Die Karten werden neu gegeben.', [{ label: 'Neu geben', value: 1, primary: true }]);
      return;
    }
    st.speech = ['', '', ''];
    st.phase = 'declare';
    await declare();
    await playTricks();
    await finish();
  }

  (async () => {
    renderSession();
    try {
      while (alive) await playOne();
    } catch (e) {
      if (e !== Abort) { console.error(e); table.innerHTML = `<p class="bad">Fehler: ${esc(e.message)}</p>`; }
    }
  })();

  return () => { alive = false; };
}

export { nullValue, trumpSequence };
