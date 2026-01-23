'use client';

import React from 'react';
import styles from './components/AdminComponents.module.css';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div>
            <h1 className={styles.pageHeader}>
                Admin Control Center
            </h1>

            <div className={styles.contentContainer}>
                {children}
            </div>
        </div>
    );
}
