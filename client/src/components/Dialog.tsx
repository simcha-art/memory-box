import type { ReactNode, MouseEvent } from 'react';
import { X } from 'lucide-react';
import { usePreferences } from '../stores/PreferencesStore';

export function Dialog({ title, eyebrow, onClose, children, className = '' }: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const { t } = usePreferences();
  function closeFromBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }
  return <div className="dialog-backdrop" role="presentation" onMouseDown={closeFromBackdrop}>
    <section className={`dialog ${className}`} role="dialog" aria-modal="true" aria-label={title}>
      <header className="dialog-header">
        <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div>
        <button className="icon-button" type="button" onClick={onClose} aria-label={t('close')}><X size={18} /></button>
      </header>
      {children}
    </section>
  </div>;
}
