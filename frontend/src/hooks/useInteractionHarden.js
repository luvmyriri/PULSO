import { useState, useCallback, useRef } from 'react';

/**
 * useInteractionHarden - Hook to protect AI-driven components from rapid-fire interactions.
 */
export const useInteractionHarden = () => {
    const [isCooldown, setIsCooldown] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const cooldownTimer = useRef(null);
    const lastActionTime = useRef(0);

    /**
     * throttleAction - Prevents an action from firing more than once per interval.
     * @param {Function} action - The async function to execute.
     * @param {number} interval - Minimal time between calls in ms (default 3000ms).
     */
    const throttleAction = useCallback(async (action, interval = 3000) => {
        const now = Date.now();
        if (now - lastActionTime.current < interval) {
            console.warn('[HARDEN] Action throttled (too fast).');
            return false;
        }

        setIsProcessing(true);
        lastActionTime.current = now;
        
        try {
            await action();
            return true;
        } catch (error) {
            console.error('[HARDEN] Action failed:', error);
            throw error;
        } finally {
            setIsProcessing(false);
            // Trigger a short UI cooldown after successful completion
            startCooldown(1500); 
        }
    }, []);

    /**
     * startCooldown - Disables certain UI elements for a set duration.
     * @param {number} duration - Time in ms.
     */
    const startCooldown = useCallback((duration = 2000) => {
        if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
        setIsCooldown(true);
        cooldownTimer.current = setTimeout(() => {
            setIsCooldown(false);
        }, duration);
    }, []);

    return {
        isCooldown,
        isProcessing,
        throttleAction,
        startCooldown
    };
};
