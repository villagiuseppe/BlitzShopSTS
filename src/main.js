import { RULES, imagePath } from './cards.js';
import {
  createSession,
  standardRevealCount,
  purchase,
  resetChoices,
  remainingSummary,
  playerSummary,
  isStandardTaken,
  canPurchase,
  simulateFrequencies,
} from './engine.js';

const state = {
  numPlayers: 1,
  activePlayer: 0,
  session: null,
  history: [],
};

const dom = {
  playerSelector: document.getElementById('player-selector'),
  drawBtn: document.getElementById('draw-btn'),
  resetBtn: document.getElementById('reset-choices-btn'),
  reshuffleBtn: document.getElementById('reshuffle-btn'),
  activePlayer: document.getElementById('active-player'),
  activeHint: document.getElementById('active-hint'),
  poolSummary: document.getElementById('pool-summary'),
  wareBoard: document.getElementById('ware-board'),
  boardSubtitle: document.getElementById('board-subtitle'),
  boardCounter: document.getElementById('board-counter'),
  playerStatuses: document.getElementById('player-statuses'),
  history: document.getElementById('history'),
  debugTrials: document.getElementById('debug-trials'),
  debugSeed: document.getElementById('debug-seed'),
  runDebugBtn: document.getElementById('run-debug-btn'),
  debugResults: document.getElementById('debug-results'),
  headerStats: document.getElementById('header-stats'),
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function appendStat(parent, label, value, danger = false) {
  const stat = el('div', danger ? 'stat danger' : 'stat');
  stat.append(el('span', '', label), el('strong', '', String(value)));
  parent.append(stat);
}

function makeFallback(card) {
  const fallback = el('div', 'card-fallback');
  fallback.hidden = true;
  fallback.append(
    el('span', 'fallback-icon', '✦'),
    el('strong', '', card.nome),
    el('span', '', 'Image unavailable'),
  );
  return fallback;
}

function attachImage(img, fallback, card) {
  img.addEventListener('error', () => {
    img.hidden = true;
    fallback.hidden = false;
  });
  img.addEventListener('load', () => {
    img.hidden = false;
    fallback.hidden = true;
  });
  img.src = imagePath(card.image);
  img.alt = card.nome;
  img.loading = 'lazy';
}

function makeWareCard(card, index, source, playerIndex = null) {
  const slot = el(
    'div',
    source === 'cursed' ? 'card-slot cursed-card' : 'card-slot',
  );
  slot.dataset.uid = card.uid;
  slot.dataset.source = source;
  if (playerIndex !== null) slot.dataset.player = String(playerIndex);
  slot.style.setProperty('--delay', `${index * 65}ms`);

  const flip = el('div', 'card-flip');
  const front = el('div', 'card-front');

  const button = el('button', 'card-button');
  button.type = 'button';
  button.dataset.source = source;
  button.dataset.uid = card.uid;
  if (playerIndex !== null) button.dataset.player = String(playerIndex);

  const img = el('img');
  const fallback = makeFallback(card);
  attachImage(img, fallback, card);
  button.append(img, fallback);

  const caption = el('div', 'card-caption');
  caption.append(el('strong', '', card.nome), el('span', '', card.effetto));
  if (source === 'cursed') {
    caption.append(
      el('span', 'curse-note', `+1 Random Curse · Player ${playerIndex + 1} only`),
    );
  }

  const badgeClass = source === 'cursed' ? 'copies-badge cursed-badge' : 'copies-badge';
  const badgeText =
    source === 'cursed' ? `P${playerIndex + 1} · CURSED` : `×${card.copie}`;
  const badge = el('span', badgeClass, badgeText);
  const overlay = el('div', 'taken-overlay', 'PURCHASED');
  overlay.hidden = true;

  front.append(button, badge, caption);
  flip.append(front);
  slot.append(flip, overlay);
  return slot;
}

function renderPlayerSelector() {
  dom.playerSelector.replaceChildren();
  for (let p = RULES.MIN_PLAYERS; p <= RULES.MAX_PLAYERS; p += 1) {
    const chip = el(
      'button',
      p === state.numPlayers ? 'player-chip active' : 'player-chip',
      p === 1 ? '1 · Solo' : String(p),
    );
    chip.type = 'button';
    chip.addEventListener('click', () => {
      state.numPlayers = p;
      state.activePlayer = Math.min(state.activePlayer, p - 1);
      startNewSession();
    });
    dom.playerSelector.append(chip);
  }
}

function renderActivePlayerSelect() {
  dom.activePlayer.replaceChildren();
  for (let p = 0; p < state.numPlayers; p += 1) {
    const option = el('option', '', `Player ${p + 1}`);
    option.value = String(p);
    dom.activePlayer.append(option);
  }
  dom.activePlayer.value = String(state.activePlayer);
}

function renderBoards() {
  const session = state.session;
  const slots = session.revealedStandard.map((card, index) =>
    makeWareCard(card, index, 'standard'),
  );
  session.cursedByPlayer.forEach(([card], playerIndex) => {
    slots.push(makeWareCard(card, slots.length, 'cursed', playerIndex));
  });
  dom.wareBoard.replaceChildren(...slots);

  dom.boardSubtitle.textContent =
    state.numPlayers === 1
      ? 'Solo: 3 shared Standard cards + 1 personal Cursed card.'
      : `${state.numPlayers} players: ${standardRevealCount(state.numPlayers)} shared Standard cards + ${state.numPlayers} personal Cursed cards, all in one board.`;
}

function reasonLabel(reason) {
  switch (reason) {
    case 'limit-reached':
      return 'Purchase limit reached';
    case 'already-taken':
      return 'Card already taken';
    case 'not-your-cursed':
      return 'Not your Cursed Ware';
    default:
      return 'Unavailable';
  }
}

function updateBoardStates() {
  const session = state.session;
  const summary = remainingSummary(session);
  const active = playerSummary(session, state.activePlayer);

  dom.wareBoard.querySelectorAll('.card-slot').forEach((slot) => {
    const uid = slot.dataset.uid;
    const source = slot.dataset.source;
    const owner = slot.dataset.player === undefined ? null : Number(slot.dataset.player);
    const check = canPurchase(session, state.activePlayer, source, uid);
    const taken =
      source === 'standard'
        ? isStandardTaken(session, uid)
        : session.purchases.some((list) =>
            list.some((item) => item.source === 'cursed' && item.uid === uid),
          );
    const otherPlayer = source === 'cursed' && owner !== state.activePlayer;
    const button = slot.querySelector('.card-button');
    const overlay = slot.querySelector('.taken-overlay');

    slot.classList.toggle('taken', taken);
    slot.classList.toggle('other-player', otherPlayer);
    button.disabled = !check.ok;
    button.title = taken
      ? 'Already purchased'
      : otherPlayer
        ? `Only Player ${owner + 1} can take this`
        : check.ok
          ? 'Purchase'
          : reasonLabel(check.reason);
    overlay.hidden = !taken;
  });

  dom.playerStatuses.replaceChildren();
  for (let p = 0; p < session.numPlayers; p += 1) {
    const ps = playerSummary(session, p);
    const status = el(
      'div',
      p === state.activePlayer ? 'player-status active' : 'player-status',
    );
    status.append(el('span', '', `P${p + 1}`), el('b', '', `${ps.used}/${ps.limit}`));
    if (ps.cursedChosen) status.append(el('span', 'bonus', '+2'));
    dom.playerStatuses.append(status);
  }

  dom.boardCounter.textContent = `${summary.availableStandard}/${summary.revealedStandard} standard available`;

  const totalPurchases = session.purchases.reduce((sum, list) => sum + list.length, 0);
  dom.poolSummary.replaceChildren();
  appendStat(dom.poolSummary, 'Standard left', summary.standardDeck);
  appendStat(dom.poolSummary, 'Standard available', summary.availableStandard);
  appendStat(dom.poolSummary, 'Cursed left', summary.cursedDeck, true);
  appendStat(dom.poolSummary, 'Wares purchased', totalPurchases);

  dom.headerStats.replaceChildren();
  const pills = [
    ['Players', state.numPlayers],
    ['Standard revealed', summary.revealedStandard],
    ['Cursed revealed', summary.cursedRevealed],
    ['Visits logged', state.history.filter((h) => h.kind === 'draw').length],
  ];
  pills.forEach(([label, value]) => {
    const pill = el('div', 'pill');
    pill.append(document.createTextNode(`${label} `), el('strong', '', String(value)));
    dom.headerStats.append(pill);
  });

  if (active.remaining === 0) {
    dom.activeHint.textContent = `Player ${state.activePlayer + 1}: purchase limit reached (${active.used}/${active.limit}).`;
  } else if (active.cursedChosen && active.cursedCard?.id === 'cursed-choices') {
    dom.activeHint.textContent = `Cursed Choices bonus: limit ${active.limit} wares (${active.used} used).`;
  } else {
    dom.activeHint.textContent = `Click a card to purchase it · limit ${active.limit} wares.`;
  }
}

function addHistory(kind, text, chips = []) {
  state.history.unshift({
    kind,
    text,
    chips,
    time: new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  });
  if (state.history.length > 40) state.history.length = 40;
  renderHistory();
}

function renderHistory() {
  dom.history.replaceChildren();
  if (state.history.length === 0) {
    dom.history.append(el('div', 'empty-state', 'No draws recorded.'));
    return;
  }

  state.history.forEach((item) => {
    const entry = el('div', `history-item ${item.kind}`);
    entry.append(el('time', '', item.time), document.createTextNode(item.text));
    if (item.chips.length) {
      const chips = el('div', 'history-chips');
      item.chips.forEach((chip) => chips.append(el('span', '', chip)));
      entry.append(chips);
    }
    dom.history.append(entry);
  });
}

function startNewSession({ clearHistory = false } = {}) {
  state.session = createSession({ numPlayers: state.numPlayers });
  state.activePlayer = Math.min(state.activePlayer, state.numPlayers - 1);
  if (clearHistory) state.history = [];

  renderPlayerSelector();
  renderActivePlayerSelect();
  renderBoards();

  const chips = [
    ...state.session.revealedStandard.map((card) => card.nome),
    ...state.session.cursedByPlayer.map(([card]) => `☠ ${card.nome}`),
  ];
  addHistory(
    'draw',
    `New visit · ${state.numPlayers} player(s) · ${standardRevealCount(state.numPlayers)} Standard + ${state.numPlayers} Cursed`,
    chips,
  );
  updateBoardStates();
}

function handleBuy(event) {
  const button = event.target.closest('button[data-source]');
  if (!button || button.disabled) return;

  const source = button.dataset.source;
  const playerIndex = state.activePlayer;
  const result = purchase(state.session, playerIndex, source, button.dataset.uid);
  if (!result.ok) return;

  addHistory(
    'buy',
    `Player ${playerIndex + 1} purchased ${result.card.nome}${source === 'cursed' ? ' (own Cursed)' : ''}`,
    [result.card.nome],
  );
  updateBoardStates();
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function deltaCell(observed, expected) {
  const delta = observed - expected;
  const cell = el('td', delta >= 0 ? 'delta-positive' : 'delta-negative');
  cell.textContent = `${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}pp`;
  return cell;
}

function buildTable(headers, rows) {
  const table = el('table');
  const thead = el('thead');
  const headRow = el('tr');
  headers.forEach((header) => headRow.append(el('th', '', header)));
  thead.append(headRow);
  const tbody = el('tbody');
  rows.forEach((row) => tbody.append(row));
  table.append(thead, tbody);
  return table;
}

function renderDebug(data, elapsedMs) {
  dom.debugResults.replaceChildren();

  const summary = el(
    'p',
    'debug-note',
    `${data.trials} draws · ${data.numPlayers} player(s) · ${elapsedMs.toFixed(0)} ms. ` +
      `The "Δ" column shows the difference between observed frequency and theoretical probability.`,
  );
  dom.debugResults.append(summary);

  const standardRows = data.standard.map((card) => {
    const row = el('tr');
    row.append(
      el('td', '', card.nome),
      el('td', '', `×${card.copie}`),
      el('td', '', formatPercent(card.observed)),
      el('td', '', formatPercent(card.expected)),
      deltaCell(card.observed, card.expected),
      el('td', '', formatPercent(card.drawShare)),
      el('td', '', formatPercent(card.expectedDraw)),
    );
    return row;
  });
  dom.debugResults.append(
    el('h3', '', 'Standard · board presence and draw weight'),
    buildTable(
      ['Card', 'Copies', 'Obs.', 'Expected', 'Δ', 'Draws', 'Expected'],
      standardRows,
    ),
  );

  const cursedRows = data.cursed.map((card) => {
    const row = el('tr');
    row.append(
      el('td', '', card.nome),
      el('td', '', formatPercent(card.observed)),
      el('td', '', formatPercent(card.expected)),
      deltaCell(card.observed, card.expected),
    );
    return row;
  });
  dom.debugResults.append(
    el('h3', '', 'Cursed · presence among players'),
    buildTable(['Card', 'Obs.', 'Expected', 'Δ'], cursedRows),
  );

  dom.debugResults.append(
    el(
      'p',
      'debug-note',
      'Theory: P(Standard present) = 1 − C(16−c, k)/C(16, k), where c = copies and k = revealed cards; ' +
        'P(Cursed present) = 1 − C(7, p)/C(8, p), where p = players. The draw weight of a Standard type is c/16.',
    ),
  );
}

function runDebug() {
  const rawTrials = Number(dom.debugTrials.value);
  const trials = Math.min(
    100000,
    Math.max(100, Number.isFinite(rawTrials) ? Math.floor(rawTrials) : 1000),
  );
  const rawSeed = Number(dom.debugSeed.value.trim());
  const seed = dom.debugSeed.value.trim() !== '' && Number.isFinite(rawSeed)
    ? rawSeed
    : undefined;

  const started = performance.now();
  const data = simulateFrequencies({ numPlayers: state.numPlayers, trials, seed });
  renderDebug(data, performance.now() - started);
}

dom.drawBtn.addEventListener('click', () => startNewSession());
dom.reshuffleBtn.addEventListener('click', () => startNewSession({ clearHistory: true }));
dom.resetBtn.addEventListener('click', () => {
  resetChoices(state.session);
  addHistory('buy', 'Picks reset · same revealed cards, purchases cleared.');
  updateBoardStates();
});
dom.activePlayer.addEventListener('change', () => {
  state.activePlayer = Number(dom.activePlayer.value);
  updateBoardStates();
});
dom.wareBoard.addEventListener('click', handleBuy);
dom.runDebugBtn.addEventListener('click', runDebug);

startNewSession();
