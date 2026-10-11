// Single source of truth for which attachments each item type accepts.
// Keep client/src/utils/fileRules.ts in sync with this file.

export const fileFormats = {
  pdf: { mime: 'application/pdf', extensions: ['pdf'], label: 'PDF' },
  doc: { mime: 'application/msword', extensions: ['doc'], label: 'Word (DOC)' },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extensions: ['docx'], label: 'Word (DOCX)' },
  jpeg: { mime: 'image/jpeg', extensions: ['jpg', 'jpeg'], label: 'JPG' },
  png: { mime: 'image/png', extensions: ['png'], label: 'PNG' },
  webp: { mime: 'image/webp', extensions: ['webp'], label: 'WEBP' },
};

// An empty list means the type takes no file at all.
export const allowedFormatsByType = {
  Document: ['pdf', 'doc', 'docx'],
  Receipt: ['pdf', 'jpeg', 'png', 'webp'],
  Image: ['jpeg', 'png', 'webp'],
  Note: [],
  Link: [],
};

const formatByMime = new Map(Object.values(fileFormats).map((format) => [format.mime, format]));

export const allowedMimes = new Set(formatByMime.keys());

export function extensionForMime(mime) {
  return `.${formatByMime.get(mime)?.extensions[0]}`;
}

export function typeAcceptsMime(type, mime) {
  return (allowedFormatsByType[type] || []).some((key) => fileFormats[key].mime === mime);
}

export function typeAcceptsFileName(type, fileName) {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  return (allowedFormatsByType[type] || []).some((key) => fileFormats[key].extensions.includes(extension));
}

export function describeAllowed(type) {
  const keys = allowedFormatsByType[type] || [];
  return keys.map((key) => fileFormats[key].label).join(', ');
}

// Legacy .doc files are OLE compound documents; file-type reports them as application/x-cfb.
export function contentMatchesMime(detected, mime) {
  if (!detected) return false;
  if (mime === fileFormats.doc.mime) return detected.mime === 'application/x-cfb';
  return detected.mime === mime && formatByMime.get(mime)?.extensions.includes(detected.ext);
}
