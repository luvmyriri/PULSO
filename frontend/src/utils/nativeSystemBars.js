import { registerPlugin } from '@capacitor/core';

const Appearance = registerPlugin('PulsoAppearance');

/** Draw the native landing and guide behind the Android system bars. */
export function syncNativeSystemBars(fallbackColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  let frame = null;
  let previousColors = '';
  let stopped = false;

  const elementColor = (element) => {
    const layers = [];
    for (let layer = element; layer; layer = layer.parentElement) {
      layers.push(getComputedStyle(layer).backgroundColor);
    }
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = fallbackColor;
    context.fillRect(0, 0, 1, 1);
    for (const color of layers.reverse()) {
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
    }
    const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
    return '#' + [red, green, blue].map(value => value.toString(16).padStart(2, '0')).join('');
  };

  const update = () => {
    if (stopped) return;
    const immersive = Boolean(document.querySelector('[data-native-camera]'));
    const edgeToEdge = immersive || Boolean(document.querySelector('[data-native-splash], [data-native-resident-landing], [data-native-guide], [data-native-dashboard-home]'));
    const pageSurface = [...document.querySelectorAll('[data-native-system-bar-surface]')]
      .filter(element => element.getClientRects().length).at(-1);
    // Scrolling report cards and action buttons must not recolor the status bar.
    const homeSurface = document.querySelector('[data-native-home-status-surface]');
    const topElement = !immersive && homeSurface ? homeSurface
      : !edgeToEdge && pageSurface ? pageSurface : document.elementFromPoint(window.innerWidth / 2, 1);
    const topColor = elementColor(topElement);
    const bottomColor = elementColor(document.elementFromPoint(window.innerWidth / 2, window.innerHeight - 1));
    const colors = topColor + bottomColor + edgeToEdge + immersive;
    if (colors === previousColors) return;
    previousColors = colors;
    void Appearance.setSystemBars({ topColor, bottomColor, edgeToEdge, immersive }).catch((error) => {
      previousColors = '';
      console.warn('Unable to update Android system bars', error);
    });
  };
  const schedule = () => {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      update();
    });
  };
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'data-theme'],
  });
  document.addEventListener('scroll', schedule, { capture: true, passive: true });
  document.addEventListener('transitionend', schedule, true);
  document.addEventListener('animationend', schedule, true);
  window.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  schedule();
  return () => {
    stopped = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    document.removeEventListener('scroll', schedule, true);
    document.removeEventListener('transitionend', schedule, true);
    document.removeEventListener('animationend', schedule, true);
    window.removeEventListener('resize', schedule);
    window.visualViewport?.removeEventListener('resize', schedule);
  };
}
