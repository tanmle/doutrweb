'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

const navItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Sales Entry', href: '/sales' },
  { label: 'Shops', href: '/shops' },
  { label: 'Reports', href: '/reports' },
  { label: 'Admin', href: '/admin' },
];

export const Sidebar = ({ isOpen, onClose, role }: { isOpen: boolean; onClose: () => void; role?: string }) => {
  const pathname = usePathname();

  const filteredNavItems = useMemo(() => navItems.filter(item => {
    if (item.label === 'Admin') return role === 'admin';
    return true;
  }), [role]);

  return (
    <aside className={styles.sidebarWrapper}>
      <div className={styles.sidebarHeader}>
        <span className={styles.logo}>Shop Manager</span>
      </div>

      <nav className={styles.nav}>
        {filteredNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
            onClick={onClose} // Close on mobile click
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
};
