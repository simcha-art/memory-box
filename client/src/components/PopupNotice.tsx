import { X } from 'lucide-react';
import { usePreferences } from '../stores/PreferencesStore';

export function PopupNotice({ message, kind = 'error', onClose, offset = 0 }: {
  message: string;
  kind?: 'success' | 'error';
  onClose: () => void;
  offset?: number;
}) {
  const { t } = usePreferences();
  return <div
    className={`notice notice-popup ${kind === 'error' ? 'notice-error' : 'notice-success'}`}
    role={kind === 'error' ? 'alert' : 'status'}
    style={{ top: `${1 + offset * 4.5}rem` }}
  >
    <span>{message}</span>
    <button type="button" className="icon-button" aria-label={t('close')} onClick={onClose}>
      <X size={16} />
    </button>
  </div>;
}
