'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { useToast } from '@/components/ui/ToastProvider';
import { createClient } from '@/utils/supabase/client';
import { useConfiguration } from '../hooks/useConfiguration';
import {
    ConfigurationTab,
    AdminTableStyles,
} from '../components';

export default function AdminConfigurationPage() {
    const [loading, setLoading] = useState(false);
    const [refresh, setRefresh] = useState(0);

    const supabase = createClient();
    const toast = useToast();

    const {
        loading: dataLoading,
        commissionRates,
        setCommissionRates,
    } = useConfiguration(refresh);

    const handleCommissionChange = (id: string, field: string, value: string) => {
        setCommissionRates(prev => prev.map(rate =>
            rate.id === id ? { ...rate, [field]: parseFloat(value) || 0 } : rate
        ));
    };

    const handleSaveCommission = async () => {
        setLoading(true);
        const { error } = await supabase.from('commission_rates').upsert(commissionRates);
        if (error) {
            toast.error('Error updating commission rates: ' + error.message);
        } else {
            toast.success('Commission rates updated successfully!');
            setRefresh(prev => prev + 1);
        }
        setLoading(false);
    };

    if (dataLoading) {
        return <LoadingIndicator label="Loading configuration..." />;
    }

    return (
        <>
            <Card>
                <ConfigurationTab
                    commissionRates={commissionRates}
                    loading={loading}
                    onCommissionChange={handleCommissionChange}
                    onSave={handleSaveCommission}
                />
            </Card>
            <AdminTableStyles />
        </>
    );
}
