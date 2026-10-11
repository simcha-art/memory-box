import crypto from 'node:crypto';

const SALT = 'memorybox-secret-v1';
let cached = { source: null, key: null };

function getKey() {
  const source = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!source) throw new Error('ENCRYPTION_KEY (or JWT_SECRET) is required to store passwords');
  if (cached.source !== source) cached = { source, key: crypto.scryptSync(source, SALT, 32) };
  return cached.key;
}

export function encryptSecret(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join(':');
}

export function decryptSecret(payload) {
  const [version, iv, tag, data] = String(payload).split(':');
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Unsupported secret format');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
}