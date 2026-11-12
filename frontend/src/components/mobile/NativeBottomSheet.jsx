import { useId, useLayoutEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAndroidBack } from '../../utils/nativeAndroid';
import './native-resident-theme.css';
import './native-bottom-sheet.css';

export default function NativeBottomSheet({ title, description, closeLabel, onDismiss, children }) {
  const { isDark } = useTheme();
  useAndroidBack(true, 30, onDismiss);
  const id = useId();
  const dialog = useRef(null);
  const heading = useRef(null);
  const drag = useRef(null);

  useLayoutEffect(() => {
    const panel = dialog.current;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    panel.showModal();
    document.body.style.overflow = 'hidden';
    heading.current?.focus({ preventScroll: true });
    return () => {
      panel.close();
      document.body.style.overflow = previousOverflow;
      trigger?.focus({ preventScroll: true });
    };
  }, []);

  function startDrag(event) {
    if (!event.isPrimary || event.button !== 0) return;
    drag.current = { pointerId: event.pointerId, startY: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event) {
    if (drag.current?.pointerId !== event.pointerId) return;
    const offset = Math.max(0, event.clientY - drag.current.startY);
    dialog.current.style.setProperty('--bottom-sheet-offset', `${offset}px`);
  }

  function endDrag(event) {
    if (drag.current?.pointerId !== event.pointerId) return;
    const dismiss = event.type === 'pointerup' && event.clientY - drag.current.startY >= 72;
    drag.current = null;
    dialog.current.style.removeProperty('--bottom-sheet-offset');
    if (dismiss) onDismiss();
  }

  return (
    <dialog ref={dialog} className="native-bottom-sheet" data-landing-theme={isDark ? 'dark' : 'light'} aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
      onCancel={event => { event.preventDefault(); onDismiss(); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const panel = event.currentTarget.getBoundingClientRect();
        if (event.clientY < panel.top || event.clientY >= panel.bottom ||
          event.clientX < panel.left || event.clientX >= panel.right) onDismiss();
      }}>
      <header className="native-bottom-sheet__header">
        <div className="native-bottom-sheet__grab" aria-hidden="true"
          onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag}
          onPointerCancel={endDrag} onLostPointerCapture={endDrag}>
          <span />
        </div>
        <h2 id={`${id}-title`} ref={heading} tabIndex={-1} className="font-bold tracking-tight">{title}</h2>
        <p id={`${id}-description`} className="text-sm">{description}</p>
        <button type="button" data-native-dismiss className="native-bottom-sheet__close"
          aria-label={closeLabel} onClick={onDismiss}>
          <X size={18} aria-hidden="true" />
        </button>
      </header>
      <div className="native-bottom-sheet__body">
        {children}
      </div>
    </dialog>
  );
}
