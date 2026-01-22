'use client';

import React from 'react';
import styles from './Avatar.module.css';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
}

export const Avatar = ({ src, name, size = 32 }: AvatarProps) => {
  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div 
      className={styles.avatar} 
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {src ? (
        <img src={src} alt={name || 'User avatar'} width={size} height={size} />
      ) : (
        <span className={styles.initials}>{getInitials(name)}</span>
      )}
    </div>
  );
};
