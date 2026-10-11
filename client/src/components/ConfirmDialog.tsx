import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';
import { usePreferences } from '../stores/PreferencesStore';
import { Dialog } from './Dialog';
import '../styles/confirm-dialog.css';

export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = usePreferences();

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onCancel]);

  return createPortal(
    <Dialog title={title} onClose={onCancel} className="confirm-dialog">
      <div className="dialog-form">
        <p className="confirm-message">{message}</p>
        <footer className="dialog-actions">
          <button className="button button-secondary" type="button" autoFocus onClick={onCancel}>{t('cancel')}</button>
          <button className="button button-danger" type="button" onClick={onConfirm}><Trash2 size={16} />{confirmLabel}</button>
        </footer>
      </div>
    </Dialog>,
    document.body,
  );
}