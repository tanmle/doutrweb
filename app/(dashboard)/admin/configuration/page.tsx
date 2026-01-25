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
import { useRealtime } from '@/hooks/useRealtime';

export default function AdminConfigurationPage() {
    const [loading, setLoading] = useState(false);
    const [refresh, setRefresh] = useState(0);

    const supabase = createClient();
    const toast = useToast();

    const {
        loading: dataLoading,
        commissionRates,
        setCommissionRates,
        baseKpi,
        setBaseKpi
    } = useConfiguration(refresh);

    useRealtime({
        table: 'commission_rates',
        onData: () => setRefresh(prev => prev + 1)
    });

    useRealtime({
        table: 'app_settings',
        onData: () => setRefresh(prev => prev + 1)
    });

    const handleCommissionChange = (id: string, field: string, value: string) => {
        setCommissionRates(prev => prev.map(rate =>
            rate.id === id ? { ...rate, [field]: parseFloat(value) || 0 } : rate
        ));
    };

    const handleSaveCommission = async () => {
        setLoading(true);

        // Update commission rates
        const { error: ratesError } = await supabase.from('commission_rates').upsert(commissionRates);

        // Update Base KPI
        const { error: kpiError } = await supabase.from('app_settings').upsert({
            key: 'base_kpi',
            value: baseKpi
        });

        if (ratesError || kpiError) {
            toast.error('Error updating configuration: ' + (ratesError?.message || kpiError?.message));
        } else {
            toast.success('Configuration updated successfully!');
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
                    baseKpi={baseKpi}
                    loading={loading}
                    onCommissionChange={handleCommissionChange}
                    onBaseKpiChange={setBaseKpi}
                    onSave={handleSaveCommission}
                />
            </Card>
            <AdminTableStyles />
        </>
    );
}
