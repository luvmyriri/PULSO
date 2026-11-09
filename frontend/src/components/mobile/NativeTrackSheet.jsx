import { useId, useLayoutEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TrackReportContent, TrackReportHeading } from '../../pages/PublicTrackPage';
import './native-track-sheet.css';

export default function NativeTrackSheet({ onDismiss }) {
  const { t } = useTranslation();
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
    dialog.current.style.setProperty('--track-sheet-offset', `${offset}px`);
  }

  function endDrag(event) {
    if (drag.current?.pointerId !== event.pointerId) return;
    const dismiss = event.type === 'pointerup' && event.clientY - drag.current.startY >= 72;
    drag.current = null;
    dialog.current.style.removeProperty('--track-sheet-offset');
    if (dismiss) onDismiss();
  }

  return (
    <dialog ref={dialog} className="native-track-sheet" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
      onCancel={event => { event.preventDefault(); onDismiss(); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const panel = event.currentTarget.getBoundingClientRect();
        if (event.clientY < panel.top || event.clientY >= panel.bottom ||
          event.clientX < panel.left || event.clientX >= panel.right) onDismiss();
      }}>
      <header className="native-track-sheet__header">
        <div className="native-track-sheet__grab" aria-hidden="true"
          onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag}
          onPointerCancel={endDrag} onLostPointerCapture={endDrag}>
          <span />
        </div>
        <TrackReportHeading as="h2" titleId={`${id}-title`} descriptionId={`${id}-description`} titleRef={heading} />
        <button type="button" data-native-dismiss className="native-track-sheet__close"
          aria-label={t('track.lookup.closeSheet')} onClick={onDismiss}>
          <X size={18} aria-hidden="true" />
        </button>
      </header>
      <div className="native-track-sheet__body">
        <TrackReportContent inSheet />
      </div>
    </dialog>
  );
}
