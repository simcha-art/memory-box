import { Archive, ChevronRight, FileText, Image, Link as LinkIcon, ReceiptText } from 'lucide-react';
import { useDateFormat } from '../../hooks/useDateFormat';
import { usePreferences } from '../../stores/PreferencesStore';
import type { ItemType, MemoryItem } from '../../types';

const typeIcons = {
  Document: FileText,
  Receipt: ReceiptText,
  Note: Archive,
  Link: LinkIcon,
  Image,
};

export function ItemRow({ item, onClick }: { item: MemoryItem; onClick: () => void }) {
  const { t } = usePreferences();
  const dateFormat = useDateFormat();
  const Icon = typeIcons[item.type as ItemType] || FileText;
  const summary = item.description || item.fileName || item.tags.slice(0, 3).join(' · ') || t('noDetails');
  return <button className="item-row" type="button" onClick={onClick}>
    <span className={`item-type-icon type-${item.type.toLowerCase()}`}><Icon size={18} /></span>
    <span className="item-copy"><strong>{item.title}</strong><span>{summary}</span></span>
    <span className="item-category">{item.category || t('noCategory')}</span>
    <time className="item-date" dateTime={item.date || item.updatedAt}>{dateFormat.format(new Date(item.date || item.updatedAt))}</time>
    <ChevronRight className="row-chevron" size={17} />
  </button>;
}
