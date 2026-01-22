import React from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import styles from './EditProfileModal.module.css';

type EditFormData = {
  fullName: string;
  avatarUrl: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
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
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile">
      <form onSubmit={onSubmit} className={styles.form}>
        <div className={styles.avatarSection}>
          <div className={styles.avatarWrapper}>
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
          </div>
        </div>

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
