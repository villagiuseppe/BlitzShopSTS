# Blitz's Shop Simulator

Simulatore web statico per la fase d'acquisto dal Mercante in **Slay the Spire: The Board Game – Blitz Mode**. L'app ricrea le estrazioni descritte in [`regole_estrazione_mercante.txt`](./regole_estrazione_mercante.txt): un pool di **20 tipologie di merci** (12 Standard + 8 Cursed, corrispondenti a 20 immagini e 24 carte fisiche grazie alle copie doppie), mescolate e rivelate secondo il numero di giocatori.

**Demo pubblicata:** [https://villagiuseppe.github.io/BlitzShopSTS/](https://villagiuseppe.github.io/BlitzShopSTS/)

---

## Funzionalità principali

- **Estrazione singola o multipla**: scegli da 1 a 4 giocatori; in solitario vengono mostrate 3 carte Standard di tipologie diverse, con più giocatori 2 carte Standard per giocatore.
- **Cursed personali**: ogni giocatore riceve una propria carta Cursed; le carte altrui non sono selezionabili.
- **Gestione del pool da 20 tipologie**: 16 carte Standard (12 tipologie, 4 presenti in doppia copia) e 8 carte Cursed uniche, senza reimmissione durante la stessa visita al Mercante.
- **Regole, pesi e condizioni**: il numero di copie funziona da peso statistico; regole e costanti sono centralizzate in `src/cards.js` e documentate nel file delle regole.
- **Visualizzazione delle immagini**: 20 PNG in `assets/images/`, con anteprima delle carte e dettagli dell'effetto tramite il pulsante `?`.
- **Simulazione acquisti**: clicca una carta per assegnarla al giocatore attivo; limite base di 2 merci, esteso a 4 dopo aver scelto *Cursed Choices*. Le carte già prese vengono disabilitate e indicano il giocatore acquirente (P1–P4).
- **Reset**: annulla tutte le scelte mantenendo la stessa estrazione; premendo **Draw** viene invece generata una nuova sessione.
- **Test / simulazione rapida**: il motore espone funzioni probabilistiche come `simulateFrequencies()` utilizzabili da Node per validare pesi e frequenze. La UI attuale non include un pannello storico né una modalità test visiva: lo storico dei risultati non è più mostrato.

---

## Sintesi delle regole di estrazione

1. **Configurazione**: viene impostato il numero di giocatori (1–4).
2. **Mescolamento**: i due mazzi vengono shufflati all'inizio della sessione; nessuna carta torna nel mazzo durante la stessa visita.
3. **Carte Standard rivelate**:
   - 1 giocatore → 3 carte, con tipologie diverse;
   - 2–4 giocatori → `2 × numero di giocatori` carte.
4. **Carte Cursed rivelate**: 1 carta per ciascun giocatore, assegnata esclusivamente a lui.
5. **Acquisti**: ogni giocatore può prendere al massimo 2 merci: 2 Standard oppure 1 Standard + la propria Cursed. Non è possibile prendere due tipologie Standard uguali nella stessa sessione.
6. **Cursed Choices**: se il giocatore acquista la propria carta *Cursed Choices*, il limite sale a 4 merci totali.
7. **Nuova estrazione**: il pulsante **Draw** ricrea la sessione da zero; **Reset** mantiene le carte mostrate e azzera solo gli acquisti.

---

## Struttura del progetto

```text
.
├── .github/
│   └── workflows/
│       └── deploy.yml          # Deploy automatico su GitHub Pages
├── assets/
│   └── images/                 # 20 immagini PNG delle carte
├── src/
│   ├── cards.js                # Mazzi, tipologie, copie/pesi e costanti RULES
│   ├── engine.js               # Motore puro: shuffle, estrazione, acquisti, probabilità
│   ├── main.js                 # Logica UI e rendering della plancia
│   └── version.js              # Versione sorgente (sovrascritta in deploy)
├── index.html                  # Struttura della pagina
├── styles.css                  # Stili e layout responsive
├── regole_estrazione_mercante.txt  # Specifiche di gioco di riferimento
└── README.md                   # Questa documentazione
```

Il progetto è una web app senza build: `index.html` carica direttamente i moduli ES in `src/`.

---

## Installazione come app mobile

Il sito può essere installato come PWA su Android e iPhone dopo essere stato pubblicato con HTTPS.

- **Android / Chrome:** apri il sito, tocca il menu `⋮`, quindi seleziona **Installa app** o **Aggiungi a schermata Home**.
- **iPhone / Safari:** apri il sito, tocca Condividi, quindi **Aggiungi alla schermata Home**.

La pagina viene registrata come applicazione standalone e mantiene in cache i file principali per l'uso offline. Aggiornare il repository su `main` attiva il nuovo deploy su GitHub Pages.

---

## Sviluppo locale in WSL

Prerequisiti: **Node.js 18+** e **Python 3** (o un qualsiasi server statico).

```bash
cd ~/projects/BlitzShopSTS
python3 -m http.server 8000
```

Apri [http://localhost:8000/](http://localhost:8000/) dal browser di Windows: con WSL2 il forwarding di localhost funziona automaticamente. Non sono necessari `npm install` o passaggi di build.

Per un controllo rapido del motore delle regole da WSL:

```bash
node --input-type=module -e "import { createSession, simulateFrequencies } from './src/engine.js'; const s = createSession({ numPlayers: 2 }); console.log('standard:', s.revealedStandard.length); console.log('cursed:', s.cursedByPlayer.length); console.log('righe simulazione:', simulateFrequencies({ numPlayers: 2, trials: 1000 }).standard.length);"
```

Il deploy è gestito da `.github/workflows/deploy.yml`: a ogni push su `main` (o avvio manuale del workflow) viene creato `_site`, scritta la versione `1.0.<run_number>` in `src/version.js` e pubblicato il risultato su GitHub Pages. Il workflow può essere lanciato anche manualmente dal tab **Actions**.

---

## Crediti e note

- Progetto **fan-made** non affiliato a Contention Games. Riferimento: [Slay the Spire: the Board Game](https://contentiongames.com/games/slay/).
- Le regole simulate si basano sui materiali della [cartella condivisa Blitz Mode](https://drive.google.com/drive/folders/13Fa5UFuRjoTlitsO4ygVTcCPuUwxH6xU) e sono documentate in `regole_estrazione_mercante.txt`.
- Le immagini in `assets/images/` provengono dalla stessa cartella Blitz Mode e sono incluse nel repository per uso dimostrativo e personale; verificarne la titolarità e le licenze prima di qualsiasi redistribuzione.
- L'app è pensata per uso personale e didattico, senza finalità commerciali.
