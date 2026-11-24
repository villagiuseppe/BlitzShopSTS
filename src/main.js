import { RULES, imagePath } from './cards.js';
import {
  createSession,
  purchase,
  canCancelPurchase,
  cancelPurchase,
  resetChoices,
  playerSummary,
  canPurchase,
} from './engine.js';
import { APP_VERSION } from './version.js';

const state = {
  numPlayers: 1,
  activePlayer: 0,
  session: null,
};

const dom = {
  playerSelector: document.getElementById('player-selector'),
  drawBtn: document.getElementById('draw-btn'),
  resetBtn: document.getElementById('reset-choices-btn'),
  activePlayer: document.getElementById('active-player'),
  activeHint: document.getElementById('active-hint'),
  wareBoard: document.getElementById('ware-board'),
  appVersion: document.getElementById('app-version'),
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
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

  const frontChildren = [button];
  if (source === 'cursed') {
    frontChildren.push(
      el('span', 'copies-badge cursed-badge', `P${playerIndex + 1}`),
    );
  }

  const info = el('div', 'card-info');
  info.hidden = true;
  info.append(
    el('strong', '', card.nome),
    el('span', 'card-info-count', `Cards: ×${card.copie}`),
    el('span', '', card.effetto),
  );

  const infoButton = el('button', 'card-info-btn', '?');
  infoButton.type = 'button';
  infoButton.setAttribute('aria-label', `Details for ${card.nome}`);
  infoButton.setAttribute('aria-expanded', 'false');
  infoButton.addEventListener('click', () => {
    const open = info.hidden;
    info.hidden = !open;
    infoButton.textContent = open ? '×' : '?';
    infoButton.setAttribute('aria-expanded', String(open));
  });

  const overlay = el('div', 'taken-overlay', 'PURCHASED');
  overlay.hidden = true;

  frontChildren.push(info, infoButton);
  front.append(...frontChildren);
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
      String(p),
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

function renderActivePlayerButtons() {
  dom.activePlayer.replaceChildren();
  for (let playerIndex = 0; playerIndex < state.numPlayers; playerIndex += 1) {
    const summary = playerSummary(state.session, playerIndex);
    const classes = ['active-player-chip'];
    if (playerIndex === state.activePlayer) classes.push('active');
    if (summary.used >= summary.limit) classes.push('complete');
    const chip = el('button', classes.join(' '));
    chip.type = 'button';
    chip.setAttribute('aria-pressed', String(playerIndex === state.activePlayer));
    chip.append(
      el('span', '', `P${playerIndex + 1}`),
      el('b', 'active-player-count', `${summary.used}/${summary.limit}`),
    );
    chip.addEventListener('click', () => {
      state.activePlayer = playerIndex;
      updateBoardStates();
    });
    dom.activePlayer.append(chip);
  }
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
}

function reasonLabel(reason) {
  switch (reason) {
    case 'limit-reached':
      return 'Purchase limit reached';
    case 'already-taken':
      return 'Card already taken';
    case 'not-your-cursed':
      return 'Not your Cursed Ware';
    case 'duplicate-card':
      return 'Same card already selected';
    case 'not-owned':
      return 'Only the player who purchased this card can cancel it.';
    case 'bonus-in-use':
      return 'Cancel extra purchases before cancelling Cursed Choices.';
    default:
      return 'Unavailable';
  }
}

function updateBoardStates() {
  const session = state.session;
  const active = playerSummary(session, state.activePlayer);

  dom.wareBoard.querySelectorAll('.card-slot').forEach((slot) => {
    const uid = slot.dataset.uid;
    const source = slot.dataset.source;
    const owner = slot.dataset.player === undefined ? null : Number(slot.dataset.player);
    const check = canPurchase(session, state.activePlayer, source, uid);
    const purchaserIndex = session.purchases.findIndex((list) =>
      list.some((item) => item.source === source && item.uid === uid),
    );
    const taken = purchaserIndex !== -1;
    const purchasedByActivePlayer = purchaserIndex === state.activePlayer;
    const cancelCheck = purchasedByActivePlayer
      ? canCancelPurchase(session, state.activePlayer, source, uid)
      : null;
    const otherPlayer = source === 'cursed' && owner !== state.activePlayer;
    const button = slot.querySelector('.card-button');
    const overlay = slot.querySelector('.taken-overlay');
    const infoButton = slot.querySelector('.card-info-btn');
    const info = slot.querySelector('.card-info');

    slot.classList.toggle('taken', taken);
    slot.classList.toggle('other-player', otherPlayer);
    button.disabled = taken
      ? !purchasedByActivePlayer
      : !check.ok;
    button.title = taken
      ? purchasedByActivePlayer
        ? cancelCheck.ok
          ? 'Click to cancel your purchase'
          : reasonLabel(cancelCheck.reason)
        : `Purchased by P${purchaserIndex + 1}`
      : otherPlayer
        ? `Only Player ${owner + 1} can take this`
        : check.ok
          ? 'Purchase'
          : reasonLabel(check.reason);
    overlay.hidden = !taken;
    overlay.textContent = taken
      ? `PURCHASED (P${purchaserIndex + 1})`
      : 'PURCHASED';
    infoButton.disabled = taken;
    if (taken) {
      info.hidden = true;
      infoButton.textContent = '?';
      infoButton.setAttribute('aria-expanded', 'false');
    }
  });

  renderActivePlayerButtons();

  if (active.remaining === 0) {
    dom.activeHint.textContent = `Player ${state.activePlayer + 1}: purchase limit reached.`;
  } else if (active.cursedChosen && active.cursedCard?.id === 'cursed-choices') {
    dom.activeHint.textContent = 'Cursed Choices bonus active.';
  } else {
    dom.activeHint.textContent = 'Click a card to select it.';
  }
}

function startNewSession() {
  state.session = createSession({ numPlayers: state.numPlayers });
  state.activePlayer = Math.min(state.activePlayer, state.numPlayers - 1);

  renderPlayerSelector();
  renderBoards();
  updateBoardStates();
}

function handleBuy(event) {
  const button = event.target.closest('button[data-source]');
  if (!button || button.disabled) return;

  const source = button.dataset.source;
  const playerIndex = state.activePlayer;
  const uid = button.dataset.uid;
  const purchaserIndex = state.session.purchases.findIndex((list) =>
    list.some((item) => item.source === source && item.uid === uid),
  );

  if (purchaserIndex !== -1) {
    if (purchaserIndex !== playerIndex) return;
    const result = cancelPurchase(state.session, playerIndex, source, uid);
    updateBoardStates();
    if (!result.ok) dom.activeHint.textContent = reasonLabel(result.reason);
    return;
  }

  const result = purchase(state.session, playerIndex, source, uid);
  if (!result.ok) return;

  updateBoardStates();
}

dom.drawBtn.addEventListener('click', () => startNewSession());
dom.resetBtn.addEventListener('click', () => {
  resetChoices(state.session);
  updateBoardStates();
});
dom.wareBoard.addEventListener('click', handleBuy);

dom.appVersion.textContent = `v${APP_VERSION}`;
startNewSession();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.error('Could not register the app service worker:', error);
    });
  });
}
