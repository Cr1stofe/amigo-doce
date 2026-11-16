'use client';

import { useEffect, useRef } from 'react';
import styles from './confirm-dialog.module.css';

export type Confirmation = {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  action: () => void;
};

export function ConfirmDialog({ confirmation, onDismiss }: { confirmation: Confirmation | null; onDismiss: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !confirmation) return;
    dialog.showModal();
    cancelRef.current?.focus();
    return () => { if (dialog.open) dialog.close(); };
  }, [confirmation]);

  return <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="confirmation-title" aria-describedby="confirmation-description" onCancel={event => { event.preventDefault(); onDismiss(); }}>
    {confirmation && <div className={styles.content}>
      <span className={`${styles.icon} ${confirmation.destructive ? styles.iconDestructive : ''}`} aria-hidden="true">✦</span>
      <h2 className={styles.title} id="confirmation-title">{confirmation.title}</h2>
      <p className={styles.description} id="confirmation-description">{confirmation.description}</p>
      <div className={styles.actions}>
        <button ref={cancelRef} type="button" className={`${styles.button} ${styles.cancel}`} onClick={onDismiss}>Cancelar</button>
        <button type="button" className={`${styles.button} ${confirmation.destructive ? styles.destructive : styles.confirm}`} onClick={() => { onDismiss(); confirmation.action(); }}>{confirmation.confirmLabel}</button>
      </div>
    </div>}
  </dialog>;
}
