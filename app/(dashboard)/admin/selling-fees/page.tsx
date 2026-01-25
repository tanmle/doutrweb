'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { LoadingIndicator } from '@/components/ui/LoadingIndicator';
import { useToast } from '@/components/ui/ToastProvider';
import { createClient } from '@/utils/supabase/client';
import { useSellingFees } from '../hooks/useSellingFees';
import { useAuth } from '../hooks/useAuth';
import {
    SellingFeesTab,
    SellingFeeModal,
    AdminTableStyles,
} from '../components';
import type { SellingFee, FormData, FeeFilter } from '../utils/types';
import { useRealtime } from '@/hooks/useRealtime';

export default function AdminSellingFeesPage() {
    const [formData, setFormData] = useState<FormData>({});
    const [loading, setLoading] = useState(false);
    const [refresh, setRefresh] = useState(0);

    // Filter states
    const [feeFilter, setFeeFilter] = useState<FeeFilter>('this_month');
    const [ownerFilter, setOwnerFilter] = useState<string>('all');
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

    // Modal states
    const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
    const [isEditFeeModalOpen, setIsEditFeeModalOpen] = useState(false);
    const [selectedFee, setSelectedFee] = useState<SellingFee | null>(null);

    const supabase = createClient();
    const toast = useToast();
    const { currentUser } = useAuth();
    const today = new Date().toISOString().split('T')[0];

    const {
        loading: dataLoading,
        sellingFees,
        profiles,
    } = useSellingFees({
        feeFilter,
        ownerFilter,
        dateRange,
        refresh
    });

    useRealtime({
        table: 'selling_fees',
        onData: () => setRefresh(prev => prev + 1)
    });

    const totalFeePrice = sellingFees.reduce((acc, curr) => acc + (parseFloat(curr.price as any) || 0), 0);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'price') {
            const numericValue = value.replace(/\D/g, '');
            setFormData({ ...formData, [name]: numericValue });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const openFeeModal = () => {
        setFormData({
            date: today,
            owner_id: currentUser?.id || ''
        });
        setIsFeeModalOpen(true);
    };

    const handleFeeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.from('selling_fees').insert({
            name: formData.name,
            price: parseFloat(formData.price) || 0,
            owner_id: formData.owner_id || null,
            date: formData.date || today,
            note: formData.note || '',
        });
        if (error) toast.error(error.message);
        else {
            setIsFeeModalOpen(false);
            setFormData({});
            setRefresh(prev => prev + 1);
        }
        setLoading(false);
    };

    const handleUpdateFeeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFee) return;
        setLoading(true);
        const { error } = await supabase.from('selling_fees').update({
            name: formData.name,
            price: parseFloat(formData.price) || 0,
            owner_id: formData.owner_id || null,
            date: formData.date || today,
            note: formData.note || '',
        }).eq('id', selectedFee.id);

        if (error) toast.error(error.message);
        else {
            setIsEditFeeModalOpen(false);
            setFormData({});
            setSelectedFee(null);
            setRefresh(prev => prev + 1);
        }
        setLoading(false);
    };

    const openEditFeeModal = (fee: SellingFee) => {
        setSelectedFee(fee);
        setFormData({
            name: fee.name,
            price: fee.price.toString(),
            owner_id: fee.owner_id || '',
            date: fee.date,
            note: fee.note || '',
        });
        setIsEditFeeModalOpen(true);
    };

    const handleDeleteFee = async (id: string) => {
        if (!confirm('Are you sure you want to delete this fee?')) return;
        setLoading(true);
        const { error } = await supabase.from('selling_fees').delete().eq('id', id);
        if (error) toast.error(error.message);
        else setRefresh(prev => prev + 1);
        setLoading(false);
    };

    if (dataLoading) {
        return <LoadingIndicator label="Loading selling fees..." />;
    }

    return (
        <>
            <Card>
                <SellingFeesTab
                    fees={sellingFees}
                    profiles={profiles}
                    feeFilter={feeFilter}
                    ownerFilter={ownerFilter}
                    dateRange={dateRange}
                    totalFeePrice={totalFeePrice}
                    onAddFee={openFeeModal}
                    onEditFee={openEditFeeModal}
                    onDeleteFee={handleDeleteFee}
                    onFeeFilterChange={setFeeFilter}
                    onOwnerFilterChange={setOwnerFilter}
                    onDateRangeChange={setDateRange}
                    title="Selling Fees"
                />
            </Card>

            <SellingFeeModal
                isOpen={isFeeModalOpen}
                formData={formData}
                profiles={profiles}
                loading={loading}
                today={today}
                onClose={() => setIsFeeModalOpen(false)}
                onSubmit={handleFeeSubmit}
                onChange={handleInputChange}
            />

            <SellingFeeModal
                isOpen={isEditFeeModalOpen}
                isEdit
                formData={formData}
                profiles={profiles}
                loading={loading}
                today={today}
                onClose={() => setIsEditFeeModalOpen(false)}
                onSubmit={handleUpdateFeeSubmit}
                onChange={handleInputChange}
            />

            <AdminTableStyles />
        </>
    );
}
