import React from 'react';
import styles from './ShopCard.module.css';

interface ShopCardProps {
  shop: {
    id: string;
    name: string;
    platform: 'tiktok' | 'amazon' | 'other';
    status: 'active' | 'inactive';
    owner?: {
      full_name?: string;
      email?: string;
    } | null;
  };
  userRole: string;
  onEdit: (shop: ShopCardProps['shop']) => void;
  onDelete: (id: string, name: string) => void;
  onReports?: () => void;
}

export const ShopCard: React.FC<ShopCardProps> = ({
  shop,
  userRole,
  onEdit,
  onDelete,
  onReports
}) => {
  return (
    <div
      className={styles.card}
      data-platform={shop.platform}
    >
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h3 className={styles.shopName}>{shop.name}</h3>
        </div>

        <div className={styles.statusSection}>
          <span
            className={styles.statusBadge}
            data-status={shop.status}
          >
            <span className={styles.statusDot} />
            {shop.status}
          </span>
        </div>
      </div>

      <div className={styles.details}>
        <div className={styles.detailRow}>
          <span className={styles.detailIcon}>🌐</span>
          <span className={styles.detailLabel}>Platform</span>
          <span className={styles.detailValue}>
            {shop.platform.charAt(0).toUpperCase() + shop.platform.slice(1)}
          </span>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.detailIcon}>👤</span>
          <span className={styles.detailLabel}>Owner</span>
          <span className={styles.detailValue}>
            {shop.owner?.full_name || shop.owner?.email || 'Unknown'}
          </span>
        </div>
      </div>

      <div className={styles.actions}>
        {userRole !== 'member' && (
          <button
            className={styles.actionButton}
            onClick={() => onEdit(shop)}
          >✎</button>
        )}

        <button
          className={styles.actionButton}
          onClick={onReports}
        >📊</button>

        {['admin', 'leader'].includes(userRole) && (
          <button
            className={`${styles.actionButton} ${styles.danger}`}
            onClick={() => onDelete(shop.id, shop.name)}
            title="Delete Shop"
            aria-label="Delete shop"
          >✕</button>
        )}
      </div>
    </div>
  );
};
