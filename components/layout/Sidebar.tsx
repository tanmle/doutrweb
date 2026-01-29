'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

type NavItem = {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
};

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Sales Entry', href: '/sales' },
  { label: 'Shops', href: '/shops' },
  { label: 'Payout Reports', href: '/payout_reports' },
  {
    label: 'Admin',
    href: '/admin',
    children: [
      { label: 'Product Entry', href: '/admin/products' },
      { label: 'Selling Fee', href: '/admin/selling-fees' },
      { label: 'Monthly Fee', href: '/admin/monthly-fees' },
      { label: 'Payroll', href: '/admin/payroll' },
      { label: 'User Management', href: '/admin/users' },
      { label: 'Configuration', href: '/admin/configuration' },
    ]
  },
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
        <Link href="/dashboard" onClick={onClose} className={styles.logo}>
          Shop Manager
        </Link>
      </div>

      <nav className={styles.nav}>
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href || (item.children && pathname.startsWith(item.href) && item.href !== '/');

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                onClick={onClose}
              >
                {item.label}
              </Link>

              {item.children && (
                <div className={styles.subMenu}>
                  {item.children.map(child => {
                    const isChildActive = pathname === child.href || pathname.startsWith(child.href + '/');
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`${styles.subNavItem} ${isChildActive ? styles.active : ''}`}
                        onClick={onClose}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
};
