'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import type { Tab } from '../utils/types';
import styles from './AdminComponents.module.css';

interface TabNavigationProps {
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
    return (
        <div className={styles.tabNavigation}>
            <Button
                variant={activeTab === 'products' ? 'primary' : 'ghost'}
                onClick={() => onTabChange('products')}
            >
                Product Entry
            </Button>
            <Button
                variant={activeTab === 'users' ? 'primary' : 'ghost'}
                onClick={() => onTabChange('users')}
            >
                User Management
            </Button>
            <Button
                variant={activeTab === 'fees' ? 'primary' : 'ghost'}
                onClick={() => onTabChange('fees')}
            >
                Selling Fee
            </Button>
            <Button
                variant={activeTab === 'configuration' ? 'primary' : 'ghost'}
                onClick={() => onTabChange('configuration')}
            >
                Configuration
            </Button>
            <Button
                variant={activeTab === 'payroll' ? 'primary' : 'ghost'}
                onClick={() => onTabChange('payroll')}
            >
                Payroll
            </Button>
        </div>
    );
}
