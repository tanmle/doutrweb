import styles from './LoadingIndicator.module.css';

type LoadingIndicatorProps = {
  label?: string;
};

export function LoadingIndicator({ label = 'Loading...' }: LoadingIndicatorProps) {
  return (
    <div className={styles.loader}>
      <div className={styles.cartContainer}>
        <div className={styles.trail} />
        <div className={styles.floatingItem}>📦</div>
        <div className={`${styles.floatingItem} ${styles.floatingItem1}`}>🛍️</div>
        <div className={`${styles.floatingItem} ${styles.floatingItem2}`}>💳</div>

        <div className={styles.cartBody}>
          <div className={styles.cartHandle} />
          <div className={styles.cartInner}>
            <span className={`${styles.item} ${styles.item1}`}>⚡</span>
            <span className={`${styles.item} ${styles.item2}`}>🛒</span>
            <span className={`${styles.item} ${styles.item3}`}>💎</span>
          </div>
        </div>

        <div className={`${styles.wheel} ${styles.wheelLeft}`} />
        <div className={`${styles.wheel} ${styles.wheelRight}`} />
      </div>

      <div>
        <div className={styles.label}>{label}</div>
        <div className={styles.dots}>
          <div className={styles.dot} />
          <div className={styles.dot} />
          <div className={styles.dot} />
        </div>
      </div>
    </div>
  );
}
