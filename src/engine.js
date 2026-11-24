/**
 * =============================================================================
 * MOTORE DELLE REGOLE - Simulatore Estrazione Merci del Mercante (Blitz Mode)
 * =============================================================================
 *
 * Fonte normativa: docs/regole_estrazione_mercante.txt
 *
 * responsabilita' di questo modulo:
 *  - costruire i due mazzi (Standard 16 carte fisiche, Maledetto 8 carte fisiche);
 *  - mescolarli senza reimmissione durante la stessa visita al mercante;
 *  - rivelare il numero corretto di carte in base ai giocatori;
 *  - assegnare a ogni giocatore la propria Cursed Ware personale;
 *  - gestire acquisti, limite di 2 merci e eccezione "Cursed Choices";
 *  - fornire funzioni probabilistiche per il pannello di debug/test.
 *
 * Questo modulo NON tocca il DOM: e' isolato e testabile in Node o nel browser.
 */

import { STANDARD_CARDS, CURSED_CARDS, RULES } from './cards.js';

/**
 * Generatore di numeri casuali seedabile (mulberry32).
 * Se non viene passato un seed viene usato Math.random: in tal modo la simulazione
 * e' imprevedibile, ma il pannello di test puo' passare un seed per ripetibilita'.
 */
export function createRng(seed) {
  if (seed === undefined || seed === null) return Math.random;

  let a = seed >>> 0;
  return function next() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates: restituisce una NUOVA array mescolata, senza mutare l'originale. */
export function shuffle(items, rng = Math.random) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Verifica il numero di giocatori (regola: da 1 a 4).
 * @throws {RangeError} se il valore e' fuori intervallo o non intero.
 */
export function validatePlayerCount(numPlayers) {
  if (
    !Number.isInteger(numPlayers) ||
    numPlayers < RULES.MIN_PLAYERS ||
    numPlayers > RULES.MAX_PLAYERS
  ) {
    throw new RangeError(
      `numPlayers deve essere un intero tra ${RULES.MIN_PLAYERS} e ${RULES.MAX_PLAYERS}`,
    );
  }
  return numPlayers;
}

/**
 * Regola di rivelazione dello Standard:
 *  - 1 giocatore (Solo)  -> 3 carte di tipologie diverse;
 *  - piu' giocatori      -> 2 * num_giocatori carte.
 */
export function standardRevealCount(numPlayers) {
  validatePlayerCount(numPlayers);
  return numPlayers === 1
    ? RULES.SOLO_STANDARD_REVEAL
    : RULES.STANDARD_PER_PLAYER * numPlayers;
}

/**
 * Espande le tipologie in carte FISICHE: ogni copia diventa un'istanza con uid
 * unico. Il numero di copie e' il "peso" statistico della tipologia
 * (es. Potions ha 2 copie quindi il doppio delle probabilita' di Relic da 1).
 *
 * `weightModifier` e' un hook facoltativo per simulazioni what-if: di default e'
 * l'identita' e NON modifica le regole ufficiali. La UI non lo espone.
 */
function buildDeck(cardTypes, rng, weightModifier) {
  const deck = [];

  cardTypes.forEach((type) => {
    const multiplier = weightModifier(type) ?? 1;
    const copies = Math.max(0, Math.round(type.copie * multiplier));

    for (let index = 1; index <= copies; index += 1) {
      deck.push({
        ...type,
        uid: `${type.id}#${index}`,
      });
    }
  });

  return shuffle(deck, rng);
}

/**
 * Crea una nuova visita al mercante (nuovo "sessione" di estrazione).
 *
 * Struttura restituita:
 *  - standardDeck / cursedDeck : carte NON rivelate (pool residuo, senza reimmissione)
 *  - revealedStandard          : pool comune di carte Standard rivelate
 *  - cursedByPlayer[p][0]      : Cursed Ware personale del giocatore p
 *  - purchases[p]              : acquisti effettuati dal giocatore p
 */
export function createSession({
  numPlayers = 1,
  seed,
  rng = createRng(seed),
  weightModifier = () => 1,
} = {}) {
  validatePlayerCount(numPlayers);

  const standardDeck = buildDeck(STANDARD_CARDS, rng, weightModifier);
  const cursedDeck = buildDeck(CURSED_CARDS, rng, weightModifier);

  // Rivelazione Standard: dal mazzo mescolato, senza reimmissione.
  const revealCount = standardRevealCount(numPlayers);
  const revealedStandard = [];
  if (numPlayers === 1) {
    const seenTypes = new Set();
    for (
      let index = 0;
      index < standardDeck.length && revealedStandard.length < revealCount;
    ) {
      const card = standardDeck[index];
      if (seenTypes.has(card.id)) {
        index += 1;
        continue;
      }
      seenTypes.add(card.id);
      revealedStandard.push(standardDeck.splice(index, 1)[0]);
    }
  } else {
    revealedStandard.push(...standardDeck.splice(0, revealCount));
  }

  // Rivelazione Maledetta: esattamente 1 carta per ciascun giocatore.
  const cursedByPlayer = [];
  for (let player = 0; player < numPlayers; player += 1) {
    cursedByPlayer.push(cursedDeck.splice(0, RULES.CURSED_PER_PLAYER));
  }

  return {
    numPlayers,
    standardDeck,
    cursedDeck,
    revealedStandard,
    cursedByPlayer,
    purchases: Array.from({ length: numPlayers }, () => []),
  };
}

/** true se una carta Standard rivelata e' gia' stata acquistata da qualcuno. */
export function isStandardTaken(session, uid) {
  return session.purchases.some((list) =>
    list.some((item) => item.source === 'standard' && item.uid === uid),
  );
}

/**
 * Calcola il limite di acquisto di un giocatore.
 * Base: 2 merci. Se il giocatore HA SCELTO la propria Cursed Choices -> +2 (max 4).
 * Nota: possedere la carta non basta; il bonus scatta solo dopo averla acquistata.
 */
export function purchaseLimitFor(session, playerIndex) {
  const cursed = session.cursedByPlayer[playerIndex]?.[0];
  const choseCursed = session.purchases[playerIndex].some(
    (item) => item.source === 'cursed',
  );
  const bonus =
    cursed?.id === 'cursed-choices' && choseCursed
      ? RULES.CURSED_CHOICES_BONUS
      : 0;

  return RULES.BASE_PURCHASE_LIMIT + bonus;
}

/**
 * Verifica se un acquisto e' lecito.
 *
 * Le "combinazioni consentite" del documento (2 Standard oppure 1 Standard + 1
 * Cursed) discendono direttamente dal limite di 2 e dal fatto che ogni giocatore
 * possieda una sola Cursed: non serve una regola aggiuntiva, basta il tetto.
 *
 * @returns {{ok: boolean, reason: string, card: object|null}}
 */
export function canPurchase(session, playerIndex, source, uid) {
  if (
    !Number.isInteger(playerIndex) ||
    playerIndex < 0 ||
    playerIndex >= session.numPlayers
  ) {
    return { ok: false, reason: 'invalid-player', card: null };
  }

  const used = session.purchases[playerIndex].length;
  const limit = purchaseLimitFor(session, playerIndex);
  if (used >= limit) {
    return { ok: false, reason: 'limit-reached', card: null };
  }

  if (source === 'standard') {
    const card = session.revealedStandard.find((item) => item.uid === uid);
    if (!card) return { ok: false, reason: 'not-available', card: null };
    if (isStandardTaken(session, uid)) {
      return { ok: false, reason: 'already-taken', card };
    }
    const hasSameType = session.purchases[playerIndex].some(
      (item) => item.typeId === card.id,
    );
    if (hasSameType) {
      return { ok: false, reason: 'duplicate-card', card };
    }
    return { ok: true, reason: 'ok', card };
  }

  if (source === 'cursed') {
    const own = session.cursedByPlayer[playerIndex][0];
    if (!own || own.uid !== uid) {
      return { ok: false, reason: 'not-your-cursed', card: null };
    }
    const alreadyTaken = session.purchases[playerIndex].some(
      (item) => item.source === 'cursed',
    );
    if (alreadyTaken) return { ok: false, reason: 'already-taken', card: own };
    return { ok: true, reason: 'ok', card: own };
  }

  return { ok: false, reason: 'invalid-source', card: null };
}

/**
 * Esegue un acquisto (se lecito) e aggiorna lo stato della sessione.
 * Nessuna carta torna nel mazzo: il pool residuo resta invariato.
 */
export function purchase(session, playerIndex, source, uid) {
  const check = canPurchase(session, playerIndex, source, uid);
  if (!check.ok) return check;

  session.purchases[playerIndex].push({
    uid: check.card.uid,
    source,
    typeId: check.card.id,
    nome: check.card.nome,
    image: check.card.image,
  });

  return check;
}

/** Verifica se un giocatore puo' annullare un proprio acquisto. */
export function canCancelPurchase(session, playerIndex, source, uid) {
  if (
    !Number.isInteger(playerIndex) ||
    playerIndex < 0 ||
    playerIndex >= session.numPlayers
  ) {
    return { ok: false, reason: 'invalid-player', card: null };
  }

  const purchases = session.purchases[playerIndex];
  const card = purchases.find(
    (item) => item.source === source && item.uid === uid,
  );
  if (!card) return { ok: false, reason: 'not-owned', card: null };

  if (
    card.typeId === 'cursed-choices' &&
    purchases.length - 1 > RULES.BASE_PURCHASE_LIMIT
  ) {
    return { ok: false, reason: 'bonus-in-use', card };
  }

  return { ok: true, reason: 'ok', card };
}

/** Annulla un acquisto effettuato dal giocatore indicato. */
export function cancelPurchase(session, playerIndex, source, uid) {
  const check = canCancelPurchase(session, playerIndex, source, uid);
  if (!check.ok) return check;

  const purchases = session.purchases[playerIndex];
  const index = purchases.findIndex(
    (item) => item.source === source && item.uid === uid,
  );
  purchases.splice(index, 1);

  return check;
}

/** Annulla tutti gli acquisti mantenendo le stesse carte estratte. */
export function resetChoices(session) {
  session.purchases = Array.from({ length: session.numPlayers }, () => []);
  return session;
}

/** Riepilogo del mazzo residuo e del pool rivelato. */
export function remainingSummary(session) {
  const availableStandard = session.revealedStandard.filter(
    (card) => !isStandardTaken(session, card.uid),
  ).length;

  return {
    standardDeck: session.standardDeck.length,
    cursedDeck: session.cursedDeck.length,
    revealedStandard: session.revealedStandard.length,
    availableStandard,
    takenStandard: session.revealedStandard.length - availableStandard,
    cursedRevealed: session.cursedByPlayer.length,
  };
}

/** Riepilogo di un singolo giocatore, utile per la UI. */
export function playerSummary(session, playerIndex) {
  const used = session.purchases[playerIndex].length;
  const limit = purchaseLimitFor(session, playerIndex);
  return {
    playerIndex,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    cursedCard: session.cursedByPlayer[playerIndex][0] ?? null,
    cursedChosen: session.purchases[playerIndex].some(
      (item) => item.source === 'cursed',
    ),
  };
}

/* ---------------------------------------------------------------------------
 * Probabilita' teoriche (usate dal pannello debug per validare le simulazioni)
 * ------------------------------------------------------------------------- */

/** Coefficiente binomiale "n su k" (servono mazzi piccoli, numeri esatti). */
function combinations(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0) return 1;
  let result = 1;
  for (let i = 1; i <= k; i += 1) {
    result = (result * (n - k + i)) / i;
  }
  return result;
}

/**
 * P(una tipologia Standard con `copie` esemplari compaia ALMENO una volta
 * tra le k carte rivelate) = 1 - C(16-c, k) / C(16, k).
 */
export function expectedStandardPresence(copies, numPlayers) {
  const k = standardRevealCount(numPlayers);
  const n = RULES.STANDARD_TOTAL;
  return 1 - combinations(n - copies, k) / combinations(n, k);
}

/**
 * P(una data tipologia Maledetta compaia tra le p carte personali rivelate)
 * = 1 - C(7, p) / C(8, p) = p / 8.
 */
export function expectedCursedPresence(numPlayers) {
  const p = numPlayers * RULES.CURSED_PER_PLAYER;
  return 1 - combinations(7, p) / combinations(8, p);
}

/**
 * Simulazione rapida (default 1000 estrazioni) per verificare le probabilita'.
 * Per ogni tipologia restituisce:
 *  - observed       : frazione di sessioni in cui la carta e' comparsa
 *  - expected       : valore teorico corrispondente
 *  - drawShare      : quota di pescate della tipologia (verifica i "pesi")
 *  - expectedDraw   : copie/16 per lo Standard, 1/8 per il Maledetto
 */
export function simulateFrequencies({
  numPlayers = 1,
  trials = 1000,
  seed,
  weightModifier = () => 1,
} = {}) {
  validatePlayerCount(numPlayers);
  const rng = createRng(seed);
  const totalTrials = Math.max(1, Math.floor(trials));
  const revealCount = standardRevealCount(numPlayers);

  const standardCounts = Object.fromEntries(STANDARD_CARDS.map((c) => [c.id, 0]));
  const standardDraws = Object.fromEntries(STANDARD_CARDS.map((c) => [c.id, 0]));
  const cursedCounts = Object.fromEntries(CURSED_CARDS.map((c) => [c.id, 0]));

  for (let trial = 0; trial < totalTrials; trial += 1) {
    const session = createSession({ numPlayers, rng, weightModifier });

    const standardSeen = new Set();
    session.revealedStandard.forEach((card) => {
      standardSeen.add(card.id);
      standardDraws[card.id] += 1;
    });
    standardSeen.forEach((id) => {
      standardCounts[id] += 1;
    });

    const cursedSeen = new Set();
    session.cursedByPlayer.forEach(([card]) => {
      if (card) cursedSeen.add(card.id);
    });
    cursedSeen.forEach((id) => {
      cursedCounts[id] += 1;
    });
  }

  const standard = STANDARD_CARDS.map((card) => ({
    id: card.id,
    nome: card.nome,
    copie: card.copie,
    image: card.image,
    observed: standardCounts[card.id] / totalTrials,
    expected: expectedStandardPresence(card.copie, numPlayers),
    drawShare: standardDraws[card.id] / (totalTrials * revealCount),
    expectedDraw: card.copie / RULES.STANDARD_TOTAL,
  }));

  const cursed = CURSED_CARDS.map((card) => ({
    id: card.id,
    nome: card.nome,
    image: card.image,
    observed: cursedCounts[card.id] / totalTrials,
    expected: expectedCursedPresence(numPlayers),
  }));

  return { numPlayers, trials: totalTrials, standard, cursed };
}
