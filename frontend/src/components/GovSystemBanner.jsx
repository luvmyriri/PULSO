import React, { useState, useEffect } from 'react';
import {
    WifiOff,
    ShieldAlert,
    AlertTriangle,
    Clock3,
    RefreshCw,
    X,
} from '../icons';
import './gov-system-banner.css';

const STATE_CONFIGS = {
    offline: {
        title: 'Offline mode active',
        message: 'You are viewing cached local records. Edits and updates will be queued for synchronization.',
        icon: WifiOff,
        actionLabel: 'Check connection',
        role: 'alert',
        ariaLive: 'assertive',
        defaultDismissible: true,
        classNameModifier: 'gov-system-banner--offline',
    },
    permission_changed: {
        title: 'Operational permissions updated',
        message: 'Your operational scope or role permissions have been updated by an administrator.',
        icon: ShieldAlert,
        actionLabel: 'Refresh session',
        role: 'status',
        ariaLive: 'polite',
        defaultDismissible: true,
        classNameModifier: 'gov-system-banner--permission-changed',
    },
    emergency_access: {
        title: 'EMERGENCY ACCESS ACTIVE',
        message: 'Elevated override capabilities engaged. All actions are immutably logged to the executive audit trail.',
        icon: AlertTriangle,
        actionLabel: 'Exit emergency mode',
        role: 'alert',
        ariaLive: 'assertive',
        defaultDismissible: false,
        classNameModifier: 'gov-system-banner--emergency-access',
    },
    partial_data: {
        title: 'Partial data cached',
        message: 'Displaying cached data. Real-time updates temporarily unavailable.',
        icon: Clock3,
        actionLabel: 'Force refresh',
        role: 'status',
        ariaLive: 'polite',
        defaultDismissible: true,
        classNameModifier: 'gov-system-banner--partial-data',
    },
};

export default function GovSystemBanner({
    type,
    title,
    message,
    icon: CustomIcon,
    actionLabel,
    onAction,
    onDismiss,
    dismissible,
    timestamp,
    autoOffline = false,
    className = '',
}) {
    const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (!autoOffline) return;

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => {
            setIsOnline(false);
            setDismissed(false); // Re-open on offline transition
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [autoOffline]);

    // Determine effective active type
    const effectiveType = autoOffline && !isOnline ? 'offline' : type;

    if (!effectiveType || dismissed) {
        return null;
    }

    const config = STATE_CONFIGS[effectiveType] || STATE_CONFIGS.partial_data;
    const IconComponent = CustomIcon || config.icon || RefreshCw;
    const bannerTitle = title ?? config.title;
    const bannerMessage = message ?? config.message;
    const effectiveActionLabel = actionLabel ?? config.actionLabel;
    const isDismissible = dismissible !== undefined ? dismissible : config.defaultDismissible;

    const handleDismiss = () => {
        setDismissed(true);
        if (onDismiss) onDismiss();
    };

    const handleActionClick = () => {
        if (onAction) {
            onAction();
        } else if (effectiveType === 'offline') {
            setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
        } else if (effectiveType === 'permission_changed') {
            window.location.reload();
        }
    };

    return (
        <aside
            className={`gov-system-banner ${config.classNameModifier} ${className}`.trim()}
            role={config.role}
            aria-live={config.ariaLive}
        >
            <div className="gov-system-banner__content">
                <div className="gov-system-banner__icon" aria-hidden="true">
                    <IconComponent size={16} strokeWidth={2} />
                </div>
                <div className="gov-system-banner__text">
                    <strong className="gov-system-banner__title">{bannerTitle}</strong>
                    <span className="gov-system-banner__message">{bannerMessage}</span>
                    {timestamp && (
                        <span className="gov-system-banner__timestamp">
                            {timestamp}
                        </span>
                    )}
                </div>
            </div>

            <div className="gov-system-banner__actions">
                {(effectiveActionLabel || onAction) && (
                    <button
                        type="button"
                        className="gov-system-banner__btn-action"
                        onClick={handleActionClick}
                    >
                        {effectiveActionLabel}
                    </button>
                )}
                {isDismissible && (
                    <button
                        type="button"
                        className="gov-system-banner__btn-dismiss"
                        onClick={handleDismiss}
                        aria-label="Dismiss system notification"
                    >
                        <X size={15} aria-hidden="true" />
                    </button>
                )}
            </div>
        </aside>
    );
}
