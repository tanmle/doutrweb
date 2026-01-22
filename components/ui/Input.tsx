'use client';

import React, { useId } from 'react';
import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', id, ...props }) => {
  const inputId = useId();
  const resolvedId = id ?? inputId;

  return (
    <div className={styles.inputWrapper}>
      {label && <label className={styles.label} htmlFor={resolvedId}>{label}</label>}
      <input id={resolvedId} className={`${styles.input} ${className}`} {...props} />
    </div>
  );
};
