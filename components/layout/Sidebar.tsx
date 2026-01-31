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
  { label: 'Shops', href: '/shops' },
  { label: 'Sales', href: '/sales' },
  { label: 'Payouts', href: '/payouts' },
  {
    label: 'Admin',
    href: '/admin',
    children: [
      { label: 'Products', href: '/admin/products' },
      { label: 'Selling Fee', href: '/admin/selling-fees' },
      { label: 'Monthly Fee', href: '/admin/monthly-fees' },
      { label: 'Payroll', href: '/admin/payroll' },
      { label: 'Finance', href: '/admin/finance' },
      { label: 'User Management', href: '/admin/users' },
      { label: 'Configuration', href: '/admin/configuration' },
    ]
  },
];

export const Sidebar = ({ isOpen, onClose, role }: { isOpen: boolean; onClose: () => void; role?: string }) => {
  const pathname = usePathname();

  const filteredNavItems = useMemo(() => {
    return navItems.map(item => {
      // 1. Top-level permission check
      if (item.label === 'Admin' && role !== 'admin' && role !== 'leader') return null;

      // 2. Filter children if necessary
      if (item.label === 'Admin' && role === 'leader') {
        const allowedChildren = ['Products'];
        // Including User Management as they manage team members.
        const filteredChildren = item.children?.filter(child => allowedChildren.includes(child.label));
        return { ...item, children: filteredChildren };
      }

      return item;
    }).filter(Boolean) as NavItem[];
  }, [role]);

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
