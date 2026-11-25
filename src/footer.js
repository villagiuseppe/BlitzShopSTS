import { APP_VERSION } from './version.js';

function externalLink(href, text) {
  const link = document.createElement('a');
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = text;
  return link;
}

export function renderSiteFooter() {
  const footer = document.getElementById('site-footer');
  if (!footer) throw new Error('The shared site footer placeholder is missing.');

  const attributions = document.createElement('div');
  const gameAttribution = document.createElement('p');
  gameAttribution.append(
    'Fan Made companion app for ',
    externalLink(
      'https://contentiongames.com/games/slay/',
      'Slay the Spire: the Board Game',
    ),
  );
  const rulesAttribution = document.createElement('p');
  rulesAttribution.append(
    'Rules and card images sourced from the ',
    externalLink(
      'https://drive.google.com/drive/folders/13Fa5UFuRjoTlitsO4ygVTcCPuUwxH6xU',
      'Blitz Mode',
    ),
  );
  attributions.append(gameAttribution, rulesAttribution);

  const version = document.createElement('span');
  version.id = 'app-version';
  version.textContent = `v${APP_VERSION}`;
  footer.replaceChildren(attributions, version);
}
