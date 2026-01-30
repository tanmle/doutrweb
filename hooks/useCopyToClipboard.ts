'use client';

import { useCallback } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

/**
 * Hook for copying text to clipboard with toast notifications.
 * 
 * @returns Object with copyToClipboard function
 * 
 * @example
 * const { copyToClipboard } = useCopyToClipboard();
 * 
 * <button onClick={() => copyToClipboard('text to copy')}>
 *   Copy
 * </button>
 */
export function useCopyToClipboard() {
    const toast = useToast();

    const copyToClipboard = useCallback(
        async (text: string, successMessage: string = 'Copied to clipboard') => {
            if (!text) return;

            try {
                await navigator.clipboard.writeText(text);
                toast.success(successMessage);
            } catch (error) {
                console.error('Failed to copy to clipboard:', error);
                toast.error('Failed to copy to clipboard');
            }
        },
        [toast]
    );

    return { copyToClipboard };
}
