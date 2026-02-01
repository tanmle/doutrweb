import React from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PayrollHistory } from './PayrollHistory';
import styles from './EditProfileModal.module.css';

type EditFormData = {
  fullName: string;
  avatarUrl: string;
  dob: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  bankName: string;
  bankNumber: string;
};

type EditProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  updating: boolean;
  formData: EditFormData;
  previewUrl: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileTrigger: () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFieldChange: (field: keyof EditFormData, value: string) => void;
  banks: any[];
  role?: string | null;
  payrollRecords?: any[];
  baseSalary?: number;
};

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  updating,
  formData,
  previewUrl,
  fileInputRef,
  onFileTrigger,
  onFileChange,
  onFieldChange,
  banks,
  role,
  payrollRecords = [],
  baseSalary = 0,
}) => {
  const getRoleClass = () => {
    if (!role) return '';
    return styles[`avatar${role.charAt(0).toUpperCase() + role.slice(1)}`] || '';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile">
      <form onSubmit={onSubmit} className={styles.form}>
        <div className={styles.avatarSection}>
          <div className={`${styles.avatarWrapper} ${getRoleClass()}`}>
            <div className={styles.avatarHalo} aria-hidden="true" />
            <div className={styles.avatarFrame}>
              <Avatar src={previewUrl} name={formData.fullName} size={88} />
            </div>
            <button
              type="button"
              onClick={onFileTrigger}
              aria-label="Upload profile photo"
              className={styles.uploadButton}
            >
              ✎
            </button>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileChange}
            accept="image/*"
            className={styles.hiddenInput}
          />
          <span className={styles.hint}>Upload a new profile photo</span>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Profile</span>
            <span className={styles.sectionLine} aria-hidden="true" />
          </div>
          <div className={styles.fields}>
            <Input
              label="Full Name"
              value={formData.fullName}
              onChange={(event) => onFieldChange('fullName', event.target.value)}
              required
            />
            <Input
              label="Date of Birth"
              type="date"
              value={formData.dob}
              onChange={(event) => onFieldChange('dob', event.target.value)}
            />
          </div>
        </div>


        {role !== 'admin' && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>💰 Payroll History</span>
              <span className={styles.sectionLine} aria-hidden="true" />
            </div>
            <div className={styles.fields}>
              <PayrollHistory records={payrollRecords} baseSalary={baseSalary} />
            </div>
          </div>
        )}

        {role !== 'admin' && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>Bank Information</span>
              <span className={styles.sectionLine} aria-hidden="true" />
            </div>
            <div className={styles.fields}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Bank Name</label>
                <select
                  value={formData.bankName}
                  onChange={(event) => onFieldChange('bankName', event.target.value)}
                  style={{
                    padding: '10px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    backgroundColor: 'var(--background-secondary)',
                    color: 'var(--text-primary)',
                    width: '100%',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="">Select Bank</option>
                  {banks.map((bank: any) => (
                    <option key={bank.id} value={`${bank.shortName} - ${bank.name}`}>
                      {bank.shortName} - {bank.name}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Bank Number"
                value={formData.bankNumber}
                onChange={(event) => onFieldChange('bankNumber', event.target.value)}
              />
            </div>
          </div>
        )}

        <div className={`${styles.section} ${styles.securitySection}`}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Security</span>
            <span className={styles.sectionLine} aria-hidden="true" />
          </div>
          <div className={styles.fields}>
            <Input
              type="password"
              label="Current Password"
              placeholder="Required for password changes"
              value={formData.currentPassword}
              onChange={(event) => onFieldChange('currentPassword', event.target.value)}
            />
            <Input
              type="password"
              label="New Password"
              placeholder="Min 6 characters"
              value={formData.newPassword}
              onChange={(event) => onFieldChange('newPassword', event.target.value)}
            />
            <Input
              type="password"
              label="Confirm New Password"
              placeholder="Repeat new password"
              value={formData.confirmPassword}
              onChange={(event) => onFieldChange('confirmPassword', event.target.value)}
            />
          </div>
        </div>

        <Button type="submit" fullWidth disabled={updating} className={styles.submit}>
          {updating ? 'Saving Changes...' : 'Save Profile'}
        </Button>
      </form>
    </Modal>
  );
};
