import {
  DEFAULT_SETTINGS,
  SETTING_OPTIONS,
  maxChoicesPerPlayer,
  readSettings,
  saveSettings,
} from './config.js';
import { renderSiteFooter } from './footer.js';

const form = document.getElementById('settings-form');
const status = document.getElementById('settings-status');
const cursedChoicesTrigger = document.getElementById('cursed-choices-preview-trigger');
const cursedChoicesPreview = document.getElementById('cursed-choices-preview');
const fields = {
  standardPerPlayer: document.getElementById('standard-per-player'),
  cursedPerPlayer: document.getElementById('cursed-per-player'),
  choicesPerPlayer: document.getElementById('choices-per-player'),
};
const choiceValidation = document.getElementById('choices-validation');

function setCursedChoicesPreview(visible) {
  cursedChoicesPreview.hidden = !visible;
  cursedChoicesTrigger.setAttribute('aria-expanded', String(visible));
}

[
  ['pointerenter', true],
  ['pointerleave', false],
  ['pointerdown', true],
  ['pointerup', false],
  ['pointercancel', false],
  ['focus', true],
  ['blur', false],
].forEach(([eventName, visible]) => {
  cursedChoicesTrigger.addEventListener(eventName, () =>
    setCursedChoicesPreview(visible),
  );
});

function populate(settings) {
  Object.entries(fields).forEach(([key, field]) => {
    field.replaceChildren(
      ...SETTING_OPTIONS[key].map((value) => {
        const option = document.createElement('option');
        option.value = String(value);
        option.textContent = String(value);
        return option;
      }),
    );
    field.value = String(settings[key]);
  });
  updateChoiceOptions();
}

function updateChoiceOptions() {
  const maxChoices = maxChoicesPerPlayer({
    standardPerPlayer: Number(fields.standardPerPlayer.value),
  });
  const options = [...fields.choicesPerPlayer.options];
  options.forEach((option) => {
    option.disabled = Number(option.value) > maxChoices;
  });

  if (Number(fields.choicesPerPlayer.value) > maxChoices) {
    fields.choicesPerPlayer.value = String(maxChoices);
    choiceValidation.textContent =
      `The purchase limit was adjusted to ${maxChoices}; with this Standard setting, ` +
      `one Cursed ware allows up to ${maxChoices} choices.`;
    return;
  }

  choiceValidation.textContent =
    `The purchase limit can be at most ${maxChoices}: ` +
    `${fields.standardPerPlayer.value} Standard wares plus one Cursed ware.`;
}

function readForm() {
  return Object.fromEntries(
    Object.entries(fields).map(([key, field]) => [key, Number(field.value)]),
  );
}

function persist(settings, successMessage) {
  try {
    saveSettings(settings);
    status.textContent = successMessage;
  } catch (error) {
    console.error('Could not save game settings:', error);
    status.textContent = 'Could not save settings. Check browser storage permissions.';
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  persist(readForm(), 'Settings saved on this device.');
});

fields.standardPerPlayer.addEventListener('change', updateChoiceOptions);

document.getElementById('reset-settings-btn').addEventListener('click', () => {
  populate(DEFAULT_SETTINGS);
  persist(DEFAULT_SETTINGS, 'Default settings restored.');
});

populate(readSettings());
renderSiteFooter();
