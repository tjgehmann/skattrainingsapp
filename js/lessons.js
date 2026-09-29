import { cardsHTML, inlineCard as ic, suitInline as si } from './ui.js';

export const LEVELS = [
  {
    id: 1, title: 'Einsteiger', subtitle: 'Karten, Augen und das Ziel des Spiels',
    lessons: ['karten', 'ablauf'], drills: ['augen'], play: 'anfaenger',
  },
  {
    id: 2, title: 'Trumpf & Stiche', subtitle: 'Welche Karte sticht? Wann muss ich bedienen?',
    lessons: ['trumpf', 'bedienen'], drills: ['hoechste', 'bedienen', 'stich'], play: 'anfaenger',
  },
  {
    id: 3, title: 'Spielwert & Reizen', subtitle: 'Spitzen, Grundwerte und die Reizfolge',
    lessons: ['spielwert', 'reizen'], drills: ['spitzen', 'spielwert', 'reizfolge', 'reizwert'], play: 'fortgeschritten',
  },
  {
    id: 4, title: 'Spielarten & Taktik', subtitle: 'Grand, Null, Hand – und wie man klug spielt',
    lessons: ['spielarten', 'handbewertung', 'druecken', 'taktik'], drills: ['spielwahl', 'druecken', 'abrechnung'], play: 'fortgeschritten',
  },
  {
    id: 5, title: 'Profi', subtitle: 'Mitzählen, Trümpfe verfolgen, fehlerfrei abrechnen',
    lessons: ['mitzaehlen', 'profi'], drills: ['mitzaehlen', 'trumpfzaehlen'], play: 'profi',
  },
];

export const LESSONS = {
  karten: {
    title: 'Die Karten und ihre Augen',
    body: () => `
      <p>Skat wird zu dritt mit <strong>32 Karten</strong> gespielt. Es gibt vier Farben – hier im Turnierbild mit vier Farben, damit man sie gut unterscheiden kann:</p>
      <ul class="suits-list">
        <li>${si('C', 'Kreuz')} – die höchste Farbe</li>
        <li>${si('S', 'Pik')}</li>
        <li>${si('H', 'Herz')}</li>
        <li>${si('D', 'Karo')} – die niedrigste Farbe</li>
      </ul>
      <p>Jede Farbe hat acht Karten: <strong>7, 8, 9, 10, Bube, Dame, König, Ass</strong>. Auf den Karten steht B für Bube und D für Dame.</p>
      ${cardsHTML(['HA', 'H10', 'HK', 'HQ', 'HJ', 'H9', 'H8', 'H7'], { size: 'sm' })}
      <h3>Augen (Punkte)</h3>
      <table class="tbl">
        <tr><th>Karte</th><th>Augen</th></tr>
        <tr><td>Ass</td><td><strong>11</strong></td></tr>
        <tr><td>Zehn</td><td><strong>10</strong></td></tr>
        <tr><td>König</td><td>4</td></tr>
        <tr><td>Dame</td><td>3</td></tr>
        <tr><td>Bube</td><td>2</td></tr>
        <tr><td>9, 8, 7</td><td>0</td></tr>
      </table>
      <p>Pro Farbe sind das 30 Augen, im ganzen Spiel also <strong>120 Augen</strong>.</p>
      <div class="tip"><strong>Merkhilfe:</strong> „Ass-Zehn“ sind die dicken Brocken (21 Augen zusammen). Die „Luschen“ 7, 8, 9 zählen nichts.</div>
      <p>Die Zehn ist im Skat übrigens eine <strong>hohe</strong> Karte: Sie steht direkt unter dem Ass und über dem König!</p>`,
  },
  ablauf: {
    title: 'Spielablauf und Ziel',
    body: () => `
      <p>Jeder Spieler bekommt <strong>10 Karten</strong>, zwei Karten liegen verdeckt als <strong>Skat</strong> in der Mitte.</p>
      <ol>
        <li><strong>Reizen:</strong> Die Spieler bieten, wer das Spiel machen darf. Wer am höchsten reizt, wird <em>Alleinspieler</em>.</li>
        <li><strong>Skat:</strong> Der Alleinspieler darf den Skat aufnehmen und dann zwei beliebige Karten wieder ablegen („drücken“). Er kann auch „Hand“ spielen – ohne den Skat anzusehen.</li>
        <li><strong>Ansagen:</strong> Er bestimmt das Spiel: eine Trumpffarbe, Grand (nur Buben sind Trumpf) oder Null (er darf keinen Stich machen).</li>
        <li><strong>Stiche spielen:</strong> 10 Stiche lang legt jeder reihum eine Karte. Die höchste Karte gewinnt den Stich.</li>
      </ol>
      <h3>Das Ziel</h3>
      <p>Der Alleinspieler spielt gegen die beiden anderen, die zusammenhalten. Er braucht <strong>mindestens 61 Augen</strong> (Stiche + gedrückter Skat) zum Gewinnen. Bei 60 zu 60 verliert er!</p>
      <ul>
        <li><strong>Schneider:</strong> Eine Partei hat 30 Augen oder weniger.</li>
        <li><strong>Schwarz:</strong> Eine Partei bekommt gar keinen Stich.</li>
      </ul>
      <h3>Die Sitzordnung</h3>
      <p><strong>Vorhand</strong> sitzt links vom Geber und spielt zum ersten Stich aus. Dann folgen <strong>Mittelhand</strong> und <strong>Hinterhand</strong> (der Geber).</p>
      <div class="tip">Probier es einfach aus: Das <a href="#/spiel">Übungsspiel</a> zeigt dir im Anfänger-Modus, welche Karten du spielen darfst, und gibt Tipps.</div>`,
  },
  trumpf: {
    title: 'Trumpf und Rangfolge',
    body: () => `
      <p>Trümpfe stechen jede andere Farbe. Im <strong>Farbspiel</strong> (z. B. Herz) sind Trumpf:</p>
      <ol>
        <li>die <strong>vier Buben</strong> – immer die höchsten Trümpfe, in der Reihenfolge ${ic('CJ')} ${ic('SJ')} ${ic('HJ')} ${ic('DJ')}</li>
        <li>danach die Karten der Trumpffarbe: Ass, 10, König, Dame, 9, 8, 7</li>
      </ol>
      <p>Im Herz-Spiel gibt es also 11 Trümpfe, vom höchsten zum niedrigsten:</p>
      ${cardsHTML(['CJ', 'SJ', 'HJ', 'DJ', 'HA', 'H10', 'HK', 'HQ', 'H9', 'H8', 'H7'], { size: 'sm' })}
      <p>In den anderen Farben (Fehlfarben) gilt: Ass, 10, König, Dame, 9, 8, 7 – je 7 Karten, denn der Bube gehört zu den Trümpfen!</p>
      <h3>Grand</h3>
      <p>Im Grand sind <strong>nur die vier Buben</strong> Trumpf. Alle vier Farben sind gleichberechtigte Fehlfarben mit je 7 Karten.</p>
      <h3>Null</h3>
      <p>Im Nullspiel gibt es <strong>keinen Trumpf</strong>. Die Reihenfolge ist die „natürliche“: Ass, König, Dame, Bube, 10, 9, 8, 7. Die Zehn steht hier unter dem Buben!</p>
      ${cardsHTML(['SA', 'SK', 'SQ', 'SJ', 'S10', 'S9', 'S8', 'S7'], { size: 'sm' })}
      <div class="tip"><strong>Wichtigste Regel für Anfänger:</strong> Die Buben gehören im Farb- und Grandspiel <em>nicht</em> zu ihrer Farbe – sie sind Trumpf.</div>`,
  },
  bedienen: {
    title: 'Bedienen und Stiche gewinnen',
    body: () => `
      <p>Wer ausspielt, bestimmt die Farbe des Stichs. Die anderen müssen <strong>bedienen</strong>, also eine Karte derselben Farbe legen – wenn sie eine haben.</p>
      <ul>
        <li>Wird <strong>Trumpf</strong> ausgespielt (z. B. ein Bube!), muss Trumpf bedient werden.</li>
        <li>Wird eine <strong>Fehlfarbe</strong> ausgespielt, muss man diese Farbe bedienen – ein Bube dieser Farbe zählt nicht, er ist Trumpf.</li>
        <li>Kann man nicht bedienen, darf man <strong>beliebig</strong> spielen: stechen (Trumpf legen) oder abwerfen.</li>
      </ul>
      <h3>Wer gewinnt den Stich?</h3>
      <ol>
        <li>Liegt Trumpf im Stich, gewinnt der höchste Trumpf.</li>
        <li>Sonst gewinnt die höchste Karte der ausgespielten Farbe.</li>
        <li>Abgeworfene Karten anderer Farben gewinnen nie.</li>
      </ol>
      <p>Beispiel im Kreuz-Spiel: ${ic('HA')} wird ausgespielt, dann ${ic('H10')}, dann ${ic('C7')}. Die kleine Kreuz-7 ist Trumpf und gewinnt den Stich mit 21 Augen!</p>
      <p>Beispiel: Im Kreuz-Spiel wird ${ic('SA')} ausgespielt. Du hast ${ic('SJ')} und ${ic('S7')}. Du musst die ${ic('S7')} spielen – der Pik-Bube ist Trumpf und zählt nicht als Pik.</p>
      <div class="tip">Wer einen Stich gewinnt, spielt zum nächsten Stich aus.</div>`,
  },
  spielwert: {
    title: 'Der Spielwert',
    body: () => `
      <p>Jedes Spiel hat einen Wert. Er wird so berechnet:</p>
      <p class="formula">Spielwert = Grundwert × Stufen</p>
      <h3>Grundwerte</h3>
      <table class="tbl">
        <tr><td>${si('D', 'Karo')}</td><td>9</td></tr>
        <tr><td>${si('H', 'Herz')}</td><td>10</td></tr>
        <tr><td>${si('S', 'Pik')}</td><td>11</td></tr>
        <tr><td>${si('C', 'Kreuz')}</td><td>12</td></tr>
        <tr><td>Grand</td><td>24</td></tr>
      </table>
      <h3>Spitzen (Matadore)</h3>
      <p>Man zählt, wie viele der höchsten Trümpfe man <strong>lückenlos von oben</strong> hat (Hand + Skat zählen!):</p>
      <ul>
        <li>${ic('CJ')} ${ic('SJ')} aber kein ${ic('HJ')}: <strong>mit 2</strong></li>
        <li>kein ${ic('CJ')}, kein ${ic('SJ')}, aber ${ic('HJ')}: <strong>ohne 2</strong></li>
      </ul>
      <p>„Ohne“ zählt genauso viel wie „mit“ – wer die Buben nicht hat, wird genauso belohnt.</p>
      <h3>Stufen</h3>
      <p>Stufen = Spitzen + 1 („Spiel“) + weitere Gewinnstufen:</p>
      <ul>
        <li>+1 Hand (Skat nicht aufgenommen)</li>
        <li>+1 Schneider (≥ 90 Augen oder Gegner ≤ 30)</li>
        <li>+1 Schneider angesagt (nur bei Hand)</li>
        <li>+1 Schwarz, +1 Schwarz angesagt, +1 Ouvert</li>
      </ul>
      <p><strong>Beispiel:</strong> Pik mit 2, Hand: (2 + 1 + 1) × 11 = <strong>44</strong>.</p>
      <h3>Null-Spiele haben feste Werte</h3>
      <table class="tbl">
        <tr><td>Null</td><td>23</td></tr><tr><td>Null Hand</td><td>35</td></tr>
        <tr><td>Null ouvert</td><td>46</td></tr><tr><td>Null ouvert Hand</td><td>59</td></tr>
      </table>
      <h3>Gewinn und Verlust</h3>
      <p>Gewinnt der Alleinspieler, bekommt er den Spielwert gutgeschrieben. Verliert er, wird ihm der <strong>doppelte</strong> Spielwert abgezogen.</p>`,
  },
  reizen: {
    title: 'Reizen',
    body: () => `
      <p>Beim Reizen bieten die Spieler mit <strong>Spielwerten</strong>. Man darf nur so hoch reizen, wie das eigene Spiel wert ist – sonst ist man <strong>überreizt</strong> und verliert.</p>
      <h3>Die Reizwerte</h3>
      <p class="bidlist">18 · 20 · 22 · 23 · 24 · 27 · 30 · 33 · 35 · 36 · 40 · 44 · 45 · 46 · 48 · 50 · 54 · 55 · 59 · 60 …</p>
      <p>Das sind genau die möglichen Spielwerte: 18 = Karo mit 1 (2 × 9), 20 = Herz mit 1, 22 = Pik mit 1, 23 = Null, 24 = Kreuz mit 1 …</p>
      <h3>Ablauf</h3>
      <ol>
        <li><strong>Mittelhand sagt Vorhand</strong>: Mittelhand nennt Werte („18?“), Vorhand antwortet „ja“ (hält) oder „passe“.</li>
        <li>Der Gewinner dieser Runde wird von <strong>Hinterhand</strong> gereizt – genauso.</li>
        <li>Wer übrig bleibt, ist Alleinspieler. Hat niemand gereizt, darf Vorhand noch für 18 spielen – sonst wird neu gegeben.</li>
      </ol>
      <h3>Wie hoch darf ich reizen?</h3>
      <p>Berechne den Wert deines geplanten Spiels mit deinen Handkarten: <strong>(Spitzen + 1) × Grundwert</strong>.</p>
      <p>Beispiel: Du hast ${ic('CJ')} ${ic('HJ')} und willst Herz spielen: mit 1, spielt 2 → 2 × 10 = <strong>20</strong>. Bei 22 musst du passen.</p>
      <div class="tip"><strong>Vorsicht bei „ohne“:</strong> Liegt ein fehlender Bube im Skat, sinkt dein Spielwert. Ohne 3 kann durch den Skat zu ohne 1 werden!</div>`,
  },
  spielarten: {
    title: 'Grand, Null, Hand & Ouvert',
    body: () => `
      <h3>Grand</h3>
      <p>Nur die Buben sind Trumpf. Grand ist das wertvollste Spiel (Grundwert 24). Gut dafür: mindestens 2 Buben (am besten ${ic('CJ')} oder ${ic('SJ')}), dazu Asse mit Zehnen oder eine lange, hohe Farbe.</p>
      ${cardsHTML(['CJ', 'SJ', 'CA', 'C10', 'CK', 'HA', 'H10', 'SA', 'D8', 'D7'], { size: 'sm' })}
      <p class="caption">Ein sicherer Grand: 2 hohe Buben, 3 Asse, 2 Zehnen.</p>
      <h3>Null</h3>
      <p>Der Alleinspieler darf <strong>keinen einzigen Stich</strong> machen. Man braucht niedrige Karten: In jeder Farbe sollte eine 7 oder eine sichere Folge wie 7-9-Bube vorhanden sein.</p>
      ${cardsHTML(['C7', 'C9', 'S8', 'S7', 'H7', 'H9', 'HJ', 'D7', 'D8', 'D10'], { size: 'sm' })}
      <h3>Hand</h3>
      <p>Wer den Skat nicht aufnimmt, spielt „Hand“ und bekommt eine Stufe mehr. Nur bei Handspielen darf man Schneider oder Schwarz ansagen.</p>
      <h3>Ouvert</h3>
      <p>Der Alleinspieler legt seine Karten offen auf den Tisch. Bei Farb- und Grandspielen ist ouvert nur als Hand möglich und bedeutet automatisch „Schwarz angesagt“ – sehr selten. Null ouvert ist häufiger.</p>`,
  },
  handbewertung: {
    title: 'Welche Hand ist spielbar?',
    body: () => `
      <p>Profis bewerten ihre Hand schnell mit Faustregeln:</p>
      <h3>Farbspiel</h3>
      <ul>
        <li>Mindestens <strong>5 Trümpfe</strong> (Buben mitgezählt), besser 6.</li>
        <li>Möglichst einer der beiden hohen Buben ${ic('CJ')} / ${ic('SJ')}.</li>
        <li><strong>Asse</strong> in den Nebenfarben bringen sichere Stiche; eine Zehn neben dem Ass ist ein weiterer sicherer Stich.</li>
        <li><strong>Blanke Farben</strong> (keine Karte einer Farbe) sind gut: Dort kannst du stechen.</li>
        <li>Faustregel: Trümpfe + Asse ≥ 7 ist ein ordentliches Spiel.</li>
      </ul>
      <h3>Grand</h3>
      <ul><li>2+ Buben, darunter ein hoher, und mindestens 2-3 Asse mit Zehnen – oder eine lange, geschlossene Farbe.</li></ul>
      <h3>Null</h3>
      <ul><li>Jede Farbe muss „sicher“ sein: eine 7, oder 7-9, oder 7-9-Bube … Eine einzelne hohe Karte in einer Farbe ist tödlich.</li></ul>
      <h3>Welche Trumpffarbe?</h3>
      <p>Nimm die Farbe, in der du die meisten Karten hast. Bei Gleichstand die mit den höheren Karten (Ass, Zehn). Der Grundwert ist zweitrangig – Hauptsache, das Spiel geht sicher durch und du kannst hoch genug reizen.</p>
      <div class="tip">Trainiere das mit der Übung <a href="#/uebung/spielwahl">Spielwahl</a>.</div>`,
  },
  druecken: {
    title: 'Skat drücken',
    body: () => `
      <p>Nach dem Aufnehmen des Skats hast du 12 Karten und legst 2 davon ab. Die gedrückten Augen zählen für dich!</p>
      <ol>
        <li><strong>Farben blank machen:</strong> Drücke eine kurze Farbe weg (z. B. zwei einzelne Karten), dann kannst du diese Farbe später stechen.</li>
        <li><strong>Blanke Zehn drücken:</strong> Eine Zehn ohne Ass ist gefährlich – die Gegner holen sie mit dem Ass. Im Skat sind dir die 10 Augen sicher.</li>
        <li><strong>Keine Trümpfe drücken.</strong> Trümpfe sind deine Stärke.</li>
        <li><strong>Asse behalten:</strong> Sie machen sowieso meist einen Stich.</li>
      </ol>
      <p>Beispiel Kreuz-Spiel: Du hast neben deinen Trümpfen ${ic('HA')} ${ic('H9')}, ${ic('S10')} und ${ic('D8')}. Drücke ${ic('S10')} und ${ic('D8')}: Pik und Karo sind blank, 10 Augen sicher.</p>
      <div class="tip">Im Null drückst du die gefährlichsten (höchsten) Karten.</div>`,
  },
  taktik: {
    title: 'Taktik für Allein- und Gegenspieler',
    body: () => `
      <h3>Als Alleinspieler</h3>
      <ul>
        <li><strong>Trumpf ziehen:</strong> Hol den Gegnern früh die Trümpfe weg, damit sie deine Asse und Zehnen nicht stechen können.</li>
        <li><strong>Zähle die Trümpfe:</strong> Im Farbspiel gibt es 11 Trümpfe. Weißt du, wie viele noch draußen sind, weißt du, wann du aufhören kannst.</li>
        <li><strong>Asse abziehen</strong>, sobald die Trümpfe raus sind.</li>
        <li>Ist dir eine Zehn gefährdet, versuche, sie über das Stechen oder den Skat zu retten.</li>
      </ul>
      <h3>Als Gegenspieler</h3>
      <ul>
        <li><strong>Kurzer Weg – lange Farbe:</strong> Sitzt der Alleinspieler direkt hinter dir, spiele deine lange Farbe an.</li>
        <li><strong>Langer Weg – kurze Farbe:</strong> Sitzt er hinten, spiele eine kurze Farbe, damit dein Partner vor ihm reagieren kann.</li>
        <li><strong>Schmieren:</strong> Gewinnt dein Partner den Stich sicher, lege ihm Augen (Ass, Zehn) dazu.</li>
        <li><strong>Partnerfarbe zurückspielen:</strong> Die Farbe, die dein Partner anspielt, spielst du zurück.</li>
        <li><strong>Nicht in die Gabel spielen:</strong> Spiele keine Farbe an, in der der Alleinspieler hinter dir Ass und Zehn halten kann.</li>
        <li>Kein Trumpf-Anspiel als Gegenspieler – außer du willst die Trümpfe des Alleinspielers gezielt verkürzen.</li>
      </ul>
      <div class="tip">Im <a href="#/spiel">Übungsspiel</a> erklärt dir der Tipp-Button zu jeder Karte die passende Regel.</div>`,
  },
  mitzaehlen: {
    title: 'Mitzählen wie ein Profi',
    body: () => `
      <p>Der Unterschied zwischen gutem und sehr gutem Skat: <strong>Mitzählen</strong>. Profis wissen jederzeit</p>
      <ul>
        <li>wie viele <strong>Augen</strong> jede Partei hat,</li>
        <li>wie viele <strong>Trümpfe</strong> noch draußen sind,</li>
        <li>welche <strong>hohen Karten</strong> (Asse, Zehnen) noch fehlen,</li>
        <li>wer in welcher Farbe <strong>blank</strong> ist (nicht bedient hat).</li>
      </ul>
      <h3>So zählst du Augen</h3>
      <p>Zähle nicht Karte für Karte, sondern Stich für Stich – und merke dir nur die Summe deiner Partei. Hilfreich: Ass + Zehn = 21, Ass + König = 15, Zehn + König = 14.</p>
      <p>Sobald du 61 hast, ist dein Spiel gewonnen. Als Gegenspieler reichen 60 Augen, um das Spiel zu schlagen – und 31, um aus dem Schneider zu sein.</p>
      <h3>So zählst du Trümpfe</h3>
      <p>Farbspiel: 11 Trümpfe. Grand: 4. Zieh deine eigenen (und gedrückten) ab, dann zähle jeden fallenden Trumpf der Gegner. Beispiel: Du hast 6 Trümpfe → die Gegner haben 5. Nach zwei Trumpfrunden, in denen beide bedient haben, fehlt noch 1.</p>
      <div class="tip">Die Übungen <a href="#/uebung/mitzaehlen">Augen mitzählen</a> und <a href="#/uebung/trumpfzaehlen">Trümpfe zählen</a> trainieren genau das. Im Profi-Modus des Übungsspiels wirst du am Ende gefragt, wie viele Augen du hattest.</div>`,
  },
  profi: {
    title: 'Profi-Tipps',
    body: () => `
      <ul>
        <li><strong>Reizen mit Plan:</strong> Reize nicht nur dein Spiel, sondern beobachte, bei welchem Wert die anderen aussteigen. Wer bei 20 passt, hat vermutlich kein Kreuz- oder Pik-Spiel.</li>
        <li><strong>Handspiel wagen:</strong> Mit 7+ Trümpfen und Assen bringt Hand eine Stufe mehr – der Skat bringt dir oft weniger, als du denkst.</li>
        <li><strong>Schneider im Blick:</strong> Als Alleinspieler bringt Schneider eine Stufe mehr. Als Gegenspieler: Rette dich mit 31 Augen aus dem Schneider, wenn das Spiel verloren ist.</li>
        <li><strong>Abwurfsignale:</strong> Wirft dein Partner eine hohe Karte einer Farbe ab, hat er dort Stärke oder will die Farbe loswerden – beobachte!</li>
        <li><strong>Den Alleinspieler in die Mitte nehmen:</strong> Liegt der Alleinspieler in Mittelhand, ist das für die Gegenspieler ideal: Einer spielt vor ihm, einer nach ihm.</li>
        <li><strong>Null ouvert:</strong> Prüfe jede Farbe auf die „7-9-Bube-Regel“. Eine Lücke reicht zum Verlieren.</li>
        <li><strong>Seeger-Fabian-Wertung:</strong> Im Turnier gibt es zusätzlich +50 für jedes gewonnene und −50 für jedes verlorene Spiel, und die Gegner erhalten bei einem verlorenen Spiel je 40 Punkte (am Dreiertisch).</li>
      </ul>
      <div class="tip">Spiel im <a href="#/spiel">Profi-Modus</a>: keine Hilfen, keine Augenanzeige – nur du und deine Konzentration.</div>`,
  },
};
