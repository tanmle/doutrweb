import React from 'react';
import styles from './AdminComponents.module.css';

interface PayrollQRCodeProps {
    qrUrl: string | null;
}

export function PayrollQRCode({ qrUrl }: PayrollQRCodeProps) {
    if (!qrUrl) {
        return (
            <p className={styles.qrCodeError}>
                User bank info missing. Cannot generate QR.
            </p>
        );
    }

    return (
        <div className={styles.qrCodeContainer}>
            <p className={styles.qrCodeLabel}>Scan to Pay with VietQR</p>
            <img src={qrUrl} alt="VietQR" className={styles.qrCodeImage} />
        </div>
    );
}
