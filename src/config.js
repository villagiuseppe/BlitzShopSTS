export const DEFAULT_SETTINGS = Object.freeze({
  standardPerPlayer: 2,
  cursedPerPlayer: 1,
  choicesPerPlayer: 2,
});

export const SETTING_OPTIONS = Object.freeze({
  standardPerPlayer: [2, 3, 4],
  cursedPerPlayer: [1, 2],
  choicesPerPlayer: [2, 3, 4],
});

export function maxChoicesPerPlayer(settings) {
  return Math.min(4, Number(settings.standardPerPlayer) + 1);
}

const COOKIE_NAME = 'blitz-shop-settings';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const STORAGE_KEY = 'blitz-shop-settings';

export function normalizeSettings(value = {}) {
  const settings = Object.fromEntries(
    Object.entries(DEFAULT_SETTINGS).map(([key, defaultValue]) => {
      const candidate = Number(value[key]);
      return [
        key,
        SETTING_OPTIONS[key].includes(candidate) ? candidate : defaultValue,
      ];
    }),
  );
  settings.choicesPerPlayer = Math.min(
    settings.choicesPerPlayer,
    maxChoicesPerPlayer(settings),
  );
  return settings;
}

export function readSettings() {
  const cookie = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${COOKIE_NAME}=`));
  if (cookie) {
    try {
      return normalizeSettings(
        JSON.parse(decodeURIComponent(cookie.slice(COOKIE_NAME.length + 1))),
      );
    } catch (error) {
      console.warn('Could not parse saved settings cookie:', error);
    }
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return normalizeSettings(JSON.parse(stored));
  } catch (error) {
    console.warn('Could not read saved settings from local storage:', error);
  }

  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(value) {
  const settings = normalizeSettings(value);
  const serialized = JSON.stringify(settings);
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(
    serialized,
  )}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;

  const cookieSaved = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .some((entry) => entry === `${COOKIE_NAME}=${encodeURIComponent(serialized)}`);

  try {
    if (cookieSaved) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, serialized);
    }
  } catch (error) {
    if (!cookieSaved) {
      throw new Error('Settings could not be saved in browser storage.');
    }
    console.warn('Could not clear the local settings fallback:', error);
  }

  return settings;
}
