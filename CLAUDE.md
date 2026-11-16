# CLAUDE.md

OpenBuilds CONTROL – Electron-Host-Software für CNC-Maschinen mit Grbl / grblHAL / FluidNC
(USB-Seriell oder Telnet/WLAN). Dieser Fork wird für PCB-Fräsen genutzt.

## Entwicklung

- **Node 20** verwenden (wie in `.github/workflows/build.yml`; `.travis.yml` mit Node 12 ist veraltet).
- `npm install` – der `postinstall`-Hook baut native Module (`serialport`) gegen die Electron-Version neu.
- **Start:** `npm run run-local` (= `electron .`).
- `npm start` und `npm test` sind Platzhalter ohne Funktion. Es gibt **keine automatisierten Tests** –
  Änderungen müssen manuell in der App geprüft werden (wenn möglich ohne angeschlossene Maschine oder
  mit gesicherter Maschine / ohne Werkzeug).
- Release: Version in `package.json` erhöhen, Commit `v1.0.3xx`, Push → GitHub Actions baut und veröffentlicht.

## Architektur

```
index.js (Electron-Hauptprozess, ~4000 Zeilen, alles in einer Datei)
 ├─ Express-HTTP-Server (Port 3000, Fallback 3020/3200/3220, Override via WEB_PORT)
 │   + HTTPS auf 3001 (Zertifikate fullchain1.pem / privkey1.pem)
 │   liefert app/ aus und bietet REST-Endpunkte (/api/version, /upload, /runjob, /gcode, ...)
 ├─ Socket.IO-Server  ←→  UI (Events: connectTo, runJob, runCommand, jog, jogXY, jogTo,
 │                         setZero, gotoZero, probe, feedOverride, spindleOverride,
 │                         pause, resume, stop, clearAlarm, resetMachine, closePort, ...)
 ├─ Maschinenkommunikation: `serialport` (USB) oder net-Socket (Telnet)
 │   Antworten → parseFeedback() (Statusreport `<...>`), gotModals(), ALARM/error-Handling
 ├─ G-Code-Queue + Character-Counting-Streaming
 ├─ Firmware-Flashing (esptool-*, *.bin, *.hex im Repo-Root) und Telnet-Netzwerkscan
 └─ BrowserWindow `jogWindow` lädt http://localhost:<webPort>/
```

Die UI ist eine **normale Web-App** (jQuery + Metro4 + three.js, keine Build-Pipeline), die nur über
Socket.IO mit dem Hauptprozess spricht – sie läuft daher auch im Browser auf anderen Geräten im Netz.

- `app/index.html` – Hauptoberfläche, bindet alle Skripte per `<script>` ein (Reihenfolge relevant, globale Variablen).
- `app/js/websocket.js` – Socket.IO-Client, empfängt Status, sendet Befehle.
- `app/js/jog.js`, `app/js/keyboard.js` – Jog-Buttons und Tastaturkürzel (inkl. Stop/Pause/Alarm löschen).
- `app/js/macros.js`, `toolchange.js`, `grbl-settings*.js`, `viewer.js` (3D-Vorschau), `ui.js`, `main.js`.
- `app/jog/` – separate mobile Jog-Oberfläche (PWA) mit eigenen Stop-/Alarm-Buttons.
- `app/wizards/` – Kalibrierung, Probing, Surfacing, Job-Resume, Flashing-Tool.
- `grblStrings.js` – Texte für Grbl-Alarm- und Fehlercodes.

### Zentrale Zustände in index.js

- `status.comms.connectionStatus`: 0 = getrennt, 1 = öffnet, 2 = verbunden/idle, 3 = Job läuft,
  4 = pausiert, 5 = Alarm, 6 = Firmware-Upgrade.
- `gcodeQueue` + `queuePointer` (zu sendende Zeilen), `sentBuffer` (gesendete, noch nicht per `ok`
  bestätigte Zeilen). `BufferSpace()` rechnet gegen den RX-Puffer der Steuerung.
- `status.comms.blocked` / `status.comms.paused` steuern, ob `send1Q()` weiter sendet.

### Senden von Befehlen

- `addQToEnd(gcode)` + `send1Q()` – normale Zeilen über die Queue (warten auf `ok`).
  `addQToEnd` hängt bei modalen Befehlen automatisch ein `$G` an.
- `addQRealtime(char)` → `machineSend(..., true)` – Grbl-Echtzeitbefehle, gehen **sofort und an der Queue
  vorbei** an den Port und erzeugen kein `ok`:
  `!` Feed Hold, `~` Cycle Start/Resume, `0x18` Soft-Reset (Ctrl-X), `0x85` Jog Cancel,
  `0x90–0x94` Feed-Override, `0x99–0x9D` Spindel-Override, `0x9E` Spindel/Laser-Stop.

## ⚠️ Sicherheitsregel: Maschinenbefehle

Dieser Code bewegt eine echte Maschine mit rotierendem Werkzeug. Fehler können Maschine, Werkstück
oder Menschen gefährden. **Änderungen an allem, was Maschinenbefehle erzeugt, sendet oder deren
Zustand verwaltet, besonders vorsichtig vornehmen** – das betrifft insbesondere:

- **Jog**: `socket.on('jog' | 'jogXY' | 'jogTo')`, `gotoZero`, `probe` in `index.js`; `app/js/jog.js`,
  `app/js/keyboard.js`, `app/jog/`, `app/js/mobilejog.js`
- **Stop / Reset**: `stop()`, `socket.on('resetMachine')`, `stopPort()`, `closePort`
- **Feed Hold / Pause / Resume**: `pause()`, `unpause()`, sowie das automatische `pause()` bei
  `Hold:0` in `parseFeedback()`
- **Alarm**: `socket.on('clearAlarm')` (Methode 1 = nur `$X`, Methode 2 = Queue leeren + Soft-Reset + `$X`),
  ALARM-Erkennung in den Port-Daten-Handlern und `parseFeedback()`
- **Overrides & Laser**: `feedOverride`, `spindleOverride`, `laserTest`
- **Queue / Streaming**: `machineSend()`, `send1Q()`, `addQToEnd()`, `addQRealtime()`, `BufferSpace()`,
  `runJob()`, sowie alle Stellen, die `connectionStatus`, `paused`, `blocked`, `gcodeQueue`, `sentBuffer` ändern
- Tastaturkürzel- und Button-Belegungen, die solche Socket-Events auslösen

Pflicht bei solchen Änderungen:

1. **Vorher erklären** und auf Bestätigung warten: Was ändert sich, welche Bytes/G-Code-Zeilen werden
   in welcher Situation (idle, Job läuft, pausiert, Alarm, Jog aktiv) anders gesendet?
2. **Risiken benennen**: Kann sich die Maschine unerwartet bewegen? Kann ein Stop/Feed Hold verzögert
   werden, ausbleiben oder in der Queue landen statt in Echtzeit? Können Queue-Zustand und Steuerung
   auseinanderlaufen? Werden Timeouts (z. B. die 200 ms zwischen `!` und `0x18` in `stop()`) verändert?
3. **Echtzeitbefehle nie in die Queue verlagern** (Stop, Hold, Reset, Jog-Cancel immer über `addQRealtime`).
4. **Keine Sicherheitsprüfungen entfernen** (z. B. `connectionStatus > 0`, Firmware-Typ-Prüfung,
   Parameter-Validierung bei Jog).
5. Änderungen klein und isoliert halten, kein „Aufräumen“ nebenbei in diesen Funktionen.
6. **Danach erklären**, was geändert wurde, und konkret beschreiben, wie es sicher getestet werden kann
   (z. B. Spindel aus, Werkzeug entfernt, Z hochgefahren, Hand am Not-Aus).

Im Zweifel nachfragen statt annehmen.

## Bekannte Eigenheiten

- In `index.js` (Bereich `connectTo`, ca. Zeile 1707 und 1725) steht `else if (data.type = "telnet")` –
  eine Zuweisung statt Vergleich. Nicht nebenbei „reparieren“, ohne das Verhalten zu prüfen und mir zu erklären.
- Viel globaler Zustand, viele `setInterval`-Loops (`statusLoop`, `queueCounter`, `frontEndUpdateLoop`).
- Der Ordner `BACKUPS OF MACROS FROM FORUM/` enthält nur archivierte Makros, kein App-Code.
