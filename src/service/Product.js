import api from './api';
import { xmlToJson, buildPrestashopXml } from './Util';

const STOCK_HISTORY_KEY_PREFIX = 'stock_history_';

const getBrowserStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  return window.localStorage;
};

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const getStockHistoryStorageKey = (productId) => `${STOCK_HISTORY_KEY_PREFIX}${productId}`;

const safeParseJson = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const getTextValue = (value) => (value && typeof value === 'object' && value['#text'] !== undefined)
  ? value['#text']
  : value;

const getNumericValue = (value, fallback = 0) => {
  const parsed = Number.parseInt(getTextValue(value), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
};

const TAX_RATE_CACHE = new Map();
const OPTION_VALUE_LABEL_CACHE = new Map();

const formatPrice = (value) => Number.parseFloat(value || 0).toFixed(2);

const getTaxRateForTaxRulesGroupId = async (groupId) => {
  const normalizedGroupId = getNumericValue(groupId, null);
  if (normalizedGroupId === null) return 0;

  if (TAX_RATE_CACHE.has(normalizedGroupId)) {
    return TAX_RATE_CACHE.get(normalizedGroupId);
  }

  try {
    const taxRulesResponse = await api.get(`/tax_rules?display=full&filter[id_tax_rules_group]=[${normalizedGroupId}]`);
    const taxRulesJsonObj = xmlToJson(taxRulesResponse.data);
    const taxRules = ensureArray(taxRulesJsonObj?.prestashop?.tax_rules?.tax_rule);
    const firstRule = taxRules[0];
    const taxId = getNumericValue(firstRule?.id_tax, null);

    if (taxId === null) {
      TAX_RATE_CACHE.set(normalizedGroupId, 0);
      return 0;
    }

    const taxResponse = await api.get(`/taxes/${taxId}?display=full`);
    const taxJsonObj = xmlToJson(taxResponse.data);
    const tax = taxJsonObj?.prestashop?.tax || null;
    const taxRate = Number.parseFloat(getTextValue(tax?.rate)) || 0;

    TAX_RATE_CACHE.set(normalizedGroupId, taxRate);
    return taxRate;
  } catch (error) {
    console.warn(`Impossible de charger le taux TVA pour le groupe ${normalizedGroupId}`, error?.message || error);
    TAX_RATE_CACHE.set(normalizedGroupId, 0);
    return 0;
  }
};

const enrichProductPricing = (product, taxRate = 0) => {
  const priceHT = Number.parseFloat(getTextValue(product?.price)) || 0;
  const normalizedTaxRate = Number.parseFloat(taxRate) || 0;
  const priceTTC = priceHT * (1 + (normalizedTaxRate / 100));

  return {
    ...product,
    taxRate: normalizedTaxRate,
    priceHT: formatPrice(priceHT),
    priceTTC: formatPrice(priceTTC),
    price: formatPrice(priceTTC)
  };
};

const getAssociationStockIds = (product) => {
  const stockNodes = ensureArray(product?.associations?.stock_availables?.stock_available || product?.associations?.stock_availables);
  return stockNodes
    .map((node) => getNumericValue(node?.id, null))
    .filter((id) => id !== null);
};

const getAssociationCombinationIds = (product) => {
  const comboNodes = ensureArray(product?.associations?.combinations?.combination || product?.associations?.combinations);
  return comboNodes
    .map((node) => getNumericValue(node?.id, null))
    .filter((id) => id !== null);
};

const getVariantLabel = (product, combination) => {
  const productReference = String(getTextValue(product?.reference) || '').trim();
  const combinationReference = String(getTextValue(combination?.reference) || '').trim();

  if (!combinationReference) {
    return `Déclinaison ${getTextValue(combination?.id) || ''}`.trim();
  }

  if (productReference && combinationReference.startsWith(`${productReference}-`)) {
    return combinationReference.slice(productReference.length + 1);
  }

  return combinationReference;
};

const getOptionValueLabel = async (valueId) => {
  const normalizedValueId = getNumericValue(valueId, null);
  if (normalizedValueId === null) return '';

  if (OPTION_VALUE_LABEL_CACHE.has(normalizedValueId)) {
    return OPTION_VALUE_LABEL_CACHE.get(normalizedValueId);
  }

  try {
    const valueResponse = await api.get(`/product_option_values/${normalizedValueId}?display=full`);
    const valueJsonObj = xmlToJson(valueResponse.data);
    const optionValue = valueJsonObj?.prestashop?.product_option_value || null;

    let nameText = '';
    if (optionValue?.name?.language) {
      nameText = getTextValue(ensureArray(optionValue.name.language)[0]);
    } else {
      nameText = getTextValue(optionValue?.name);
    }

    const label = String(nameText || '').trim();
    OPTION_VALUE_LABEL_CACHE.set(normalizedValueId, label);
    return label;
  } catch (error) {
    console.warn(`Impossible de charger la description pour l'option_value ${normalizedValueId}`);
    OPTION_VALUE_LABEL_CACHE.set(normalizedValueId, '');
    return '';
  }
};

const getCombinationDisplayLabel = async (product, combination) => {
  const valueNodes = ensureArray(combination?.associations?.product_option_values?.product_option_value || combination?.associations?.product_option_values);
  const combinationNameParts = [];

  for (const node of valueNodes) {
    const valueLabel = await getOptionValueLabel(node?.id);
    if (valueLabel) {
      combinationNameParts.push(valueLabel);
    }
  }

  return combinationNameParts.join(' - ') || getVariantLabel(product, combination);
};

const buildCombinationLabelsById = async (product, combinationsById = {}, combinationIds = null) => {
  const idsToResolve = Array.isArray(combinationIds) && combinationIds.length
    ? combinationIds
    : Object.keys(combinationsById);

  const entries = await Promise.all(idsToResolve.map(async (combinationId) => {
    const combination = combinationsById[combinationId] || null;
    const label = await getCombinationDisplayLabel(product, combination);
    return [combinationId, label];
  }));

  return entries.reduce((acc, [combinationId, label]) => {
    acc[combinationId] = label;
    return acc;
  }, {});
};

const buildStockBreakdown = (product, stockRows = [], combinationsById = {}, combinationLabelsById = {}) => {
  const normalizedRows = ensureArray(stockRows);
  const combinationIds = getAssociationCombinationIds(product);

  if (!combinationIds.length) {
    const baseRow = normalizedRows.find((row) => getNumericValue(row?.id_product_attribute, 0) === 0);
    return [{
      idProductAttribute: 0,
      label: 'Produit',
      quantity: getNumericValue(baseRow?.quantity, 0)
    }];
  }

  return combinationIds.map((combinationId) => {
    const stockRow = normalizedRows.find((row) => getNumericValue(row?.id_product_attribute, 0) === combinationId);
    const combination = combinationsById[combinationId] || null;
    const label = combinationLabelsById[combinationId] || getVariantLabel(product, combination);

    return {
      idProductAttribute: combinationId,
      label,
      quantity: getNumericValue(stockRow?.quantity, 0)
    };
  });
};

const computeStockFromRows = (product, stockRows = []) => {
  const normalizedRows = ensureArray(stockRows);
  if (!normalizedRows.length) return 0;

  const rowsWithAttr = normalizedRows.map((row) => ({
    quantity: getNumericValue(row?.quantity, 0),
    idProductAttribute: getNumericValue(row?.id_product_attribute, 0)
  }));

  const hasCombinations = getAssociationCombinationIds(product).length > 0;
  if (hasCombinations) {
    const combinationTotal = rowsWithAttr
      .filter((row) => row.idProductAttribute > 0)
      .reduce((sum, row) => sum + row.quantity, 0);

    if (combinationTotal > 0) {
      return combinationTotal;
    }
  }

  const baseRow = rowsWithAttr.find((row) => row.idProductAttribute === 0);
  if (baseRow) {
    return baseRow.quantity;
  }

  return rowsWithAttr.reduce((sum, row) => sum + row.quantity, 0);
};

const upsertDailyStockEntry = (productId, nextQuantity, previousQuantity = null) => {
  const storage = getBrowserStorage();
  if (!storage) return [];

  const key = getStockHistoryStorageKey(productId);
  const history = safeParseJson(storage.getItem(key) || '[]', []);
  const today = getTodayKey();
  const currentPrevious = previousQuantity ?? (history.length ? getNumericValue(history[0]?.quantity, nextQuantity) : nextQuantity);

  const entry = {
    date: today,
    quantity: nextQuantity,
    previousQuantity: currentPrevious,
    variation: nextQuantity - currentPrevious,
    updatedAt: new Date().toISOString()
  };

  const existingIndex = history.findIndex((item) => item.date === today);
  if (existingIndex >= 0) {
    history[existingIndex] = {
      ...history[existingIndex],
      ...entry
    };
  } else {
    history.unshift(entry);
  }

  storage.setItem(key, JSON.stringify(history));
  return history;
};

const getStockHistory = (productId) => {
  const storage = getBrowserStorage();
  if (!storage) return [];

  const key = getStockHistoryStorageKey(productId);
  return safeParseJson(storage.getItem(key) || '[]', []);
};

const normalizeDateKey = (value) => {
  if (!value) return null;

  const rawValue = String(getTextValue(value) || '').trim();
  if (!rawValue) return null;

  return rawValue.slice(0, 10);
};

const parseDateKeyUtc = (dateKey) => {
  if (!dateKey) return null;
  const parts = String(dateKey).split('-').map((part) => Number.parseInt(part, 10));
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
};

const addDays = (dateKey, offset) => {
  const baseDate = parseDateKeyUtc(dateKey);
  if (!baseDate) return dateKey;
  baseDate.setUTCDate(baseDate.getUTCDate() + offset);
  return baseDate.toISOString().slice(0, 10);
};

const toDateNumber = (dateKey) => {
  const baseDate = parseDateKeyUtc(dateKey);
  return baseDate ? baseDate.getTime() : Number.NaN;
};

const normalizeDeltaRows = (rows) => ensureArray(rows).map((row) => ({
  id: getTextValue(row?.id),
  idProduct: getNumericValue(row?.id_product, 0),
  idProductAttribute: getNumericValue(row?.id_product_attribute, 0),
  delta: Number.parseFloat(getTextValue(row?.delta) || 0) || 0,
  dateAdd: normalizeDateKey(row?.date_add || row?.date_upd || row?.date || row?.created_at)
}));

const aggregateMovementsByDate = (rows, labelsByAttribute = {}) => rows.reduce((acc, row) => {
  if (!row.dateAdd) return acc;

  if (!acc[row.dateAdd]) {
    acc[row.dateAdd] = {
      date: row.dateAdd,
      entree: 0,
      sorti: 0,
      entreeDetails: [],
      sortiDetails: []
    };
  }

  const attrKey = String(row.idProductAttribute || 0);
  const attrLabel = labelsByAttribute[attrKey] || (Number.parseInt(attrKey, 10) === 0 ? 'Produit mère' : `Déclinaison ${attrKey}`);
  const quantity = Math.abs(Number(row.delta) || 0);

  if (row.delta >= 0) {
    acc[row.dateAdd].entree += quantity;
    acc[row.dateAdd].entreeDetails.push({
      idProductAttribute: row.idProductAttribute,
      label: attrLabel,
      quantity,
      text: `${quantity} (${attrLabel})`
    });
  } else {
    acc[row.dateAdd].sorti += quantity;
    acc[row.dateAdd].sortiDetails.push({
      idProductAttribute: row.idProductAttribute,
      label: attrLabel,
      quantity,
      text: `${quantity} (${attrLabel})`
    });
  }

  return acc;
}, {});

const resolveDailyEvolution = ({
  startDate,
  endDate,
  currentQuantity,
  movementMap,
  anchorDate = getTodayKey()
}) => {
  const normalizedStart = normalizeDateKey(startDate);
  const normalizedEnd = normalizeDateKey(endDate);

  if (!normalizedStart || !normalizedEnd) {
    return [];
  }

  const start = toDateNumber(normalizedStart) <= toDateNumber(normalizedEnd) ? normalizedStart : normalizedEnd;
  const end = toDateNumber(normalizedStart) <= toDateNumber(normalizedEnd) ? normalizedEnd : normalizedStart;
  const anchor = normalizeDateKey(anchorDate) || getTodayKey();
  const anchorNumber = toDateNumber(anchor);
  const startNumber = toDateNumber(start);
  const endNumber = toDateNumber(end);
  const anchorAvailable = Number(currentQuantity) || 0;

  const getMovement = (date) => movementMap[date] || { date, entree: 0, sorti: 0, entreeDetails: [], sortiDetails: [] };

  const rowsByDate = new Map();
  const dates = [];

  for (let currentDate = start; toDateNumber(currentDate) <= endNumber; currentDate = addDays(currentDate, 1)) {
    if (toDateNumber(currentDate) < startNumber) {
      continue;
    }
    dates.push(currentDate);
    if (currentDate === end) {
      break;
    }
  }

  let runningEndOfDay = anchorAvailable;

  for (let current = anchor; toDateNumber(current) >= startNumber; current = addDays(current, -1)) {
    const movement = getMovement(current);
    const endOfDay = current === anchor
      ? anchorAvailable
      : runningEndOfDay - movement.entree + movement.sorti;
    const stockInitial = endOfDay - movement.entree + movement.sorti;

    rowsByDate.set(current, {
      date: current,
      stockInitial: Number(stockInitial) || 0,
      entree: Number(movement.entree) || 0,
      sorti: Number(movement.sorti) || 0,
      disponibles: Number(endOfDay) || 0,
      entreeDetails: movement.entreeDetails || [],
      sortiDetails: movement.sortiDetails || []
    });

    runningEndOfDay = stockInitial;

    if (current === start) {
      break;
    }
  }

  let forwardEndOfDay = anchorAvailable;
  if (endNumber > anchorNumber) {
    for (let current = addDays(anchor, 1); toDateNumber(current) <= endNumber; current = addDays(current, 1)) {
      const movement = getMovement(current);
      const stockInitial = forwardEndOfDay;
      const disponibles = stockInitial + movement.entree - movement.sorti;

      rowsByDate.set(current, {
        date: current,
        stockInitial: Number(stockInitial) || 0,
        entree: Number(movement.entree) || 0,
        sorti: Number(movement.sorti) || 0,
        disponibles: Number(disponibles) || 0,
        entreeDetails: movement.entreeDetails || [],
        sortiDetails: movement.sortiDetails || []
      });

      forwardEndOfDay = disponibles;
      if (current === end) {
        break;
      }
    }
  }

  return dates.map((date) => rowsByDate.get(date)).filter(Boolean);
};

const getStockDeltas = async (productId) => {
  try {
    let url = `/stock_deltas?display=full&filter[id_product]=[${productId}]`;

    const response = await api.get(url);
    const jsonObj = xmlToJson(response.data);
    const deltas = jsonObj?.prestashop?.stock_deltas?.stock_delta || [];
    return ensureArray(deltas);
  } catch (error) {
    console.warn('Impossible de charger stock_deltas, fallback vide.', error?.message || error);
    return [];
  }
};

export const productService = {
  // Fetch all products with full details and optional filters
  getAllProducts: async (filters = {}) => {
    try {
      let url = `/products?display=full`;
      
      if (filters.name) url += `&filter[name]=%[${filters.name}]%`;

      // fetch a large amount to fix "invisible" products, limit will be managed by UI
      url += `&limit=500`;

      const response = await api.get(url);
      const jsonObj = xmlToJson(response.data);
      let products = jsonObj?.prestashop?.products?.product || [];
      if (!Array.isArray(products)) products = products ? [products] : [];

      let stockRows = [];
      let combinationsById = {};
      try {
        const stockResponse = await api.get('/stock_availables?display=full');
        const stockJsonObj = xmlToJson(stockResponse.data);
        stockRows = ensureArray(stockJsonObj?.prestashop?.stock_availables?.stock_available);
      } catch (stockError) {
        console.warn('Impossible de charger stock_availables, fallback sur quantity produit.', stockError?.message || stockError);
      }

      const taxGroupIds = [...new Set(products
        .map((product) => getNumericValue(product?.id_tax_rules_group, null))
        .filter((groupId) => groupId !== null))];

      const taxRatesByGroupId = {};
      await Promise.all(taxGroupIds.map(async (groupId) => {
        taxRatesByGroupId[groupId] = await getTaxRateForTaxRulesGroupId(groupId);
      }));

      try {
        const combinationsResponse = await api.get('/combinations?display=full&limit=1000');
        const combinationsJsonObj = xmlToJson(combinationsResponse.data);
        const combinations = ensureArray(combinationsJsonObj?.prestashop?.combinations?.combination);
        combinationsById = combinations.reduce((acc, item) => {
          const combinationId = getNumericValue(item?.id, null);
          if (combinationId !== null) {
            acc[combinationId] = item;
          }
          return acc;
        }, {});
      } catch (combinationError) {
        console.warn('Impossible de charger les combinaisons pour détail du stock.', combinationError?.message || combinationError);
      }

      const stockRowsById = stockRows.reduce((acc, row) => {
        const stockId = getNumericValue(row?.id, null);
        if (stockId !== null) {
          acc[stockId] = row;
        }
        return acc;
      }, {});

      products = await Promise.all(products.map(async (product) => {
        const taxRate = taxRatesByGroupId[getNumericValue(product?.id_tax_rules_group, null)] || 0;
        const associationStockIds = getAssociationStockIds(product);
        const rowsForProduct = associationStockIds
          .map((id) => stockRowsById[id])
          .filter(Boolean);
        const combinationIds = getAssociationCombinationIds(product);
        const combinationLabelsById = combinationIds.length && Object.keys(combinationsById).length
          ? await buildCombinationLabelsById(product, combinationsById, combinationIds)
          : {};

        const breakdown = rowsForProduct.length
          ? buildStockBreakdown(product, rowsForProduct, combinationsById, combinationLabelsById)
          : [{ idProductAttribute: 0, label: 'Produit', quantity: getNumericValue(product?.quantity, 0) }];

        const computedStock = rowsForProduct.length
          ? computeStockFromRows(product, rowsForProduct)
          : getNumericValue(product?.quantity, 0);

        return {
          ...enrichProductPricing(product, taxRate),
          computed_stock: computedStock,
          stock_breakdown: breakdown
        };
      }));
      
      // Post-fetch filtering for categories (using all associated categories, not just the default one)
      if (filters.category) {
        const catIds = String(filters.category).split('|');
        products = products.filter(p => {
          // Extract all category IDs associated with this product
          let productCatIds = [];
          
          if (p.associations && p.associations.categories && p.associations.categories.category) {
            let cats = p.associations.categories.category;
            if (!Array.isArray(cats)) cats = [cats];
            
            cats.forEach(c => {
              if (c === null || c === undefined) return;
              if (typeof c === 'object' && c.id !== undefined) {
                if (typeof c.id === 'object' && c.id['#text'] !== undefined) {
                  productCatIds.push(String(c.id['#text']));
                } else {
                  productCatIds.push(String(c.id));
                }
              } else if (typeof c === 'number' || typeof c === 'string') {
                productCatIds.push(String(c));
              }
            });
          }
          
          // Also fallback to default category just in case
          if (p.id_category_default) {
            const defCat = typeof p.id_category_default === 'object' ? String(p.id_category_default['#text']) : String(p.id_category_default);
            if (defCat && !productCatIds.includes(defCat)) {
              productCatIds.push(defCat);
            }
          }

          // Check if any of the requested category IDs match the product's categories
          return catIds.some(id => productCatIds.includes(String(id)));
        });
      }

      // Post-fetch filtering for price (Prestashop XML API price ranges are harder to query directly)
      if (filters.minPrice) {
        products = products.filter(p => parseFloat(p.price || 0) >= parseFloat(filters.minPrice));
      }
      if (filters.maxPrice) {
        products = products.filter(p => parseFloat(p.price || 0) <= parseFloat(filters.maxPrice));
      }

      return products;
    } catch (error) {
      console.error("Error fetching products", error);
      return [];
    }
  },

  // Fetch product by ID
  getProductById: async (id) => {
    try {
      const response = await api.get(`/products/${id}?display=full`);
      const jsonObj = xmlToJson(response.data);
      const product = jsonObj?.prestashop?.product || null;
      if (!product) return null;

      try {
        const stockResponse = await api.get(`/stock_availables?display=full&filter[id_product]=[${id}]`);
        const stockJsonObj = xmlToJson(stockResponse.data);
        const stockRows = ensureArray(stockJsonObj?.prestashop?.stock_availables?.stock_available);

        const taxRate = await getTaxRateForTaxRulesGroupId(product?.id_tax_rules_group);

        // try to load combinations for labels
        let combinationsById = {};
        try {
          const combinationsResponse = await api.get(`/combinations?display=full&filter[id_product]=[${id}]`);
          const combinationsJsonObj = xmlToJson(combinationsResponse.data);
          const combinations = ensureArray(combinationsJsonObj?.prestashop?.combinations?.combination);
          combinationsById = combinations.reduce((acc, item) => {
            const cid = getNumericValue(item?.id, null);
            if (cid !== null) acc[cid] = item;
            return acc;
          }, {});
        } catch (e) {
          // ignore
        }

        const combinationLabelsById = Object.keys(combinationsById).length
          ? await buildCombinationLabelsById(product, combinationsById, Object.keys(combinationsById))
          : {};

        return {
          ...enrichProductPricing(product, taxRate),
          computed_stock: computeStockFromRows(product, stockRows),
          stock_breakdown: buildStockBreakdown(product, stockRows, combinationsById, combinationLabelsById)
        };
      } catch {
        const taxRate = await getTaxRateForTaxRulesGroupId(product?.id_tax_rules_group);
        return {
          ...enrichProductPricing(product, taxRate),
          computed_stock: getNumericValue(product?.quantity, 0),
          stock_breakdown: [{ idProductAttribute: 0, label: 'Produit', quantity: getNumericValue(product?.quantity, 0) }]
        };
      }
    } catch (error) {
      console.error(`Error fetching product ${id}`, error);
      return null;
    }
  },

  getProductCombinationsWithPrices: async (productId) => {
    try {
      if (!productId && productId !== 0) {
        throw new Error('Identifiant produit manquant');
      }
      const productResponse = await api.get(`/products/${productId}?display=full`);
      const productJsonObj = xmlToJson(productResponse.data);
      const product = productJsonObj?.prestashop?.product || null;

      if (!product) throw new Error(`Produit ${productId} non trouvé`);

      const basePriceHT = Number.parseFloat(getTextValue(product?.price)) || 0;
      const taxRulesGroupId = product?.id_tax_rules_group;

      const taxRate = await getTaxRateForTaxRulesGroupId(taxRulesGroupId);

      const combinationIds = getAssociationCombinationIds(product);

      if (!combinationIds.length) {
        const basePriceTTC = basePriceHT * (1 + taxRate / 100);
        return [{
          idProductAttribute: 0,
          name: "Standard / Unique",
          priceTTC: formatPrice(basePriceTTC),
          priceHT: formatPrice(basePriceHT)
        }];
      }

      const formattedCombinations = [];
      for (const combId of combinationIds) {
        const combResponse = await api.get(`/combinations/${combId}?display=full`);
        const combJsonObj = xmlToJson(combResponse.data);
        const combination = combJsonObj?.prestashop?.combination || null;

        if (!combination) continue;

        // Calcul des impacts financiers de la déclinaison
        const priceImpactHT = Number.parseFloat(getTextValue(combination?.price)) || 0;
        const finalPriceHT = basePriceHT + priceImpactHT;
        const finalPriceTTC = finalPriceHT * (1 + taxRate / 100);

        // 5. Récupérer le nom textuel des attributs (ex: "Bleu", "XL")
        const valueNodes = ensureArray(combination?.associations?.product_option_values?.product_option_value || combination?.associations?.product_option_values);
        const combinationNameParts = [];

        for (const node of valueNodes) {
          const valueId = getNumericValue(node?.id, null);
          if (valueId !== null) {
            try {
              const valueResponse = await api.get(`/product_option_values/${valueId}?display=full`);
              const valueJsonObj = xmlToJson(valueResponse.data);
              const optionValue = valueJsonObj?.prestashop?.product_option_value || null;
              
              // Récupération de la valeur texte multilingue sécurisée
              let nameText = '';
              if (optionValue?.name?.language) {
                nameText = getTextValue(ensureArray(optionValue.name.language)[0]);
              } else {
                nameText = getTextValue(optionValue?.name);
              }

              if (nameText) combinationNameParts.push(nameText);
            } catch (e) {
              console.warn(`Impossible de charger la description pour l'option_value ${valueId}`);
            }
          }
        }

        // Si aucun libellé d'attribut n'est trouvé, on utilise ta fonction interne de secours
        const fullName = combinationNameParts.join(' - ') || getVariantLabel(product, combination);

        formattedCombinations.push({
          idProductAttribute: combId,
          name: fullName,
          priceTTC: formatPrice(finalPriceTTC),
          priceHT: formatPrice(finalPriceHT)
        });
      }

      return formattedCombinations;

    } catch (error) {
      console.error(`Erreur lors de la récupération des déclinaisons pour le produit ${productId}:`, error);
      return [];
    }
  },

  getCategories: async () => {
    try {
      const response = await api.get('/categories?display=full');
      const jsonObj = xmlToJson(response.data);
      const categories = jsonObj?.prestashop?.categories?.category || [];
      return Array.isArray(categories) ? categories : [categories];
    } catch (error) {
      console.error("Error fetching categories", error);
      return [];
    }
  },

  // Helper to format prestashop product for UI
  formatProduct: (p) => {
    if (!p) return null;
    
    const getText = (val) => (val && typeof val === 'object' && val['#text'] !== undefined) ? val['#text'] : val;

    const id = getText(p.id);
    
    let name = 'Unnamed Product';
    if (p.name) {
      if (Array.isArray(p.name.language)) {
        name = getText(p.name.language[0]);
      } else if (p.name.language) {
        name = getText(p.name.language);
      } else {
        name = getText(p.name);
      }
    }

    const priceHT = p.priceHT ? parseFloat(getText(p.priceHT)).toFixed(2) : parseFloat(getText(p.price) || 0).toFixed(2);
    const priceTTC = p.priceTTC ? parseFloat(getText(p.priceTTC)).toFixed(2) : parseFloat(getText(p.price) || 0).toFixed(2);
    
    // Get image specific from prestashop
    const defaultImageId = getText(p.id_default_image);
    const image = defaultImageId ? `${api.defaults.baseURL}/images/products/${id}/${defaultImageId}/?ws_key=${api.defaults.params.ws_key}` : 'https://picsum.photos/300';

    const rawDateAvailability = (getText(p.available_date) !== '0000-00-00' && getText(p.available_date) !== '0000-00-00 00:00:00') ? getText(p.available_date) : getText(p.date_add);
    let marker = null;
    let isNew = getText(p.condition) === 'new';
    
    if (rawDateAvailability) {
      const parsedDate = new Date(rawDateAvailability);
      const now = new Date();
      // On utilise Math.abs au cas où la date est dans le futur (ex: pré-commandes)
      const diffMs = Math.abs(now - parsedDate);
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      console.log(`parsedDate: ${parsedDate}, Diff Jours: ${diffDays}`);
      isNew = false
      
      if (diffDays <= 1) {
        marker = 'HOT';
        isNew = true;
      } else if (diffDays <= 7) {
        marker = 'NEW';
        isNew = true;
      }
    }

    return {
      id,
      name,
      price: priceTTC,
      priceTTC,
      priceHT,
      stock: getNumericValue(p.computed_stock, getNumericValue(p.quantity, 0)),
      isNew,
      marker,
      discount: null, // Depending on specific fields
      image,
      id_category_default: getText(p.id_category_default)
    };
  },

  // Mettre à jour le stock d'un produit
  updateProductStock: async (productId, newQuantity) => {
    try {
      if (!productId && productId !== 0) {
        throw new Error('Identifiant produit manquant');
      }

      // Récupérer le produit complet avec tous ses champs
      const rawProduct = await productService.getProductById(productId);
      if (!rawProduct) {
        throw new Error(`Produit ${productId} non trouvé`);
      }

      // Récupérer la stock_available pour ce produit
      const response = await api.get(`/stock_availables?display=full&filter[id_product]=[${productId}]`);
      const jsonObj = xmlToJson(response.data);
      
      let stockAvailable = jsonObj?.prestashop?.stock_availables?.stock_available;
      if (!Array.isArray(stockAvailable)) {
        stockAvailable = stockAvailable ? [stockAvailable] : [];
      }

      if (stockAvailable.length === 0) {
        throw new Error(`Stock non trouvé pour le produit ${productId}`);
      }

      // Mettre à jour chaque stock_available (il peut y en avoir plusieurs pour les combinaisons)
      const getFieldValue = (obj, field) => {
        if (!obj) return undefined;
        const val = obj[field];
        return val?.value !== undefined ? val.value : val;
      };

      // Pour simplifier, on met à jour le premier (ou tous les stocks du produit base)
      const stockToUpdate = stockAvailable.find((item) => getNumericValue(item?.id_product_attribute, 0) === 0) || stockAvailable[0];
      const stockId = getFieldValue(stockToUpdate, 'id');
      const previousQuantity = getNumericValue(stockToUpdate?.quantity, newQuantity);

      if (!stockId) {
        throw new Error('ID de stock non trouvé');
      }

      // Construire le XML de mise à jour
      const updateXML = `<?xml version="1.0" encoding="UTF-8"?>
  <prestashop>
    <stock_available>
      <id>${stockId}</id>
      <id_product>${productId}</id_product>
      <id_product_attribute>${getFieldValue(stockToUpdate, 'id_product_attribute') || 0}</id_product_attribute>
      <quantity>${newQuantity}</quantity>
      <physical_quantity>${getFieldValue(stockToUpdate, 'physical_quantity') || newQuantity}</physical_quantity>
      <reserved_quantity>${getFieldValue(stockToUpdate, 'reserved_quantity') || 0}</reserved_quantity>
      <depends_on_stock>0</depends_on_stock>
      <out_of_stock>${newQuantity === 0 ? 1 : 0}</out_of_stock>
    </stock_available>
  </prestashop>`;

      const updateResponse = await api.put(`/stock_availables/${stockId}`, updateXML);

      upsertDailyStockEntry(productId, newQuantity, previousQuantity);
      return updateResponse.data;
    } catch (error) {
      throw new Error(`Erreur mise à jour stock: ${error.message}`);
    }
  },

  updateStockByDelta: async (productId, productAttributeId = 0, delta = 0) => {
    try {
      if (!productId && productId !== 0) {
        throw new Error('Identifiant produit manquant');
      }

      const normalizedDelta = Number.parseFloat(delta);
      if (Number.isNaN(normalizedDelta)) {
        throw new Error('Delta de stock invalide');
      }

      const xmlPayload = buildPrestashopXml('stock_delta', {
        id_product: productId,
        id_product_attribute: productAttributeId || 0,
        delta: normalizedDelta
      });

      const response = await api.post('/stock_deltas', xmlPayload, {
        headers: { 'Content-Type': 'application/xml' }
      });

      return response.data;
    } catch (error) {
      throw new Error(`Erreur mise à jour stock via stock_deltas: ${error.message}`);
    }
  },

  getStockDeltas: async (productId) => getStockDeltas(productId),

  getStockEvolutionBetweenDates: async ({ productId, productAttributeId = 0, startDate, endDate }) => {
    if (!productId && productId !== 0) {
      throw new Error('Identifiant produit manquant');
    }

    const normalizedStart = normalizeDateKey(startDate);
    const normalizedEnd = normalizeDateKey(endDate);

    if (!normalizedStart || !normalizedEnd) {
      return {
        product: await productService.getProductById(productId),
        selectedStock: null,
        currentQuantity: 0,
        rows: [],
        movements: []
      };
    }

    const rawProduct = await productService.getProductById(productId);
    if (!rawProduct) {
      throw new Error(`Produit ${productId} non trouvé`);
    }

    const selectedAttrId = Number.parseInt(productAttributeId, 10) || 0;
    const stockBreakdown = ensureArray(rawProduct.stock_breakdown || []);
    const selectedStock = stockBreakdown.find((row) => Number.parseInt(row?.idProductAttribute, 10) === selectedAttrId) || stockBreakdown[0] || {
      idProductAttribute: selectedAttrId,
      label: 'Produit',
      quantity: getNumericValue(rawProduct?.computed_stock, getNumericValue(rawProduct?.quantity, 0))
    };

      const stockLabelByAttribute = stockBreakdown.reduce((acc, row) => {
        acc[String(row.idProductAttribute || 0)] = row.label || (Number.parseInt(row.idProductAttribute, 10) === 0 ? 'Produit mère' : `Déclinaison ${row.idProductAttribute}`);
        return acc;
      }, {});

      // Mode déclinaison (actif)
      const currentQuantity = getNumericValue(selectedStock.quantity, getNumericValue(rawProduct?.computed_stock, getNumericValue(rawProduct?.quantity, 0)));
      // Mode produit global (décommente si tu veux revenir au produit parent)
      // const currentQuantity = getNumericValue(rawProduct?.computed_stock, getNumericValue(rawProduct?.quantity, Number.parseFloat(selectedStock.quantity) || 0));
    const startKey = toDateNumber(normalizedStart) <= toDateNumber(normalizedEnd) ? normalizedStart : normalizedEnd;
    const endKey = toDateNumber(normalizedStart) <= toDateNumber(normalizedEnd) ? normalizedEnd : normalizedStart;
    const deltaRows = normalizeDeltaRows(await getStockDeltas(productId))
      // Mode déclinaison (actif)
      .filter((row) => row.idProductAttribute === selectedAttrId)
      // Mode produit global (décommente si tu veux revenir au produit parent)
      // .filter((row) => row.idProductAttribute !== undefined)
      .filter((row) => row.dateAdd
        && toDateNumber(row.dateAdd) >= toDateNumber(startKey)
        && toDateNumber(row.dateAdd) <= toDateNumber(getTodayKey()));
      const movementMap = aggregateMovementsByDate(deltaRows, stockLabelByAttribute);

    console.debug(`productService.getStockEvolutionBetweenDates: deltas=${deltaRows.length}, movementDates=${Object.keys(movementMap).length}`);

    const rows = resolveDailyEvolution({
      startDate: startKey,
      endDate: endKey,
      currentQuantity,
      movementMap,
      anchorDate: getTodayKey()
    });

    return {
      product: rawProduct,
      selectedStock,
      currentQuantity,
      rows,
      movements: deltaRows
    };
  },

  // Retourne l'évolution journalière du stock d'un produit
  getStockHistory: (productId) => {
    return getStockHistory(productId);
  },

  // Agrège l'historique local en une vue par jour
  getDailyStockEvolution: (productId, currentQuantity = null) => {
    const history = getStockHistory(productId)
      .map((entry) => ({
        ...entry,
        date: entry.date || entry.updatedAt?.slice(0, 10) || getTodayKey(),
        quantity: getNumericValue(entry.quantity, 0),
        previousQuantity: getNumericValue(entry.previousQuantity, 0),
        variation: getNumericValue(entry.variation, 0)
      }))
      .sort((a, b) => new Date(b.updatedAt || b.date) - new Date(a.updatedAt || a.date));

    if (!history.length && currentQuantity !== null && currentQuantity !== undefined) {
      return [{
        date: getTodayKey(),
        quantity: getNumericValue(currentQuantity, 0),
        previousQuantity: getNumericValue(currentQuantity, 0),
        variation: 0,
        updatedAt: new Date().toISOString(),
        source: 'current-stock'
      }];
    }

    const dailyMap = new Map();
    history.forEach((entry) => {
      const key = entry.date;
      const existing = dailyMap.get(key);

      if (!existing || new Date(entry.updatedAt || entry.date) > new Date(existing.updatedAt || existing.date)) {
        dailyMap.set(key, entry);
      }
    });

    return Array.from(dailyMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
  }
};
