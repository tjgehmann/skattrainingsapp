# ♣♠♥♦ Skat-Trainer

Skat lernen – vom Anfänger zum Profi. Läuft komplett im Browser, ohne Installation.

## Inhalte

**Lernpfad in 5 Stufen** – jeweils mit kurzen Lektionen und Übungen:

1. **Einsteiger** – Karten, Augen, Spielablauf · Übung: Augen zählen
2. **Trumpf & Stiche** – Rangfolge, Bedienen · Übungen: Höchste Karte, Bedienen, Wer bekommt den Stich?
3. **Spielwert & Reizen** – Spitzen, Grundwerte, Reizfolge · Übungen: Spitzen, Spielwert, Reizwerte, Bis wohin reizen?
4. **Spielarten & Taktik** – Grand, Null, Hand, Ouvert, Skat drücken, Allein-/Gegenspiel · Übungen: Spielwahl, Skat drücken, Abrechnung
5. **Profi** – Mitzählen, Profi-Tipps · Übungen: Augen mitzählen, Trümpfe zählen

**Übungsspiel** gegen zwei Computergegner mit vollständigem Reizen, Skat aufnehmen/drücken, Hand-, Null-, Grand- und Ouvert-Spielen und Abrechnung nach ISkO. Drei Modi:

- **Anfänger:** spielbare Karten hervorgehoben, Augen- und Trumpfzähler, Reiz-Tipps
- **Fortgeschritten:** Tipps mit Begründung auf Knopfdruck
- **Profi:** keine Hilfen, am Ende Mitzähl-Test

Fortschritt und Statistik werden lokal im Browser gespeichert.

## Lokal starten

```bash
npm start        # startet http://localhost:8080
npm test         # Regel- und KI-Tests
```

## Veröffentlichung

Der Workflow `.github/workflows/pages.yml` testet und veröffentlicht die App automatisch auf GitHub Pages.
