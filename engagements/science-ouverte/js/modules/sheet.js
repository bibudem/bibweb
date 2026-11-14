// Panneau de détail d’un thème (<dialog> modal).
// Ouverture : la tuile grandit jusqu’à devenir le panneau (clip-path animé sur un ressort) et son icône s’envole.
// Fermeture : chemin inverse vers la tuile, ou glissement par le bord si la tuile est hors écran.
// Mobile : feuille glissable vers le bas, suivi 1:1 du doigt, fermeture à la distance ou à la vitesse.
import { $, root } from '../lib/dom.js';
import { EASE_OUT, SPRING_CLOSE, SPRING_OPEN, prefersReducedMotion } from '../lib/motion.js';

const TILE_RADIUS = '4px';

const clipFor = (rect, radius) =>
  `inset(${rect.top}px ${innerWidth - rect.right}px ${innerHeight - rect.bottom}px ${rect.left}px round ${radius})`;
const isOnScreen = (rect) => rect.bottom > 0 && rect.top < innerHeight && rect.width > 0;
const lockScroll = (locked) => { root.style.overflow = locked ? 'hidden' : ''; };

export function createSheet() {
  const sheet = $('.sheet');
  const panel = $('.sheet-panel', sheet);
  const body = $('.sheet-body', sheet);
  const icon = $('.sheet-title .icon', sheet);
  const titleBlock = $('.sheet-title', sheet);
  const title = $('#sheet-title', sheet);
  const kicker = $('.sheet-kicker span', sheet);
  const prevButton = $('.sheet-nav.prev', sheet);
  const nextButton = $('.sheet-nav.next', sheet);
  const morph = $('.sheet-morph', sheet);
  const scrim = $('.sheet-scrim', sheet);
  const grab = $('.sheet-grab', sheet);
  const foot = $('.sheet-foot', sheet);

  let group = [];
  let index = 0;
  let running = [];
  let hiddenTile = null;
  let openedByKeyboard = false;

  // --- Contenu ---------------------------------------------------------------
  const fill = (entry) => {
    // Le panneau vit hors des piliers : il reprend explicitement les couleurs du pilier ouvert.
    const style = getComputedStyle(entry.panel);
    sheet.style.setProperty('--pilier', style.getPropertyValue('--pilier'));
    sheet.style.setProperty('--pilier-ink', style.getPropertyValue('--pilier-ink'));
    kicker.textContent = entry.pilier;
    icon.innerHTML = entry.card.querySelector('.icon').innerHTML;
    title.textContent = entry.card.querySelector('.card-title').textContent;
    body.replaceChildren(entry.card.cloneNode(true));
    body.scrollTop = 0;
    const prev = group[index - 1];
    const next = group[index + 1];
    prevButton.disabled = !prev;
    nextButton.disabled = !next;
    prevButton.querySelector('span').textContent = prev?.tile.querySelector('.tile-title').textContent ?? '';
    nextButton.querySelector('span').textContent = next?.tile.querySelector('.tile-title').textContent ?? '';
  };

  // --- Utilitaires d’animation -------------------------------------------------
  const settle = () => {
    const current = running;
    running = [];
    for (const animation of current) { animation.finish(); animation.cancel(); }
  };
  const showTile = () => { if (hiddenTile) hiddenTile.style.opacity = ''; hiddenTile = null; };
  const hideTile = (tile) => { showTile(); hiddenTile = tile; tile.style.opacity = '0'; };

  // --- Ouverture -----------------------------------------------------------------
  function open({ entry, group: entries, keyboard = false }) {
    openedByKeyboard = keyboard;
    group = entries;
    index = group.indexOf(entry);
    fill(entry);
    sheet.classList.remove('closing');
    sheet.showModal();
    lockScroll(true);

    if (prefersReducedMotion()) {
      requestAnimationFrame(() => sheet.classList.add('open'));
      return;
    }

    const { tile } = entry;
    sheet.classList.add('morph', 'open');

    // Toutes les mesures avant de lancer la moindre animation.
    const from = tile.getBoundingClientRect();
    const to = panel.getBoundingClientRect();
    const toRadius = getComputedStyle(panel).borderRadius;
    const tileBg = getComputedStyle(tile).backgroundColor;
    const panelBg = getComputedStyle(panel).backgroundColor;
    const tileIcon = tile.querySelector('.icon');
    const iconFrom = tileIcon.getBoundingClientRect();
    const iconTo = icon.getBoundingClientRect();
    hideTile(tile);

    const contentDelay = SPRING_OPEN.duration * 0.42;
    running = [
      morph.animate(
        [{ clipPath: clipFor(from, TILE_RADIUS), backgroundColor: tileBg }, { clipPath: clipFor(to, toRadius), backgroundColor: panelBg }],
        { ...SPRING_OPEN, fill: 'both' },
      ),
      scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out', fill: 'both' }),
      panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay: contentDelay, easing: 'ease-out', fill: 'both' }),
      ...[grab, body, foot].map((el, i) => el.animate(
        [{ transform: 'translateY(14px)', filter: 'blur(4px)' }, { transform: 'none', filter: 'blur(0)' }],
        { duration: 460, delay: contentDelay + i * 45, easing: EASE_OUT, fill: 'both' },
      )),
    ];

    // L’icône de la tuile s’envole jusqu’à l’en-tête du panneau.
    const flyer = tileIcon.cloneNode(true);
    flyer.classList.add('sheet-fly');
    Object.assign(flyer.style, {
      left: `${iconTo.left}px`, top: `${iconTo.top}px`, width: `${iconTo.width}px`, height: `${iconTo.height}px`,
    });
    sheet.append(flyer);
    icon.style.visibility = 'hidden';
    running.push(flyer.animate(
      [
        { transform: `translate(${iconFrom.left - iconTo.left}px, ${iconFrom.top - iconTo.top}px) scale(${iconFrom.width / iconTo.width})` },
        { transform: 'none' },
      ],
      { ...SPRING_OPEN, fill: 'both' },
    ));

    const batch = running;
    Promise.all(batch.map((a) => a.finished)).catch(() => {}).then(() => {
      if (running !== batch) return; // interrompu par une fermeture
      flyer.remove();
      icon.style.visibility = '';
      for (const animation of batch) animation.cancel();
      sheet.classList.remove('morph');
      running = [];
    });
  }

  // --- Fermeture -----------------------------------------------------------------
  function close({ slide = false } = {}) {
    if (!sheet.open || sheet.classList.contains('closing')) return;
    settle();
    for (const flyer of sheet.querySelectorAll('.sheet-fly')) flyer.remove();
    icon.style.visibility = '';
    sheet.classList.remove('morph');

    const target = group[index]?.tile;
    const targetRect = target?.getBoundingClientRect();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      sheet.close();
      sheet.classList.remove('closing', 'open', 'morph');
      showTile();
      // Safari ne donne pas le focus aux boutons cliqués : le dialog le rendrait au pilier (tabindex=0),
      // qui s’afficherait encadré. Au clavier, on revient sur la tuile du thème affiché ; à la souris, on le retire.
      if (openedByKeyboard) target?.focus({ preventScroll: true });
      else document.activeElement?.blur();
      lockScroll(false);
      running = [];
    };

    // Glissé du doigt, tuile hors écran ou mouvement réduit : sortie par le même chemin qu’à l’arrivée.
    if (prefersReducedMotion() || slide || !targetRect || !isOnScreen(targetRect)) {
      sheet.classList.add('closing');
      sheet.classList.remove('open');
      panel.style.transform = '';
      setTimeout(finish, prefersReducedMotion() ? 200 : 420); // filet de sécurité
      const onEnd = (event) => {
        if (event.target !== panel) return; // ignorer les transitions des éléments enfants
        panel.removeEventListener('transitionend', onEnd);
        finish();
      };
      panel.addEventListener('transitionend', onEnd);
      return;
    }

    // Retour vers la tuile du thème affiché.
    sheet.classList.add('closing', 'morph');
    if (hiddenTile !== target) hideTile(target);
    const from = panel.getBoundingClientRect();
    running = [
      panel.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 130, easing: 'ease-in', fill: 'both' }),
      scrim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: SPRING_CLOSE.duration * 0.8, easing: 'ease-out', fill: 'both' }),
      morph.animate(
        [
          { clipPath: clipFor(from, getComputedStyle(panel).borderRadius), backgroundColor: getComputedStyle(panel).backgroundColor },
          { clipPath: clipFor(targetRect, TILE_RADIUS), backgroundColor: getComputedStyle(target).backgroundColor },
        ],
        { ...SPRING_CLOSE, fill: 'both' },
      ),
    ];
    const batch = running;
    const cleanUp = () => { for (const animation of batch) animation.cancel(); finish(); };
    batch.at(-1).finished.catch(() => {}).then(cleanUp);
    setTimeout(() => { if (!done) cleanUp(); }, SPRING_CLOSE.duration + 200);
  }

  // --- Navigation entre thèmes ---------------------------------------------------
  const go = (direction) => {
    const entry = group[index + direction];
    if (!entry) return;
    index += direction;
    if (prefersReducedMotion()) return fill(entry);
    const targets = [body, titleBlock];
    const out = targets.map((el) => el.animate(
      [{ opacity: 1, filter: 'blur(0)', transform: 'none' }, { opacity: 0, filter: 'blur(4px)', transform: `translateX(${-direction * 14}px)` }],
      { duration: 120, easing: 'ease-in', fill: 'forwards' },
    ));
    out[0].finished.then(() => {
      fill(entry);
      for (const el of targets) {
        el.animate(
          [{ opacity: 0, filter: 'blur(4px)', transform: `translateX(${direction * 14}px)` }, { opacity: 1, filter: 'blur(0)', transform: 'none' }],
          { duration: 240, easing: EASE_OUT, fill: 'forwards' },
        );
      }
    });
  };

  prevButton.addEventListener('click', () => go(-1));
  nextButton.addEventListener('click', () => go(1));
  sheet.addEventListener('keydown', (event) => {
    if (event.target.closest('.sheet-body')) return;
    if (event.key === 'ArrowRight') go(1);
    if (event.key === 'ArrowLeft') go(-1);
  });
  sheet.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
  for (const el of sheet.querySelectorAll('[data-close]')) el.addEventListener('click', () => close());

  // --- Glisser pour fermer (mobile) ------------------------------------------------
  const mobile = matchMedia('(max-width: 720px)');
  let drag = null;

  grab.addEventListener('pointerdown', (event) => {
    if (!mobile.matches || event.target.closest('button') || drag) return;
    grab.setPointerCapture(event.pointerId);
    drag = { id: event.pointerId, startY: event.clientY, startTime: performance.now(), dy: 0, height: panel.offsetHeight };
    sheet.classList.add('dragging');
  });
  grab.addEventListener('pointermove', (event) => {
    if (drag?.id !== event.pointerId) return;
    const raw = event.clientY - drag.startY;
    // Vers le bas : suivi 1:1. Vers le haut : résistance croissante (rubber band).
    drag.dy = raw >= 0 ? raw : -(Math.abs(raw) * 40) / (40 + Math.abs(raw));
    panel.style.transform = `translateY(${drag.dy}px)`;
  });
  const endDrag = (event) => {
    if (drag?.id !== event.pointerId) return;
    const velocity = drag.dy / (performance.now() - drag.startTime);
    const shouldClose = drag.dy > drag.height * 0.28 || velocity > 0.11;
    sheet.classList.remove('dragging');
    drag = null;
    if (shouldClose) close({ slide: true });
    else panel.style.transform = '';
  };
  grab.addEventListener('pointerup', endDrag);
  grab.addEventListener('pointercancel', endDrag);

  return { open, close };
}
