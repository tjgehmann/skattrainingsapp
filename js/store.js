// Fortschritt & Einstellungen im Browser speichern (localStorage)
const KEY = 'skattrainer.v1';

const defaults = () => ({
  drills: {}, // id -> { total, correct, recent: [bool], best }
  lessons: {}, // id -> true
  games: { played: 0, declared: 0, declaredWon: 0, defended: 0, defendedWon: 0, score: 0, countGuesses: 0, countExact: 0 },
  settings: { assist: 'anfaenger', speed: 'normal' },
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const d = defaults();
    const s = JSON.parse(raw);
    return { ...d, ...s, games: { ...d.games, ...s.games }, settings: { ...d.settings, ...s.settings } };
  } catch {
    return defaults();
  }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* Speicher nicht verfügbar */ }
}

export const store = {
  get: () => state,
  save,
  reset() { state = defaults(); save(); },
  recordDrill(id, ok) {
    const d = (state.drills[id] ||= { total: 0, correct: 0, recent: [], best: 0, streak: 0 });
    d.total++;
    if (ok) d.correct++;
    d.recent = [...d.recent, ok].slice(-10);
    d.streak = ok ? (d.streak || 0) + 1 : 0;
    d.best = Math.max(d.best || 0, d.streak);
    save();
    return d;
  },
  drillStatus(id) {
    const d = state.drills[id];
    if (!d) return { level: 0, pct: 0, total: 0 };
    const ok = d.recent.filter(Boolean).length;
    const mastered = d.recent.length >= 10 && ok >= 8;
    return { level: mastered ? 2 : 1, pct: Math.round((ok / Math.max(d.recent.length, 1)) * 100), total: d.total, recentOk: ok, recentN: d.recent.length, mastered };
  },
  lessonDone(id) { state.lessons[id] = true; save(); },
  setSetting(k, v) { state.settings[k] = v; save(); },
};
