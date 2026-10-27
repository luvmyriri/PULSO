import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { ID_PHOTO_CONTENT } from '../data/idPhotoStepContent';
import { useTheme } from '../contexts/ThemeContext';

/**
 * IDPhotoViewerModal
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen modal viewer for checking ID photo legibility.
 *
 * Features:
 * - Fitted to screen at 1x by default with correct proportions (not stretched or cropped).
 * - Tap / click to toggle zoom (1x <-> 2.5x).
 * - Pinch-to-zoom on touch screens & mouse drag pan when zoomed in.
 * - Dedicated zoom buttons (Zoom In, Zoom Out, Reset) at least 44x44px.
 * - Keyboard zoom (+, -, 0, Arrow keys to pan) and Escape to close.
 * - Focus trapping and programmatic focus return to the originating button.
 * - Hardware / browser Back button interception via history.pushState so
 *   pressing back closes ONLY the viewer without leaving Step 2.
 * - Theme-aware: light background in light mode (#F8FAFC / #F1F5F9), dark in dark mode (#080D19).
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function IDPhotoViewerModal({
  isOpen,
  onClose,
  imageUrl,
  title = 'Front of ID',
  altText = "Front of your Voter's ID",
  rotation = 0,
  triggerRef = null
}) {
  const themeContext = useTheme();
  const isDark = themeContext?.isDark ?? (typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const pinchStartDistRef = useRef(null);
  const initialPinchZoomRef = useRef(1);
  const lastTapTimeRef = useRef(0);

  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const isPushedHistoryRef = useRef(false);

  // Reset zoom & pan on open
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen, imageUrl]);

  // Lock background body scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Handle hardware / phone Back button so it closes ONLY the viewer
  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState({ pulsoViewerOpen: true }, '');
    isPushedHistoryRef.current = true;

    const handlePopState = () => {
      isPushedHistoryRef.current = false;
      onClose();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (isPushedHistoryRef.current && window.history.state?.pulsoViewerOpen) {
        window.history.back();
      }
    };
  }, [isOpen, onClose]);

  // Focus management: focus Close button on open, return to trigger on close
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
    } else if (triggerRef?.current) {
      triggerRef.current.focus();
    }
  }, [isOpen, triggerRef]);

  const handleClose = useCallback(() => {
    if (isPushedHistoryRef.current && window.history.state?.pulsoViewerOpen) {
      isPushedHistoryRef.current = false;
      window.history.back();
    }
    onClose();
  }, [onClose]);

  // Zoom handlers
  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(4, Number((prev + 0.5).toFixed(1))));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prev) => {
      const next = Math.max(1, Number((prev - 0.5).toFixed(1)));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const toggleZoom = useCallback(() => {
    if (zoom > 1) {
      resetZoom();
    } else {
      setZoom(2.5);
    }
  }, [zoom, resetZoom]);

  // Keyboard navigation (+, -, 0, Escape, Arrow keys, Focus trap)
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        resetZoom();
      } else if (zoom > 1) {
        const step = 40;
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setPan((p) => ({ ...p, x: p.x + step }));
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setPan((p) => ({ ...p, x: p.x - step }));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setPan((p) => ({ ...p, y: p.y + step }));
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setPan((p) => ({ ...p, y: p.y - step }));
        }
      }

      // Tab trap
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [handleClose, zoomIn, zoomOut, resetZoom, zoom]
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // Wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  };

  // Mouse pan handling
  const handleMouseDown = (e) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoom <= 1) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch pan & pinch handling
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapTimeRef.current < 300) {
        // Double-tap detected
        toggleZoom();
        lastTapTimeRef.current = 0;
        return;
      }
      lastTapTimeRef.current = now;

      if (zoom > 1) {
        setIsDragging(true);
        dragStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          panX: pan.x,
          panY: pan.y
        };
      }
    } else if (e.touches.length === 2) {
      // Two-finger pinch start
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      pinchStartDistRef.current = dist;
      initialPinchZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && isDragging && zoom > 1) {
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      setPan({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy
      });
    } else if (e.touches.length === 2 && pinchStartDistRef.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const scale = dist / pinchStartDistRef.current;
      const newZoom = Math.min(4, Math.max(1, Number((initialPinchZoomRef.current * scale).toFixed(2))));
      setZoom(newZoom);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    pinchStartDistRef.current = null;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${title} photo`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className={`fixed inset-0 z-[200] flex flex-col justify-between select-none touch-none h-[100dvh] w-full overflow-hidden transition-colors duration-150 ${
          isDark
            ? 'bg-[#080D19] text-white'
            : 'bg-[#F8FAFC] text-slate-900'
        }`}
        style={{
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))'
        }}
      >
        {/* ── HEADER: Title on left, Action buttons on right ── */}
        <header
          className={`w-full flex items-center justify-between h-14 shrink-0 px-2 sm:px-3 border-b transition-colors ${
            isDark
              ? 'border-slate-800/80 bg-[#080D19]'
              : 'border-slate-200 bg-white shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-2">
            <h2
              className={`text-base sm:text-lg font-bold tracking-tight truncate max-w-[200px] sm:max-w-xs ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              {title}
            </h2>
            {zoom > 1 && (
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums ${
                  isDark
                    ? 'bg-orange-500/20 text-[#ff8a3d] border border-orange-500/30'
                    : 'bg-orange-100 text-[#c2410c] border border-orange-200'
                }`}
              >
                {zoom}x
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Zoom Out Button */}
            <button
              type="button"
              onClick={zoomOut}
              disabled={zoom <= 1}
              aria-label={ID_PHOTO_CONTENT.buttons.zoomOut}
              className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl disabled:opacity-40 flex items-center justify-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] active:scale-95 border ${
                isDark
                  ? 'bg-slate-800/80 hover:bg-slate-700/80 text-white border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 shadow-2xs'
              }`}
            >
              <ZoomOut size={18} />
            </button>

            {/* Zoom In Button */}
            <button
              type="button"
              onClick={zoomIn}
              disabled={zoom >= 4}
              aria-label={ID_PHOTO_CONTENT.buttons.zoomIn}
              className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl disabled:opacity-40 flex items-center justify-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] active:scale-95 border ${
                isDark
                  ? 'bg-slate-800/80 hover:bg-slate-700/80 text-white border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 shadow-2xs'
              }`}
            >
              <ZoomIn size={18} />
            </button>

            {/* Reset Button */}
            <button
              type="button"
              onClick={resetZoom}
              disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
              aria-label={ID_PHOTO_CONTENT.buttons.reset}
              className={`min-w-[44px] min-h-[44px] px-2.5 h-11 rounded-xl disabled:opacity-40 flex items-center justify-center gap-1 text-xs font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] active:scale-95 border ${
                isDark
                  ? 'bg-slate-800/80 hover:bg-slate-700/80 text-white border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 shadow-2xs'
              }`}
            >
              <RotateCcw size={14} />
              <span className="hidden min-[380px]:inline">Reset</span>
            </button>

            {/* Close Button */}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={handleClose}
              aria-label={ID_PHOTO_CONTENT.buttons.close}
              className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-[#ff6b00] hover:bg-[#e65c00] text-white flex items-center justify-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b00] active:scale-95 shadow-sm ml-1"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* ── IMAGE VIEWING VIEWPORT ── */}
        <div
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`flex-1 w-full flex items-center justify-center overflow-hidden relative transition-colors ${
            isDark ? 'bg-[#080D19]' : 'bg-[#F1F5F9]'
          }`}
          style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in' }}
        >
          {imageUrl ? (
            <motion.div
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 150ms ease-out'
              }}
              className="relative max-w-full max-h-full flex items-center justify-center will-change-transform"
            >
              <img
                src={imageUrl}
                alt={altText}
                onClick={toggleZoom}
                draggable={false}
                className={`max-w-[92vw] max-h-[75vh] object-contain rounded-lg select-none transition-shadow ${
                  isDark
                    ? 'shadow-2xl'
                    : 'shadow-xl border border-slate-200/90'
                }`}
              />
            </motion.div>
          ) : (
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No image available.</p>
          )}
        </div>

        {/* ── FOOTER TIP ── */}
        <footer
          className={`w-full text-center py-2.5 shrink-0 border-t transition-colors ${
            isDark
              ? 'border-slate-800/80 bg-[#080D19]'
              : 'border-slate-200 bg-white shadow-2xs'
          }`}
        >
          <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            {zoom > 1
              ? ID_PHOTO_CONTENT.viewer.tapZoomOutTip
              : ID_PHOTO_CONTENT.viewer.tapZoomInTip}
          </p>
        </footer>
      </motion.div>
    </AnimatePresence>
  );
}
