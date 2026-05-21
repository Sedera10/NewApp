import { parseCSVWithPapa, prestashopApi } from '../Global';

export const CONSTANTS = {
  ID_SHOP_DEFAULT: 1,
  ID_SHOP_GROUP: 1
};

export const shouldAbortOnError = (error) => error?.isValidationError === true;

export const extractAttributeGroups = (csvData) => {
  const groups = {};
  csvData.forEach((row) => {
    const specificite = row.specificité?.trim();
    if (specificite && !groups[specificite]) {
      groups[specificite] = true;
    }
  });
  return Object.keys(groups);
};

export const extractAttributesByGroup = (csvData) => {
  const attributes = {};
  csvData.forEach((row) => {
    const specificite = row.specificité?.trim();
    const valeur = row.karazany?.trim();

    if (specificite && valeur) {
      if (!attributes[specificite]) {
        attributes[specificite] = {};
      }
      if (!attributes[specificite][valeur]) {
        attributes[specificite][valeur] = true;
      }
    }
  });
  return attributes;
};

export const getXmlScalarValue = (value) => {
  if (value && typeof value === 'object') {
    if (value['#text'] !== undefined) return value['#text'];
    if (value.value !== undefined) return value.value;
  }
  return value;
};

export const getXmlNumberValue = (value, fallback = 0) => {
  const parsed = Number.parseInt(getXmlScalarValue(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getStockAvailableRows = async (productId, productAttributeId = null) => {
  const params = {
    display: 'full',
    'filter[id_product]': `[${productId}]`
  };

  if (productAttributeId !== null && productAttributeId !== undefined) {
    params['filter[id_product_attribute]'] = `[${productAttributeId}]`;
  }

  return prestashopApi.getResources('stock_availables', null, null, {
    ...params
  });
};

export const waitForStockAvailableRows = async ({ productId, productAttributeId = 0, attempts = 5, delayMs = 250 }) => {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const rows = await getStockAvailableRows(productId, productAttributeId);
    if (rows && rows.length > 0) {
      return rows;
    }

    if (attempt < attempts) {
      await wait(delayMs);
    }
  }

  return [];
};

export const findMatchingStockRow = ({ rows = [], productId, productAttributeId = 0 }) => {
  const normalizedProductId = Number.parseInt(productId, 10) || 0;
  const normalizedAttrId = Number.parseInt(productAttributeId, 10) || 0;
  const preferredShopId = CONSTANTS.ID_SHOP_DEFAULT || 1;

  let stockRow = rows.find((item) => getXmlNumberValue(item?.id_product, 0) === normalizedProductId
    && getXmlNumberValue(item?.id_product_attribute, 0) === normalizedAttrId
    && getXmlNumberValue(item?.id_shop, preferredShopId) === preferredShopId);

  if (!stockRow) {
    stockRow = rows.find((item) => getXmlNumberValue(item?.id_product, 0) === normalizedProductId
      && getXmlNumberValue(item?.id_product_attribute, 0) === normalizedAttrId);
  }

  return stockRow || null;
};

export const upsertStockAvailableQuantity = async ({ productId, productAttributeId = 0, quantity }) => {
  const rows = await waitForStockAvailableRows({
    productId,
    productAttributeId,
    attempts: 6,
    delayMs: 300
  });

  const normalizedAttrId = Number.parseInt(productAttributeId, 10) || 0;
  const stockRow = findMatchingStockRow({ rows, productId, productAttributeId: normalizedAttrId });
  const currentQuantity = stockRow ? getXmlNumberValue(stockRow?.quantity, 0) : 0;

  const stockAvailableXML = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <stock_available>
    <id_product>${productId}</id_product>
    <id_product_attribute>${normalizedAttrId}</id_product_attribute>
    <quantity>${quantity}</quantity>
    <id_shop>${CONSTANTS.ID_SHOP_DEFAULT}</id_shop>
    <id_shop_group>${CONSTANTS.ID_SHOP_GROUP}</id_shop_group>
    <depends_on_stock>0</depends_on_stock>
    <out_of_stock>${quantity === 0 ? 1 : 0}</out_of_stock>
  </stock_available>
</prestashop>`;

  if (stockRow) {
    const stockId = getXmlScalarValue(stockRow?.id);
    if (!stockId) {
      throw new Error(`ID stock_available manquant pour produit ${productId} / attr ${productAttributeId}`);
    }

    let updatePayload = stockAvailableXML.replace('<stock_available>', `<stock_available>\n    <id>${stockId}</id>`);

    const existingShopId = getXmlNumberValue(stockRow?.id_shop, null);
    const existingShopGroup = getXmlNumberValue(stockRow?.id_shop_group, null);
    if (existingShopId !== null) {
      updatePayload = updatePayload.replace(`<id_shop>${CONSTANTS.ID_SHOP_DEFAULT}</id_shop>`, `<id_shop>${existingShopId}</id_shop>`);
    }
    if (existingShopGroup !== null) {
      updatePayload = updatePayload.replace(`<id_shop_group>${CONSTANTS.ID_SHOP_GROUP}</id_shop_group>`, `<id_shop_group>${existingShopGroup}</id_shop_group>`);
    }

    await prestashopApi.updateResource('stock_availables', stockId, updatePayload);
    return { stockId, currentQuantity, quantity, updated: true, skipped: false };
  }

  return { stockId: null, currentQuantity, quantity, updated: false, skipped: true };
};


const FILE2_SCHEMA = {
  label: 'Fichier 2',
  expectedHeaders: [
    'reference',
    'specificité',
    'karazany',
    'stock_initial',
    'prix_vente_ttc'
  ],
  fieldMap: {
    reference: 'reference',
    specificite: 'specificité',
    karazany: 'karazany',
    stockinitial: 'stock_initial',
    prixventettc: 'prix_vente_ttc'
  }
};

export const parseFile2CSV = (file) => parseCSVWithPapa(file, FILE2_SCHEMA);