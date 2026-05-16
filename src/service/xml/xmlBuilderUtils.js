/**
 * Common utilities for XML builders
 */

export const escapeXml = (str) => {
  if (!str && str !== 0 && str !== false) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

export const ensureMd5Like = (value) => {
  const lower = (value || '').toString().toLowerCase();
  if (/^[a-f0-9]{32}$/.test(lower)) {
    return lower;
  }
  return '0123456789abcdef0123456789abcdef';
};

export const normalizeNumber = (value) => {
  if (!value) return 0;
  return parseFloat(value.toString().replace('%', '').replace(',', '.'));
};

export const roundDecimal = (value, decimals = 6) => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

export const createLinkRewrite = (name) => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const convertDateFormat = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

export const normalizeKey = (key) => {
  return key?.trim().toLowerCase().replace(/\s+/g, '') || '';
};
