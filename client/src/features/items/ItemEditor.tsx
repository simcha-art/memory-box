import { useState, type FormEvent } from 'react';
import { FileUp, Plus } from 'lucide-react';
import { Dialog } from '../../components/Dialog';
import { usePreferences } from '../../stores/PreferencesStore';
import type { Category, ItemInput, ItemType, MemoryItem } from '../../types';

const itemTypes: ItemType[] = ['Document', 'Receipt', 'Note', 'Link', 'Image'];

export function ItemEditor({ item, categories, onClose, onSave }: {
  item?: MemoryItem;
  categories: Category[];
  onClose: () => void;
  onSave: (input: ItemInput, file?: File) => Promise<MemoryItem>;
}) {
  const { t } = usePreferences();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: ItemInput = {
      title: String(form.get('title') || '').trim(),
      description: String(form.get('description') || '').trim(),
      type: String(form.get('type') || 'Document') as ItemType,
      category: String(form.get('category') || '').trim(),
      tags: String(form.get('tags') || '').split(',').map((tag) => tag.trim()).filter(Boolean),
      date: String(form.get('date') || new Date().toISOString().slice(0, 10)),
    };
    const selectedFile = form.get('file');
    const file = selectedFile instanceof File && selectedFile.size > 0 ? selectedFile : undefined;
    setSaving(true);
    setError('');
    try {
      await onSave(input, file);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('saveError'));
    } finally {
      setSaving(false);
    }
  }

  return <Dialog title={item ? t('editItem') : t('saveSomething')} eyebrow={item ? t('updateArchive') : t('addArchive')} onClose={onClose} className="editor-dialog">
    <form className="editor-form" onSubmit={submit}>
      <label>{t('title')}<input name="title" required maxLength={160} defaultValue={item?.title} autoFocus placeholder={t('titlePlaceholder')} /></label>
      <div className="form-columns">
        <label>{t('type')}<select name="type" defaultValue={item?.type || 'Document'}>{itemTypes.map((type) => <option key={type} value={type}>{t(type)}</option>)}</select></label>
        <label>{t('date')}<input name="date" type="date" defaultValue={item?.date?.slice(0, 10) || new Date().toISOString().slice(0, 10)} /></label>
      </div>
      <label>{t('category')}<input name="category" list="category-options" defaultValue={item?.category} placeholder={t('categoryPlaceholder')} /><datalist id="category-options">{categories.map((category) => <option key={category._id} value={category.name} />)}</datalist></label>
      <label>{t('tags')}<input name="tags" defaultValue={item?.tags.join(', ')} placeholder={t('tagsPlaceholder')} /><span className="field-hint">{t('tagsHint')}</span></label>
      <label>{t('description')}<textarea name="description" rows={4} maxLength={10000} defaultValue={item?.description} placeholder={t('descriptionPlaceholder')} /></label>
      <label className="file-control"><span className="file-control-icon"><FileUp size={19} /></span><span className="file-control-copy"><strong>{item?.fileName || t('attachment')}</strong><small>{t('fileHint')}</small></span><input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <footer className="dialog-actions"><button className="button button-secondary" type="button" onClick={onClose}>{t('cancel')}</button><button className="button button-primary" type="submit" disabled={saving}>{!saving && <Plus size={16} />}{saving ? t('saving') : item ? t('saveChanges') : t('saveItem')}</button></footer>
    </form>
  </Dialog>;
}
