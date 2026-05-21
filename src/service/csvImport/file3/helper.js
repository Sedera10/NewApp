import { parseCSVWithPapa, prestashopApi } from '../Global';

export const shouldAbortOnError = (error) => error?.isValidationError === true;

export const ensureMd5Like = (value) => {
  const lower = (value || '').toString().toLowerCase();
  if (/^[a-f0-9]{32}$/.test(lower)) {
    return lower;
  }
  return '0123456789abcdef0123456789abcdef';
};

export const getPrimitiveValue = (value) => {
  if (value && typeof value === 'object') {
    if (value['#text'] !== undefined) return value['#text'];
    if (value.value !== undefined) return value.value;
  }
  return value;
};

export const normalizeStatusLabel = (value) => (value || '')
  .toString()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

export const getOrderStateName = (orderState, idLang) => {
  const name = orderState?.name;

  if (typeof name === 'string') {
    return name;
  }

  if (Array.isArray(name?.language)) {
    const preferredLanguage = name.language.find((language) => String(language?.['@_id']) === String(idLang)) || name.language[0];
    return getPrimitiveValue(preferredLanguage);
  }

  if (name?.language) {
    return getPrimitiveValue(name.language);
  }

  return getPrimitiveValue(name);
};

export const getExistingOrderStateId = (stateName, orderStates, idLang) => {
  const normalizedWanted = normalizeStatusLabel(stateName);
  const states = Array.isArray(orderStates) ? orderStates : [];

  const exactMatch = states.find((state) => normalizeStatusLabel(getOrderStateName(state, idLang)) === normalizedWanted);
  if (exactMatch?.id) {
    return Number.parseInt(exactMatch.id, 10) || null;
  }

  const fallbackMatch = states.find((state) => {
    const normalizedState = normalizeStatusLabel(getOrderStateName(state, idLang));
    return normalizedState.includes(normalizedWanted) || normalizedWanted.includes(normalizedState);
  });

  return fallbackMatch?.id ? (Number.parseInt(fallbackMatch.id, 10) || null) : null;
};

export const createOrderStateChange = async ({ id_order, id_order_state, date_add }) => {
  if (!id_order || !id_order_state) return null;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order_state_change>
    <id_order><![CDATA[${id_order}]]></id_order>
    <id_order_state><![CDATA[${id_order_state}]]></id_order_state>
    <date_add><![CDATA[${date_add || new Date().toISOString().replace('T', ' ').slice(0, 19)}]]></date_add>
  </order_state_change>
</prestashop>`;
  return prestashopApi.createResource('order_state_changes', xml);
};

export const parseAchatField = (achatField) => {
  try {
    if (!achatField) return [];

    let cleaned = achatField
      .replace(/^\[/, '').replace(/\]$/, '')
      .replace(/^\(/, '').replace(/\)$/, '')
      .replace(/""/g, '"');

    const items = cleaned.split('),(');

    return items.map((item) => {
      item = item.replace(/^\(/, '').replace(/\)$/, '').trim();

      const parts = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < item.length; i++) {
        const char = item[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ';' && !inQuotes) {
          parts.push(current.replace(/"/g, '').trim());
          current = '';
          continue;
        }
        current += char;
      }
      if (current) {
        parts.push(current.replace(/"/g, '').trim());
      }

      const quantityValue = Number.parseInt(parts[1], 10);

      return {
        reference: parts[0] || '',
        quantity: Number.isNaN(quantityValue) ? 1 : quantityValue,
        variante: parts[2] || ''
      };
    }).filter((item) => item.reference);
  } catch (error) {
    console.error('Erreur parsing achat:', error, 'achatField:', achatField);
    return [];
  }
};

export const findOrderByCartId = async ({ cartId, customerId }) => {
  const orders = await prestashopApi.getResources('orders', null, null, {
    display: 'full',
    'filter[id_cart]': `[${cartId}]`
  });

  return orders.find((order) => {
    const orderCartId = String(getPrimitiveValue(order?.id_cart) || '').trim();
    const orderCustomerId = String(getPrimitiveValue(order?.id_customer) || '').trim();
    return orderCartId === String(cartId) && orderCustomerId === String(customerId);
  }) || null;
};

export const convertDateFormat = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const FILE3_SCHEMA = {
  label: 'Fichier 3',
  expectedHeaders: [
    'date',
    'nom',
    'email',
    'pwd',
    'adresse',
    'achat',
    'etat'
  ],
  fieldMap: {
    date: 'date',
    nom: 'nom',
    email: 'email',
    pwd: 'pwd',
    adresse: 'adresse',
    achat: 'achat',
    etat: 'etat'
  }
};

export const parseFile3CSV = (file) => parseCSVWithPapa(file, FILE3_SCHEMA);
