import { LEVELS, LESSONS } from './lessons.js';
import { DRILLS } from './drills.js';
import { mountPlay } from './play.js';
import { store } from './store.js';
import { cardHTML, cardsHTML, esc, inlineCard as ic, suitInline as si } from './ui.js';
import { BID_VALUES } from './skat.js';

const view = document.getElementById('view');
let cleanup = null;

// ---------- Hilfen ----------
function levelOfLesson(id) { return LEVELS.find((l) => l.lessons.includes(id)); }
function levelOfDrill(id) { return LEVELS.find((l) => l.drills.includes(id)); }

function levelProgress(level) {
  const s = store.get();
  const items = level.lessons.length + level.drills.length;
  let done = level.lessons.filter((id) => s.lessons[id]).length;
  done += level.drills.filter((id) => store.drillStatus(id).mastered).length;
  return { done, items, pct: Math.round((done / items) * 100) };
}

function nextStep() {
  const s = store.get();
  for (const l of LEVELS) {
    for (const id of l.lessons) if (!s.lessons[id]) return { href: `#/lektion/${id}`, label: LESSONS[id].title, level: l };
    for (const id of l.drills) if (!store.drillStatus(id).mastered) return { href: `#/uebung/${id}`, label: DRILLS[id].title, level: l };
  }
  return { href: '#/spiel', label: 'Übungsspiel im Profi-Modus', level: LEVELS[LEVELS.length - 1] };
}

function sequenceAfter(kind, id) {
  const list = [];
  for (const l of LEVELS) {
    l.lessons.forEach((x) => list.push(`#/lektion/${x}`));
    l.drills.forEach((x) => list.push(`#/uebung/${x}`));
  }
  const i = list.indexOf(`#/${kind}/${id}`);
  return list[i + 1] || '#/spiel';
}

// ---------- Startseite ----------
function renderHome() {
  const ns = nextStep();
  const g = store.get().games;
  const total = LEVELS.reduce((a, l) => a + levelProgress(l).done, 0);
  const all = LEVELS.reduce((a, l) => a + levelProgress(l).items, 0);
  view.innerHTML = `
    <section class="hero">
      <div class="hero-cards">${['CJ', 'SA', 'H10'].map((c) => cardHTML(c, { size: 'lg' })).join('')}</div>
      <div>
        <h1>Skat lernen – vom Anfänger zum Profi</h1>
        <p>Kurze Lektionen, gezielte Übungen und Übungsspiele gegen zwei Computergegner mit Tipps und Erklärungen.</p>
        <div class="hero-btns">
          <a class="btn primary big" href="${ns.href}">▶ Weiter: ${esc(ns.label)}</a>
          <a class="btn big" href="#/spiel">🃏 Übungsspiel</a>
        </div>
        <div class="progress-line"><div class="bar"><span style="width:${Math.round((total / all) * 100)}%"></span></div><small>${total} von ${all} Lernschritten · ${g.played} Spiele gespielt</small></div>
      </div>
    </section>
    <section class="levels">
      ${LEVELS.map((l) => {
        const p = levelProgress(l);
        return `<article class="level ${p.done === p.items ? 'complete' : ''}">
          <header>
            <div class="lvl-num">${l.id}</div>
            <div><h2>${l.title}</h2><p class="muted">${l.subtitle}</p></div>
            <div class="lvl-pct">${p.pct}%</div>
          </header>
          <div class="bar"><span style="width:${p.pct}%"></span></div>
          <ul class="items">
            ${l.lessons.map((id) => `<li><a href="#/lektion/${id}"><span class="ico">${store.get().lessons[id] ? '✅' : '📖'}</span>${LESSONS[id].title}</a></li>`).join('')}
            ${l.drills.map((id) => {
              const st = store.drillStatus(id);
              const badge = st.mastered ? '<span class="pill good">gemeistert</span>' : st.total ? `<span class="pill">${st.recentOk}/${st.recentN}</span>` : '';
              return `<li><a href="#/uebung/${id}"><span class="ico">${st.mastered ? '🏆' : '🎯'}</span>${DRILLS[id].title} ${badge}</a></li>`;
            }).join('')}
            <li><a href="#/spiel?modus=${l.play}"><span class="ico">🃏</span>Übungsspiel (${{ anfaenger: 'Anfänger', fortgeschritten: 'Fortgeschritten', profi: 'Profi' }[l.play]}-Modus)</a></li>
          </ul>
        </article>`;
      }).join('')}
    </section>
    <p class="muted center">Eine Übung gilt als gemeistert, wenn du 8 der letzten 10 Aufgaben richtig gelöst hast.</p>`;
}

// ---------- Lektion ----------
function renderLesson(id) {
  const L = LESSONS[id];
  if (!L) return renderNotFound();
  const lvl = levelOfLesson(id);
  const next = sequenceAfter('lektion', id);
  view.innerHTML = `
    <nav class="crumbs"><a href="#/">Lernpfad</a> › Stufe ${lvl.id}: ${lvl.title}</nav>
    <article class="lesson">
      <h1>${L.title}</h1>
      ${L.body()}
      <div class="lesson-foot">
        <a class="btn primary" id="doneBtn" href="${next}">Verstanden – weiter ›</a>
        <a class="btn ghost" href="#/">Zur Übersicht</a>
      </div>
    </article>`;
  view.querySelector('#doneBtn').addEventListener('click', () => store.lessonDone(id));
}

// ---------- Übung ----------
function mountDrill(id) {
  const drill = DRILLS[id];
  if (!drill) return renderNotFound();
  const lvl = levelOfDrill(id);
  let q, answered, result, sel, step, lastAnswer;

  function next() {
    q = drill.make();
    answered = false; result = null; sel = new Set(); lastAnswer = null;
    step = q.steps ? 0 : -1;
    render();
  }

  function submit(ans) {
    if (answered) return;
    answered = true;
    lastAnswer = ans;
    result = q.check(ans);
    store.recordDrill(id, result.ok);
    render();
  }

  function statusHTML() {
    const st = store.drillStatus(id);
    const d = store.get().drills[id];
    const streak = d ? d.streak : 0;
    const dots = (d ? d.recent : []).map((ok) => `<span class="dot ${ok ? 'ok' : 'no'}"></span>`).join('');
    return `<div class="drill-status"><span>Serie: <strong>${streak}</strong>${streak >= 5 ? ' 🔥' : ''}</span><span class="dots" title="letzte 10">${dots}</span>${st.mastered ? '<span class="pill good">gemeistert</span>' : ''}</div>`;
  }

  function cardState(c) {
    const cls = [];
    if (sel.has(c)) cls.push('selected');
    if (answered && result.correct) {
      if (result.correct.includes(c)) cls.push('correct');
      else if (sel.has(c) || lastAnswer === c) cls.push('wrong');
    }
    return cls.join(' ');
  }

  function inputHTML() {
    if (step >= 0 && step < q.steps.length) {
      return `${q.steps[step]}<div class="actions"><button class="btn primary" data-a="step">${step < q.steps.length - 1 ? 'Nächster Stich ›' : 'Zur Frage ›'}</button></div>`;
    }
    const qline = q.question ? `<p class="question">${q.question}</p>` : '';
    switch (q.kind) {
      case 'number':
        return `${qline}<form class="numform" data-a="num"><input class="num" type="number" inputmode="numeric" ${answered ? 'disabled' : ''} value="${answered ? esc(lastAnswer) : ''}" autocomplete="off"><button class="btn primary" ${answered ? 'disabled' : ''}>Prüfen</button></form>`;
      case 'choice':
        return `${qline}<div class="choices">${q.options.map((o, i) => {
          let cls = '';
          if (answered) {
            if (result.correct && result.correct.includes(o.value)) cls = 'correct';
            else if (o.value === lastAnswer) cls = result.ok ? 'correct' : 'wrong';
          }
          return `<button class="btn choice ${cls}" data-choice="${i}" ${answered ? 'disabled' : ''}>${o.label}</button>`;
        }).join('')}</div>`;
      case 'pick':
        return `<div class="cards pickable ${q.ordered ? 'ordered' : ''}">${q.cards.map((c, i) => `<div class="pick-wrap">${q.ordered ? `<span class="order">${i + 1}.</span>` : ''}${cardHTML(c, { size: 'lg', cls: cardState(c) })}</div>`).join('')}</div>`;
      case 'multi':
      case 'pick2':
        return `<div class="cards pickable">${q.cards.map((c) => cardHTML(c, { size: 'md', cls: cardState(c) })).join('')}</div>
          <div class="actions"><button class="btn primary" data-a="submitSel" ${answered || (q.kind === 'pick2' && sel.size !== 2) ? 'disabled' : ''}>${q.kind === 'pick2' ? `Drücken (${sel.size}/2)` : 'Prüfen'}</button></div>`;
      default: return '';
    }
  }

  function render() {
    const showPrompt = !(q.steps && step >= 0 && step < q.steps.length && q.hidePromptDuringSteps);
    view.innerHTML = `
      <nav class="crumbs"><a href="#/">Lernpfad</a> › Stufe ${lvl.id}: ${lvl.title}</nav>
      <div class="drill">
        <header class="drill-head"><h1>${drill.title}</h1>${statusHTML()}</header>
        <p class="muted">${drill.intro}</p>
        <div class="qbox">
          ${showPrompt ? q.prompt : ''}
          ${inputHTML()}
        </div>
        ${answered ? `<div class="feedback ${result.ok ? 'ok' : 'no'}"><strong>${result.ok ? '✔ Richtig!' : '✘ Leider falsch.'}</strong> ${result.explanation}</div>
          <div class="actions"><button class="btn primary" data-a="next" id="nextBtn">Nächste Aufgabe ›</button>
          ${store.drillStatus(id).mastered ? `<a class="btn ghost" href="${sequenceAfter('uebung', id)}">Weiter im Lernpfad ›</a>` : ''}</div>` : ''}
      </div>`;
    const inp = view.querySelector('input.num:not([disabled])');
    if (inp) inp.focus();
    const nb = view.querySelector('#nextBtn');
    if (nb) nb.focus();
  }

  const onClick = (ev) => {
    const a = ev.target.closest('[data-a]');
    if (a && a.tagName === 'BUTTON') {
      const act = a.dataset.a;
      if (act === 'next') return next();
      if (act === 'step') { step++; if (step >= q.steps.length) step = q.steps.length; return render(); }
      if (act === 'submitSel') return submit([...sel]);
    }
    const ch = ev.target.closest('[data-choice]');
    if (ch) return submit(q.options[Number(ch.dataset.choice)].value);
    const card = ev.target.closest('.pickable [data-card]');
    if (card && !answered) {
      const c = card.dataset.card;
      if (q.kind === 'pick') return submit(c);
      if (sel.has(c)) sel.delete(c);
      else if (q.kind !== 'pick2' || sel.size < 2) sel.add(c);
      render();
    }
  };
  const onSubmit = (ev) => {
    if (ev.target.matches('[data-a="num"]')) {
      ev.preventDefault();
      const v = ev.target.querySelector('input').value.trim();
      if (v === '') return;
      submit(v);
    }
  };
  view.addEventListener('click', onClick);
  view.addEventListener('submit', onSubmit);
  next();
  return () => { view.removeEventListener('click', onClick); view.removeEventListener('submit', onSubmit); };
}

// ---------- Fortschritt ----------
function renderProgress() {
  const s = store.get();
  const g = s.games;
  const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '–');
  view.innerHTML = `
    <h1>Dein Fortschritt</h1>
    <div class="stats">
      <div class="stat"><div class="big">${g.played}</div><div>Spiele</div></div>
      <div class="stat"><div class="big">${pct(g.declaredWon, g.declared)}</div><div>als Alleinspieler gewonnen (${g.declaredWon}/${g.declared})</div></div>
      <div class="stat"><div class="big">${pct(g.defendedWon, g.defended)}</div><div>als Gegenspieler gewonnen (${g.defendedWon}/${g.defended})</div></div>
      <div class="stat"><div class="big">${g.score > 0 ? '+' : ''}${g.score}</div><div>Punkte als Alleinspieler</div></div>
      <div class="stat"><div class="big">${pct(g.countExact, g.countGuesses)}</div><div>Mitzähl-Tests exakt (${g.countExact}/${g.countGuesses})</div></div>
    </div>
    <h2>Übungen</h2>
    <table class="tbl wide">
      <tr><th>Stufe</th><th>Übung</th><th>Aufgaben</th><th>Gesamt richtig</th><th>Letzte 10</th><th>Beste Serie</th></tr>
      ${LEVELS.flatMap((l) => l.drills.map((id) => {
        const d = s.drills[id];
        const st = store.drillStatus(id);
        return `<tr><td>${l.id}</td><td><a href="#/uebung/${id}">${DRILLS[id].title}</a></td><td>${d ? d.total : 0}</td><td>${d ? pct(d.correct, d.total) : '–'}</td><td>${d ? `${st.recentOk}/${st.recentN}` : '–'} ${st.mastered ? '🏆' : ''}</td><td>${d ? d.best : 0}</td></tr>`;
      })).join('')}
    </table>
    <p><button class="btn danger" id="resetBtn">Fortschritt zurücksetzen</button></p>
    <p class="muted">Dein Fortschritt wird nur in diesem Browser gespeichert.</p>`;
  view.querySelector('#resetBtn').onclick = () => {
    if (confirm('Wirklich den gesamten Fortschritt löschen?')) { store.reset(); renderProgress(); }
  };
}

// ---------- Regeln kompakt ----------
function renderRules() {
  view.innerHTML = `
    <h1>Regeln zum Nachschlagen</h1>
    <div class="rules-grid">
      <section class="rule-card"><h2>Augen</h2>
        <table class="tbl"><tr><td>Ass</td><td>11</td></tr><tr><td>Zehn</td><td>10</td></tr><tr><td>König</td><td>4</td></tr><tr><td>Dame</td><td>3</td></tr><tr><td>Bube</td><td>2</td></tr><tr><td>9 · 8 · 7</td><td>0</td></tr><tr><th>Gesamt</th><th>120</th></tr></table>
        <p>Gewonnen ab <strong>61</strong> Augen. Schneider: ≤ 30 Augen. Schwarz: kein Stich.</p>
      </section>
      <section class="rule-card"><h2>Trumpf im Farbspiel (z. B. Herz)</h2>
        ${cardsHTML(['CJ', 'SJ', 'HJ', 'DJ', 'HA', 'H10', 'HK', 'HQ', 'H9', 'H8', 'H7'], { size: 'xs' })}
        <p>Fehlfarben: Ass, 10, König, Dame, 9, 8, 7.</p>
        <h3>Grand</h3><p>Nur die 4 Buben sind Trumpf.</p>
        <h3>Null</h3><p>Kein Trumpf. Ass, König, Dame, Bube, 10, 9, 8, 7.</p>
      </section>
      <section class="rule-card"><h2>Grundwerte</h2>
        <table class="tbl"><tr><td>${si('D', 'Karo')}</td><td>9</td></tr><tr><td>${si('H', 'Herz')}</td><td>10</td></tr><tr><td>${si('S', 'Pik')}</td><td>11</td></tr><tr><td>${si('C', 'Kreuz')}</td><td>12</td></tr><tr><td>Grand</td><td>24</td></tr>
        <tr><td>Null</td><td>23</td></tr><tr><td>Null Hand</td><td>35</td></tr><tr><td>Null ouvert</td><td>46</td></tr><tr><td>Null ouvert Hand</td><td>59</td></tr></table>
      </section>
      <section class="rule-card"><h2>Spielwert</h2>
        <p class="formula">Grundwert × (Spitzen + 1 + Extras)</p>
        <p>Extras: Hand · Schneider · Schneider angesagt · Schwarz · Schwarz angesagt · Ouvert (je +1)</p>
        <p>Verloren: <strong>−2 ×</strong> Spielwert. Überreizt: verloren, Wert = nächstes Vielfaches des Grundwerts ≥ Reizwert.</p>
      </section>
      <section class="rule-card wide"><h2>Reizwerte</h2>
        <p class="bidlist">${BID_VALUES.filter((v) => v <= 120).join(' · ')} …</p>
        <p>Reihenfolge: Mittelhand sagt Vorhand, dann sagt Hinterhand dem Gewinner.</p>
      </section>
      <section class="rule-card"><h2>Bedienen</h2>
        <p>Angespielte Farbe muss bedient werden. Buben gehören (außer im Null) zum Trumpf, nicht zu ihrer Farbe. Wer nicht bedienen kann, darf stechen oder abwerfen.</p>
        <p>Beispiel Kreuz-Spiel: auf ${ic('SA')} musst du Pik legen – ${ic('SJ')} ist Trumpf.</p>
      </section>
    </div>`;
}

function renderNotFound() {
  view.innerHTML = '<p>Seite nicht gefunden. <a href="#/">Zur Startseite</a></p>';
}

// ---------- Router ----------
function route() {
  if (cleanup) { cleanup(); cleanup = null; }
  const hash = location.hash || '#/';
  const [path, query] = hash.slice(1).split('?');
  const parts = path.split('/').filter(Boolean);
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#/${parts[0] || ''}`));
  view.className = '';
  window.scrollTo(0, 0);
  if (!parts.length) return renderHome();
  switch (parts[0]) {
    case 'lektion': return renderLesson(parts[1]);
    case 'uebung': cleanup = mountDrill(parts[1]); return;
    case 'spiel': {
      const m = new URLSearchParams(query || '').get('modus');
      if (m) store.setSetting('assist', m);
      view.className = 'wide';
      cleanup = mountPlay(view);
      return;
    }
    case 'fortschritt': return renderProgress();
    case 'regeln': return renderRules();
    default: return renderNotFound();
  }
}

window.addEventListener('hashchange', route);
route();
