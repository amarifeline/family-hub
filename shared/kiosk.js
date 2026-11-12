/**
 * Family hub — gedrag op het keukenscherm.
 * - Geen menu bij lang drukken.
 * - In een app: na een tijdje niets doen vanzelf terug naar het startscherm.
 *   Zet data-terug="minuten" op <body> (standaard 3, 0 = nooit).
 */
(function () {
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  const home = document.body.dataset.home; // pad naar het startscherm, bv. "../"
  if (!home) return;
  const min = Number(document.body.dataset.terug || 3);
  if (!min) return;
  let t;
  const reset = () => { clearTimeout(t); t = setTimeout(() => { location.href = home; }, min * 60000); };
  ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, reset, { passive: true }));
  reset();
})();
