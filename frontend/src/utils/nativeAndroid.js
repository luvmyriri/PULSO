import { useEffect, useRef } from 'react';
import { isNativeAndroid } from './appContext';

const handlers = new Set();

export function useAndroidBack(enabled, priority, onBack) {
  const callback = useRef(onBack);
  useEffect(() => { callback.current = onBack; }, [onBack]);
  useEffect(() => {
    if (!enabled || !isNativeAndroid()) return;
    const entry = { priority, back: () => callback.current() };
    handlers.add(entry);
    return () => { handlers.delete(entry); };
  }, [enabled, priority]);
}

function dialogLayer(element) {
  let highest = 0;
  for (let node = element; node; node = node.parentElement) {
    highest = Math.max(highest, Number.parseInt(getComputedStyle(node).zIndex, 10) || 0);
  }
  return highest;
}

export function dismissAndroidLayer() {
  const ordered = [...handlers].reverse().sort((a, b) => b.priority - a.priority);
  if (ordered.some((entry) => entry.priority > 0 && entry.back() !== false)) return true;

  const dialogs = [...document.querySelectorAll('[role="dialog"][aria-modal="true"], dialog[open]')]
    .reverse()
    .filter((dialog) => dialog.getClientRects().length && !dialog.closest('[inert], [aria-hidden="true"]'))
    .sort((a, b) => dialogLayer(b) - dialogLayer(a));
  if (dialogs.length) {
    const close = dialogs[0].querySelector(
      '[data-native-dismiss]:not([disabled]), button[aria-label^="Close" i]:not([disabled]), button[aria-label^="Isara" i]:not([disabled])',
    );
    close?.click();
    return true;
  }
  return ordered.some((entry) => entry.priority <= 0 && entry.back() !== false);
}
