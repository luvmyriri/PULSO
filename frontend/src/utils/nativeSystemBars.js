import { registerPlugin } from '@capacitor/core';

const Appearance = registerPlugin('PulsoAppearance');

/** Use true edge-to-edge on the native landing; retain safe native form insets elsewhere. */
export function syncNativeSystemBars(fallbackColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  let frame = null;
  let previousColors = '';
  let stopped = false;

  const edgeColor = (y) => {
    const layers = [];
    for (let element = document.elementFromPoint(window.innerWidth / 2, y); element; element = element.parentElement) {
      layers.push(getComputedStyle(element).backgroundColor);
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
    const topColor = edgeColor(1);
    const bottomColor = edgeColor(window.innerHeight - 1);
    const edgeToEdge = Boolean(document.querySelector('[data-native-resident-landing]'));
    const colors = topColor + bottomColor + edgeToEdge;
    if (colors === previousColors) return;
    previousColors = colors;
    void Appearance.setSystemBars({ topColor, bottomColor, edgeToEdge }).catch((error) => {
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
