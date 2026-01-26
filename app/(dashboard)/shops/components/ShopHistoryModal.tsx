'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { createClient } from '@/utils/supabase/client';
import styles from './ShopsComponents.module.css';

interface ShopHistoryModalProps {
    isOpen: boolean;
    shop: any;
    onClose: () => void;
}

export function ShopHistoryModal({ isOpen, shop, onClose }: ShopHistoryModalProps) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        if (isOpen && shop) {
            fetchHistory();
        }
    }, [isOpen, shop]);

    const fetchHistory = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('shop_history')
            .select('*, changed_by_user:profiles!changed_by(full_name, email)')
            .eq('shop_id', shop.id)
            .order('created_at', { ascending: false });

        if (data) setHistory(data);
        setLoading(false);
    };

    const renderDetails = (action: string, details: any) => {
        if (!details || Object.keys(details).length === 0) return null;

        if (action === 'created') {
            return (
                <div>
                    Initial Setup: {details.name ? `Name: ${details.name}` : ''}
                </div>
            );
        }

        return Object.entries(details).map(([key, value]) => {
            if (value === undefined || value === null) return null;

            if (key === 'products') {
                const p = value as any;
                return (
                    <div key={key} style={{ marginTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.2rem' }}>
                        <strong>Products Updated:</strong>
                        {p.added && p.added.length > 0 && (
                            <div style={{ color: '#4ade80' }}>+ Added: {p.added.join(', ')}</div>
                        )}
                        {p.removed && p.removed.length > 0 && (
                            <div style={{ color: '#f87171' }}>- Removed: {p.removed.join(', ')}</div>
                        )}
                    </div>
                );
            }

            // Format key for display (e.g. owner_id -> Owner)
            const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

            // Special handling for long text
            if (key === 'note' && String(value).length > 50) {
                return (
                    <div key={key} style={{ marginTop: '0.2rem' }}>
                        • <strong>{displayKey}</strong> updated
                    </div>
                );
            }

            return (
                <div key={key}>
                    • <strong>{displayKey}</strong> to "{String(value)}"
                </div>
            );
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`History: ${shop?.name}`}>
            <div className={styles.historyList}>
                {loading ? <p className={styles.mutedText}>Loading history...</p> : history.length === 0 ? <p className={styles.mutedText}>No history found.</p> : (
                    history.map(h => (
                        <div key={h.id} className={styles.historyItem}>
                            <div className={styles.historyHeader}>
                                <span className={styles.historyAction}>{h.action}</span>
                                <span className={styles.historyDate}>{new Date(h.created_at).toLocaleString()}</span>
                            </div>
                            <div className={styles.historyUser}>
                                Changed by: {h.changed_by_user?.full_name || h.changed_by_user?.email || 'Unknown'}
                            </div>
                            {h.details && (
                                <div className={styles.mutedText} style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>
                                    {renderDetails(h.action, h.details)}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </Modal>
    );
}
