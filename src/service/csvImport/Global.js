import Papa from 'papaparse';
import api from '../api';
import { xmlToJson } from '../Util';

export const prestashopApi = {
  createResource: async (resource, xml) => {
    const response = await api.post(`/${resource}`, xml);
    const jsonObj = xmlToJson(response.data);
    return jsonObj.prestashop;
  },
  updateResource: async (resource, id, xml) => {
    const response = await api.put(`/${resource}/${id}`, xml);
    const jsonObj = xmlToJson(response.data);
    return jsonObj.prestashop;
  },
  getResources: async (resource, id = null, filter = null, params = {}) => {
    let url = `/${resource}`;
    if (id) {
      url += `/${id}`;
    }
    const response = await api.get(url, { params });
    const jsonObj = xmlToJson(response.data);

    if (id) {
      const key = Object.keys(jsonObj.prestashop).find((k) => k !== 'xmlns' && k !== 'xlink');
      return [jsonObj.prestashop[key]];
    }

    const resourceKey = Object.keys(jsonObj.prestashop).find((k) => k !== 'xmlns' && k !== 'xlink');
    if (!resourceKey) return [];

    const itemsGroup = jsonObj.prestashop[resourceKey];
    if (!itemsGroup) return [];

    const itemKey = Object.keys(itemsGroup)[0];
    if (!itemKey) return [];

    const items = itemsGroup[itemKey];
    return Array.isArray(items) ? items : [items];
  }
};

export const createValidationError = (message) => {
  const error = new Error(message);
  error.isValidationError = true;
  return error;
};

const normalizeCsvHeader = (value) => (value ?? '')
  .toString()
  .replace(/^\uFEFF/, '')
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[\s_]+/g, '');

const normalizeCsvValue = (value) => (value ?? '').toString().trim();

const validateCsvHeaders = (headers, expectedHeaders, fieldMap, label) => {
  const actualHeaders = Array.isArray(headers) ? headers : [];
  const allowedNormalizedKeys = Object.keys(fieldMap);

  const missing = expectedHeaders.filter((expectedHeader) => {
    const normalizedExpected = normalizeCsvHeader(expectedHeader);
    return !actualHeaders.map(normalizeCsvHeader).includes(normalizedExpected);
  });

  const unexpected = actualHeaders.filter((actualHeader) => {
    const normalizedActual = normalizeCsvHeader(actualHeader);
    return !allowedNormalizedKeys.includes(normalizedActual);
  });

  if (missing.length || unexpected.length) {
    const parts = [];
    if (missing.length) {
      parts.push(`colonnes manquantes: ${missing.join(', ')}`);
    }
    if (unexpected.length) {
      parts.push(`colonnes non conformes ou inconnues: ${unexpected.join(', ')}`);
    }
    throw createValidationError(`${label}: ${parts.join(' | ')}`);
  }
};

const normalizeCsvRows = (rows, fieldMap) => rows.map((row) => {
  const normalizedRow = {};

  Object.entries(row || {}).forEach(([key, value]) => {
    const normalizedKey = normalizeCsvHeader(key);
    const canonicalKey = fieldMap[normalizedKey] || key.trim();
    normalizedRow[canonicalKey] = value;
  });

  return normalizedRow;
});

export const parseCSVWithPapa = (file, schema) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: false,
      skipEmptyLines: true,
      delimiter: ',',
      complete: (results) => {
        try {
          const fields = results.meta?.fields || [];
          if (!fields.length) {
            throw createValidationError('Aucune colonne detectee ou fichier vide');
          }
          validateCsvHeaders(fields, schema.expectedHeaders, schema.fieldMap, schema.label);
          const normalizedRows = normalizeCsvRows(results.data || [], schema.fieldMap);
          resolve(normalizedRows);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => reject(error)
    });
  });
};

export const normalizeNumber = (value) => {
  if (!value) return 0;
  return parseFloat(value.toString().replace('%', '').replace(',', '.'));
};

export const roundDecimal = (value, decimals = 6) => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

export const convertTTCtoHT = (priceTTC, taxRate) => {
  const rate = normalizeNumber(taxRate);
  const ttc = normalizeNumber(priceTTC);
  const ht = ttc / (1 + (rate / 100));
  return roundDecimal(ht);
};

const getPositiveAmountValue = (value) => {
  const normalized = normalizeCsvValue(value).replace(/\s+/g, '').replace(/[^0-9,.-]/g, '').replace(',', '.');
  if (!normalized) return NaN;
  return Number.parseFloat(normalized);
};

export const isPositiveAmount = (value) => Number.isFinite(getPositiveAmountValue(value)) && getPositiveAmountValue(value) > 0;

export const isValidDateDMY = (value) => {
  const dateValue = normalizeCsvValue(value);
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
    return false;
  }

  const [dayText, monthText, yearText] = dateValue.split('/');
  const day = Number.parseInt(dayText, 10);
  const month = Number.parseInt(monthText, 10);
  const year = Number.parseInt(yearText, 10);

  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
    return false;
  }

  const parsedDate = new Date(year, month - 1, day);
  return parsedDate.getFullYear() === year
    && parsedDate.getMonth() === month - 1
    && parsedDate.getDate() === day;
};

export const normalizeKey = (key) => {
  return key?.trim().toLowerCase().replace(/\s+/g, '') || '';
};
