/**
 * Definizione delle 20 tipologie di carte "Merce" del Mercante (Blitz Mode).
 *
 * Fonte: regole_estrazione_mercante.txt
 *  - Mazzo Standard: 12 tipologie uniche, 16 carte fisiche (4 tipologie in doppia copia).
 *  - Mazzo Maledetto: 8 tipologie uniche, 8 carte fisiche (sempre 1 copia).
 *
 * Il campo `image` contiene SOLO il nome del file: il percorso relativo completo
 * viene costruito da `imagePath()` in modo che funzioni sia in locale sia su
 * GitHub Pages (compresi i nomi con spazi).
 */

const IMAGE_BASE = './assets/images/';

/** Costruisce un URL relativo e codificato per l'immagine di una carta. */
export function imagePath(fileName) {
  return IMAGE_BASE + encodeURIComponent(fileName);
}

/** Le 12 tipologie del Mazzo Standard. `copie` agisce da peso statistico. */
export const STANDARD_CARDS = [
  {
    id: 'card-removal',
    nome: 'Card Removal Service',
    effetto: 'Remove a card.',
    copie: 2,
    image: 'Card Removal.png',
  },
  {
    id: 'card-transform',
    nome: 'Card Transform Service',
    effetto: 'Transform a card.',
    copie: 1,
    image: 'Card Transform.png',
  },
  {
    id: 'card-upgrade',
    nome: 'Card Upgrade Service',
    effetto: 'Upgrade a card of your choice.',
    copie: 1,
    image: 'Card Upgrade.png',
  },
  {
    id: 'random-upgrades',
    nome: 'Random Upgrades',
    effetto: 'Upgrade 2 random cards.',
    copie: 1,
    image: 'Random Upgrades.png',
  },
  {
    id: 'potions',
    nome: 'Potions',
    effetto: 'Gain 2 potions.',
    copie: 2,
    image: 'Potions.png',
  },
  {
    id: 'relic',
    nome: 'Relic',
    effetto: 'Gain 1 random relic.',
    copie: 2,
    image: 'Relic.png',
  },
  {
    id: 'card-rewards',
    nome: 'Card Rewards',
    effetto: 'Receive 2 card rewards.',
    copie: 1,
    image: 'Card Rewards.png',
  },
  {
    id: 'upgraded-card-reward',
    nome: 'Upgraded Card Reward',
    effetto: 'Receive 1 upgraded card reward.',
    copie: 1,
    image: 'Upgraded Card Reward.png',
  },
  {
    id: 'colorless-reward',
    nome: 'Colorless Reward',
    effetto: 'Receive 1 colorless card reward.',
    copie: 2,
    image: 'Colorless Reward.png',
  },
  {
    id: 'prismatic-card-reward',
    nome: 'Prismatic Card Reward',
    effetto: 'Receive 1 card reward from another character of your choice.',
    copie: 1,
    image: 'Prismatic Card Reward.png',
  },
  {
    id: 'rare-card-reward',
    nome: 'Rare Card Reward',
    effetto: 'Receive 1 rare card reward.',
    copie: 1,
    image: 'Rare Card Reward.png',
  },
  {
    id: 'random-upgraded-rare',
    nome: 'Random Upgraded Rare',
    effetto: 'Receive 1 random upgraded rare card.',
    copie: 1,
    image: 'Random Upgraded Rare.png',
  },
];

/** Le 8 tipologie del Mazzo Maledetto (una copia ciascuna). */
export const CURSED_CARDS = [
  {
    id: 'cursed-relics',
    nome: 'Cursed Relics',
    effetto: 'Obtain 2 random relics (+ 1 random curse).',
    copie: 1,
    image: 'Cursed Relics.png',
  },
  {
    id: 'cursed-heal',
    nome: 'Cursed Heal',
    effetto: 'Restore 1 lost Max HP, then heal to full HP (+ 1 random curse).',
    copie: 1,
    image: 'Cursed Heal.png',
  },
  {
    id: 'cursed-card-rewards',
    nome: 'Cursed Card Rewards',
    effetto: 'Receive 2 card rewards and 1 rare card reward (+ 1 random curse).',
    copie: 1,
    image: 'Cursed Card Rewards.png',
  },
  {
    // Nel testo originale: "updated rare card reward"; file immagine: "Cursed Rare Reward.png".
    id: 'cursed-upgraded-rare',
    nome: 'Cursed Upgraded Rare Card Reward',
    effetto: 'Receive 1 upgraded rare card reward (+ 1 random curse).',
    copie: 1,
    image: 'Cursed Rare Reward.png',
  },
  {
    id: 'cursed-upgrades',
    nome: 'Cursed Upgrades',
    effetto: 'Upgrade 2 cards of your choice (+ 1 random curse).',
    copie: 1,
    image: 'Cursed Upgrades.png',
  },
  {
    id: 'cursed-choices',
    nome: 'Cursed Choices',
    effetto: 'You may purchase 2 more wares (+ 1 random curse).',
    copie: 1,
    image: 'Cursed Choices.png',
    extraPurchases: 2,
  },
  {
    id: 'cursed-transforms',
    nome: 'Cursed Transforms',
    effetto: 'Transform 2 cards (+ 1 random curse).',
    copie: 1,
    image: 'Cursed Transforms.png',
  },
  {
    id: 'cursed-prismatic-rare',
    nome: 'Cursed Prismatic Rare Reward',
    effetto: 'Receive 1 rare card from another character of your choice (+ 1 random curse).',
    copie: 1,
    image: 'Cursed Prismatic Reward.png',
  },
];

export const ALL_CARDS = [...STANDARD_CARDS, ...CURSED_CARDS];

export const CARD_BY_ID = Object.freeze(
  ALL_CARDS.reduce((acc, card) => {
    acc[card.id] = card;
    return acc;
  }, {}),
);

/** Costanti di regola, centralizzate per evitare valori "magici" nell'engine. */
export const RULES = Object.freeze({
  STANDARD_TOTAL: STANDARD_CARDS.reduce((sum, c) => sum + c.copie, 0), // 16
  CURSED_TOTAL: CURSED_CARDS.reduce((sum, c) => sum + c.copie, 0), // 8
  SOLO_STANDARD_REVEAL: 3,
  STANDARD_PER_PLAYER: 2,
  CURSED_PER_PLAYER: 1,
  BASE_PURCHASE_LIMIT: 2,
  CURSED_CHOICES_BONUS: 2,
  MIN_PLAYERS: 1,
  MAX_PLAYERS: 4,
});
