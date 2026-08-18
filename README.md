# Lernimpuls: wöchentliche Aktualisierung

Diese Dateien ergänzen dein bestehendes GitHub-Repository. Sie aktualisieren jeden Montag um 07:00 UTC das KI-Wochenbriefing und veröffentlichen die Änderung automatisch über GitHub Pages.

## Einmalig hochladen

1. Lade `index.html` aus dem Ordner `outputs` in das Hauptverzeichnis deines Repositories hoch und ersetze die vorhandene Datei.
2. Lade die Ordner `.github`, `scripts` und `data` aus diesem Automationsordner in das Hauptverzeichnis desselben Repositories hoch.
3. Prüfe unter `Settings → Secrets and variables → Actions`, dass `OPENAI_API_KEY` hinterlegt ist.
4. Öffne `Actions` im Repository, wähle **Aktualisiere Wochenbriefing** und klicke **Run workflow**, um den ersten Durchlauf sofort zu starten.

Danach wird die Website automatisch aktualisiert. Die Datei `data/seen.json` ist der Verlauf gegen doppelte Meldungen.
