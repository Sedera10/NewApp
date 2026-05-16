import Papa from 'papaparse';
import api from './api';
import { xmlToJson } from './Util';
import { resetAllData } from './resetService';
import { buildCategoryXML, buildTaxXML, buildTaxRulesGroupXML, buildTaxRuleXML, buildProductXML } from './xml/importXmlBuilder';

// Implémentation locale de prestashopApi en utilisant votre api.js et xmlToJson
const prestashopApi = {
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
      const key = Object.keys(jsonObj.prestashop).find(k => k !== 'xmlns' && k !== 'xlink');
      return [jsonObj.prestashop[key]]; 
    }
    
    const resourceKey = Object.keys(jsonObj.prestashop).find(k => k !== 'xmlns' && k !== 'xlink');
    if (!resourceKey) return [];
    
    const itemsGroup = jsonObj.prestashop[resourceKey];
    if (!itemsGroup) return [];
    
    const itemKey = Object.keys(itemsGroup)[0];
    if (!itemKey) return [];
    
    const items = itemsGroup[itemKey];
    return Array.isArray(items) ? items : [items];
  }
};
import { buildOrderXML, buildOrderStateXML, buildOrderRowXML, buildOrderHistoryXML } from './xml/ordersXmlBuilder';
import { buildCartXML } from './xml/cartsXmlBuilder';
import { buildOrderDetailXML, buildOrderPaymentXML } from './xml/orderDetailsXmlBuilder';
import { buildCustomerXML, buildAddressXML } from './xml/customersXmlBuilder';

const CONSTANTS = {
  ID_LANG: 1, // FR
  ID_COUNTRY: 8, // France
  ID_SHOP_DEFAULT: 1,
  ID_PARENT_CATEGORY: 2, // Racine
  PAYMENT_MODULE: 'ps_cashondelivery',
  PAYMENT_LABEL: 'Paiement a la livraison',
};

const CSV_SCHEMAS = {
  file1: {
    label: 'Fichier 1',
    expectedHeaders: [
      'date_availability_produit',
      'nom',
      'reference',
      'prix_ttc',
      'Taxe',
      'categorie',
      'prix_achat'
    ],
    fieldMap: {
      dateavailabilityproduit: 'date_availability_produit',
      nom: 'nom',
      reference: 'reference',
      prixttc: 'prix_ttc',
      taxe: 'Taxe',
      categorie: 'categorie',
      prixachat: 'prix_achat'
    }
  },
  file2: {
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
  },
  file3: {
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
  }
};

const normalizeCsvHeader = (value) => (value ?? '')
  .toString()
  .replace(/^\uFEFF/, '')
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, '')
  .replace(/_/g, '');

const normalizeCsvValue = (value) => (value ?? '').toString().trim();

const normalizeCsvRows = (rows, fieldMap) => rows.map((row) => {
  const normalizedRow = {};

  Object.entries(row || {}).forEach(([key, value]) => {
    const normalizedKey = normalizeCsvHeader(key);
    const canonicalKey = fieldMap[normalizedKey] || key.trim();
    normalizedRow[canonicalKey] = value;
  });

  return normalizedRow;
});

const validateCsvHeaders = (headers, expectedHeaders, label) => {
  const actualHeaders = Array.isArray(headers) ? headers : [];
  const normalizedExpected = expectedHeaders.map(normalizeCsvHeader);
  const normalizedActual = actualHeaders.map(normalizeCsvHeader);

  const missing = expectedHeaders.filter((header) => !normalizedActual.includes(normalizeCsvHeader(header)));
  const unexpected = actualHeaders.filter((header) => !normalizedExpected.includes(normalizeCsvHeader(header)));

  if (missing.length || unexpected.length) {
    const parts = [];
    if (missing.length) {
      parts.push(`colonnes manquantes: ${missing.join(', ')}`);
    }
    if (unexpected.length) {
      parts.push(`colonnes non conformes: ${unexpected.join(', ')}`);
    }
    throw new Error(`${label}: ${parts.join(' | ')}`);
  }
};

const isValidDateDMY = (value) => {
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

const getPositiveAmountValue = (value) => {
  const normalized = normalizeCsvValue(value).replace(/\s+/g, '').replace(/[^0-9,.-]/g, '').replace(',', '.');
  if (!normalized) return NaN;
  return Number.parseFloat(normalized);
};

const isPositiveAmount = (value) => Number.isFinite(getPositiveAmountValue(value)) && getPositiveAmountValue(value) > 0;

const createValidationError = (message) => {
  const error = new Error(message);
  error.isValidationError = true;
  return error;
};

const shouldAbortOnError = (error) => error?.isValidationError === true;

/**
 * Parse un fichier CSV générique
 */
const parseCSV = (file, schema) => {
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
            throw new Error('Aucune colonne détectée');
          }

          validateCsvHeaders(fields, schema.expectedHeaders, schema.label);
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

/**
 * Parse le CSV Fichier 1 (Produits de base)
 */
export const parseFile1CSV = (file) => parseCSV(file, CSV_SCHEMAS.file1);

/**
 * Parse le CSV Fichier 2 (Variantes et Stock)
 */
export const parseFile2CSV = (file) => parseCSV(file, CSV_SCHEMAS.file2);

/**
 * Parse le CSV Fichier 3 (Commandes et Clients)
 */
export const parseFile3CSV = (file) => parseCSV(file, CSV_SCHEMAS.file3);

const normalizeNumber = (value) => {
  if (!value) return 0;
  return parseFloat(value.toString().replace('%', '').replace(',', '.'));
};

const roundDecimal = (value, decimals = 6) => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

const convertTTCtoHT = (priceTTC, taxRate) => {
  const rate = normalizeNumber(taxRate);
  const ttc = normalizeNumber(priceTTC);
  const ht = ttc / (1 + (rate / 100));
  return roundDecimal(ht);
};


const convertDateFormat = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr; 
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};




const normalizeKey = (key) => {
  return key?.trim().toLowerCase().replace(/\s+/g, '') || '';
};

const extractCategories = (csvData) => {
  const categories = {};
  csvData.forEach(row => {
    const catName = row.categorie?.trim();
    if (catName && !categories[catName]) {
      categories[catName] = true;
    }
  });
  return Object.keys(categories);
};


const extractTaxes = (csvData) => {
  const taxes = {};
  csvData.forEach(row => {
    const taxRate = row.Taxe?.trim();
    if (taxRate && !taxes[taxRate]) {
      taxes[taxRate] = `TVA ${taxRate}`;
    }
  });
  return taxes;
};


export const importFile1 = async (csvFile, onProgress = () => {}) => {
  const results = {
    categories: [],
    taxes: [],
    taxRulesGroups: [],
    taxRules: [],
    products: [],
    errors: [],
    summary: {}
  };

  try {
    onProgress?.({ step: 'parsing', message: 'Parsing du CSV...' });
    const csvData = await parseFile1CSV(csvFile);

    if (!csvData || csvData.length === 0) {
      throw new Error('Fichier CSV vide');
    }

    // ============================================
    // 1. CRÉER LES CATÉGORIES
    // ============================================
    onProgress?.({ step: 'categories', message: 'Création des catégories...' });
    const categories = extractCategories(csvData);
    const categoryMap = {}; // Map nom → id

    for (const categoryName of categories) {
      try {
        const xml = buildCategoryXML(categoryName);
        const response = await prestashopApi.createResource('categories', xml);

        console.log(`DEBUG Category Response:`, JSON.stringify(response, null, 2));

        const categoryId = response.category?.id;

        if (!categoryId) {
          console.warn(`⚠️ Pas d'ID retourné pour catégorie:`, { categoryName, response });
        }

        results.categories.push({
          name: categoryName,
          id: categoryId,
          status: 'success'
        });

        categoryMap[categoryName] = categoryId;
        console.log(`✓ Catégorie créée: ${categoryName} (ID: ${categoryId})`);
      } catch (error) {
        results.categories.push({
          name: categoryName,
          status: 'error',
          error: error.message
        });
        results.errors.push(`Catégorie '${categoryName}': ${error.message}`);
      }
    }

    // ============================================
    // 2. CRÉER LES TAXES
    // ============================================
    onProgress?.({ step: 'taxes', message: 'Création des taxes...' });
    const taxes = extractTaxes(csvData);
    const taxMap = {}; // Map rate → id

    for (const [rate, name] of Object.entries(taxes)) {
      try {
        const xml = buildTaxXML(name, rate);
        const response = await prestashopApi.createResource('taxes', xml);

        console.log(`DEBUG Tax Response:`, JSON.stringify(response, null, 2));

        const taxId = response.tax?.id;

        if (!taxId) {
          console.warn(`⚠️ Pas d'ID retourné pour taxe:`, { rate, response });
        }

        results.taxes.push({
          rate,
          name,
          id: taxId,
          status: 'success'
        });

        taxMap[rate] = taxId;
        console.log(`✓ Taxe créée: ${rate} (ID: ${taxId})`);
      } catch (error) {
        results.taxes.push({
          rate,
          name,
          status: 'error',
          error: error.message
        });
        results.errors.push(`Taxe '${rate}': ${error.message}`);
      }
    }

    // ============================================
    // 3. CRÉER LES GROUPES DE RÈGLES DE TAXE
    // ============================================
    onProgress?.({ step: 'taxRulesGroups', message: 'Création des groupes de taxes...' });
    const taxRulesGroupMap = {}; // Map rate → id

    for (const [rate, name] of Object.entries(taxes)) {
      try {
        const groupName = `Groupe TVA ${rate}`;
        const xml = buildTaxRulesGroupXML(groupName);
        const response = await prestashopApi.createResource('tax_rule_groups', xml);

        console.log(`DEBUG TaxRulesGroup Response:`, JSON.stringify(response, null, 2));

        const groupId = response.tax_rule_group?.id;

        if (!groupId) {
          console.warn(`⚠️ Pas d'ID retourné pour groupe de taxe:`, { rate, response });
        }

        results.taxRulesGroups.push({
          rate,
          groupName,
          id: groupId,
          status: 'success'
        });

        taxRulesGroupMap[rate] = groupId;
        console.log(`✓ Groupe de taxe créé: ${rate} (ID: ${groupId})`);
      } catch (error) {
        results.taxRulesGroups.push({
          rate,
          status: 'error',
          error: error.message
        });
        results.errors.push(`Groupe de taxe '${rate}': ${error.message}`);
      }
    }

    // ============================================
    // 4. CRÉER LES RÈGLES DE TAXE
    // ============================================
    onProgress?.({ step: 'taxRules', message: 'Création des règles de taxe...' });

    for (const [rate, taxId] of Object.entries(taxMap)) {
      try {
        const groupId = taxRulesGroupMap[rate];
        if (!groupId) throw new Error(`Groupe de taxe non trouvé pour ${rate}`);

        const xml = buildTaxRuleXML(groupId, taxId);
        const response = await prestashopApi.createResource('tax_rules', xml);

        console.log(`DEBUG TaxRule Response:`, JSON.stringify(response, null, 2));

        const ruleId = response.tax_rule?.id;

        results.taxRules.push({
          rate,
          taxId,
          groupId,
          ruleId,
          status: 'success'
        });
      } catch (error) {
        results.taxRules.push({
          rate,
          status: 'error',
          error: error.message
        });
        results.errors.push(`Règle de taxe '${rate}': ${error.message}`);
      }
    }

    // ============================================
    // 5. CRÉER LES PRODUITS
    // ============================================
    onProgress?.({ step: 'products', message: 'Création des produits...' });

    for (let i = 0; i < csvData.length; i++) {
      const productData = csvData[i];

      try {
        // Trim les données du CSV
        const categoryName = productData.categorie?.trim();
        const taxRate = productData.Taxe?.trim();
        const availabilityDate = productData.date_availability_produit?.trim();

        if (!availabilityDate || !isValidDateDMY(availabilityDate)) {
          throw createValidationError(`Ligne ${i + 1}: date_availability_produit invalide, format attendu DD/MM/YYYY`);
        }

        if (!isPositiveAmount(productData.prix_ttc)) {
          throw createValidationError(`Ligne ${i + 1}: prix_ttc doit être un montant positif`);
        }

        if (!isPositiveAmount(productData.prix_achat)) {
          throw createValidationError(`Ligne ${i + 1}: prix_achat doit être un montant positif`);
        }

        const idCategory = categoryMap[categoryName];
        const idTaxRulesGroup = taxRulesGroupMap[taxRate];

        if (!idCategory) throw new Error(`Catégorie '${categoryName}' non trouvée`);
        if (!idTaxRulesGroup) throw new Error(`Groupe de taxe '${taxRate}' non trouvé`);

        const xml = buildProductXML(productData, idCategory, idTaxRulesGroup);
        console.log(`DEBUG Product XML for ${productData.reference}:`, xml);
        const response = await prestashopApi.createResource('products', xml);
        const productId = response.product?.id;

        results.products.push({
          reference: productData.reference,
          name: productData.nom,
          id: productId,
          priceHT: convertTTCtoHT(productData.prix_ttc, productData.Taxe),
          taxRate: normalizeNumber(productData.Taxe),
          status: 'success'
        });

        onProgress?.({
          step: 'products',
          message: `Création des produits... (${i + 1}/${csvData.length})`,
          progress: ((i + 1) / csvData.length) * 100
        });
      } catch (error) {
        if (shouldAbortOnError(error)) {
          throw error;
        }
        results.products.push({
          reference: productData.reference,
          name: productData.nom,
          status: 'error',
          error: error.message
        });
        results.errors.push(`Produit '${productData.reference}': ${error.message}`);
      }
    }

    // ============================================
    // RÉSUMÉ
    // ============================================
    results.summary = {
      totalCategories: results.categories.length,
      successCategories: results.categories.filter(c => c.status === 'success').length,
      totalTaxes: results.taxes.length,
      successTaxes: results.taxes.filter(t => t.status === 'success').length,
      totalTaxRulesGroups: results.taxRulesGroups.length,
      successTaxRulesGroups: results.taxRulesGroups.filter(t => t.status === 'success').length,
      totalTaxRules: results.taxRules.length,
      successTaxRules: results.taxRules.filter(t => t.status === 'success').length,
      totalProducts: results.products.length,
      successProducts: results.products.filter(p => p.status === 'success').length,
      totalErrors: results.errors.length
    };

    onProgress?.({ step: 'complete', message: 'Import terminé!' });

    return results;
  } catch (error) {
    results.errors.push(`Erreur générale: ${error.message}`);
    throw error;
  }
};


/**
 * Extrait les groupes d'attributs uniques (taille, couleur, etc.)
 */
const extractAttributeGroups = (csvData) => {
  const groups = {};
  csvData.forEach(row => {
    const specificite = row.specificité?.trim();
    if (specificite && !groups[specificite]) {
      groups[specificite] = true;
    }
  });
  return Object.keys(groups);
};

/**
 * Extrait les attributs uniques par groupe
 * Retourne: { "taille": ["ngoza", "kely"], "couleur": ["mainty", "fotsy"] }
 */
const extractAttributesByGroup = (csvData) => {
  const attributes = {};
  csvData.forEach(row => {
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

/**
 * Construit le XML pour un groupe d'attributs
 */
const buildAttributeGroupXML = (name) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <product_option>
    <name>
      <language id="${CONSTANTS.ID_LANG}"><![CDATA[${name}]]></language>
    </name>
    <public_name>
      <language id="${CONSTANTS.ID_LANG}"><![CDATA[${name}]]></language>
    </public_name>
    <group_type>select</group_type>
    <position>0</position>
  </product_option>
</prestashop>`;
};

/**
 * Construit le XML pour une valeur d'attribut
 */
const buildAttributeXML = (name, idAttributeGroup) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <product_option_value>
    <id_attribute_group>${idAttributeGroup}</id_attribute_group>
    <name>
      <language id="${CONSTANTS.ID_LANG}"><![CDATA[${name}]]></language>
    </name>
    <position>0</position>
  </product_option_value>
</prestashop>`;
};

/**
 * Construit le XML pour une combinaison (variante)
 */
const buildCombinationXML = (productData, attributeIds, priceImpact = 0) => {
  // Structure correcte pour Prestashop: associations avec product_option_values
  const productOptionValuesXML = attributeIds
    .map(id => `      <product_option_value>
        <id>${id}</id>
      </product_option_value>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <combination>
    <id_product>${productData.id_product}</id_product>
    <reference><![CDATA[${productData.reference}]]></reference>
    <price>${priceImpact}</price>
    <minimal_quantity>1</minimal_quantity>
    <associations>
      <product_option_values>
${productOptionValuesXML}
      </product_option_values>
    </associations>
  </combination>
</prestashop>`;
};

/**
 * Import complet du Fichier 2 (Variantes et Stock)
 * Dépendance: Fichier 1 doit être importé d'abord
 */
export const importFile2 = async (csvFile, file1Results, onProgress = () => {}) => {
  const results = {
    attributeGroups: [],
    attributes: [],
    combinations: [],
    stocks: [],
    errors: [],
    summary: {}
  };

  try {
    onProgress?.({ step: 'parsing', message: 'Parsing du CSV Fichier 2...' });
    const csvData = await parseFile2CSV(csvFile);

    if (!csvData || csvData.length === 0) {
      throw new Error('Fichier CSV vide');
    }

    // Créer une map des produits du Fichier 1 (reference → id_product)
    const productMap = {};
    file1Results.products.forEach(p => {
      if (p.status === 'success' && p.id) {
        productMap[p.reference] = p.id;
      }
    });

    // ============================================
    // 1. CRÉER LES GROUPES D'ATTRIBUTS
    // ============================================
    onProgress?.({ step: 'attributeGroups', message: 'Création des groupes d\'attributs...' });
    const attributeGroups = extractAttributeGroups(csvData);
    const attributeGroupMap = {}; // Map nom → id

    for (const groupName of attributeGroups) {
      try {
        const xml = buildAttributeGroupXML(groupName);
        const response = await prestashopApi.createResource('product_options', xml);

        console.log(`DEBUG AttributeGroup Response:`, JSON.stringify(response, null, 2));

        const groupId = response.product_option_group?.id || response.product_option?.id;

        if (!groupId) {
          console.warn(`⚠️ Pas d'ID retourné pour groupe attribut:`, { groupName, response });
        }

        results.attributeGroups.push({
          name: groupName,
          id: groupId,
          status: 'success'
        });

        attributeGroupMap[groupName] = groupId;
        console.log(`✓ Groupe attribut créé: ${groupName} (ID: ${groupId})`);
      } catch (error) {
        results.attributeGroups.push({
          name: groupName,
          status: 'error',
          error: error.message
        });
        results.errors.push(`Groupe attribut '${groupName}': ${error.message}`);
      }
    }

    // ============================================
    // 2. CRÉER LES ATTRIBUTS (VALEURS)
    // ============================================
    onProgress?.({ step: 'attributes', message: 'Création des attributs...' });
    const attributesByGroup = extractAttributesByGroup(csvData);
    const attributeMap = {}; // Map "groupe:valeur" → id

    for (const [groupName, values] of Object.entries(attributesByGroup)) {
      const groupId = attributeGroupMap[groupName];
      if (!groupId) {
        results.errors.push(`Groupe attribut '${groupName}' non trouvé`);
        continue;
      }

      for (const valueName of Object.keys(values)) {
        try {
          const xml = buildAttributeXML(valueName, groupId);
          const response = await prestashopApi.createResource('product_option_values', xml);

          console.log(`DEBUG Attribute Response:`, JSON.stringify(response, null, 2));

          const attributeId = response.product_option_value?.id;

          if (!attributeId) {
            console.warn(`⚠️ Pas d'ID retourné pour attribut:`, { valueName, response });
          }

          const key = `${groupName}:${valueName}`;
          results.attributes.push({
            group: groupName,
            value: valueName,
            id: attributeId,
            status: 'success'
          });

          attributeMap[key] = attributeId;
          console.log(`✓ Attribut créé: ${key} (ID: ${attributeId})`);
        } catch (error) {
          results.attributes.push({
            group: groupName,
            value: valueName,
            status: 'error',
            error: error.message
          });
          results.errors.push(`Attribut '${groupName}:${valueName}': ${error.message}`);
        }
      }
    }

    // ============================================
    // 3. CRÉER LES COMBINAISONS
    // ============================================
    onProgress?.({ step: 'combinations', message: 'Création des combinaisons...' });

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const reference = row.reference?.trim();
      const specificite = row.specificité?.trim();
      const valeur = row.karazany?.trim();
      const stock = normalizeNumber(row.stock_initial);
      const prixVente = row.prix_vente_ttc?.trim();

      if (!reference) continue;

      const idProduct = productMap[reference];
      if (!idProduct) {
        results.errors.push(`Produit '${reference}' du Fichier 1 non trouvé`);
        continue;
      }

      try {
        if (prixVente && !isPositiveAmount(prixVente)) {
          throw createValidationError(`Ligne ${i + 1}: prix_vente_ttc doit être un montant positif`);
        }

        // Cas 1: Produit SANS variante
        if (!specificite || !valeur) {
          // Juste mettre à jour le stock du produit
          results.stocks.push({
            reference,
            idProduct,
            type: 'product',
            quantity: stock,
            status: 'pending'
          });
          console.log(`✓ Produit sans variante: ${reference} stock=${stock}`);
          continue;
        }

        // Cas 2: Produit AVEC variante
        const attributeKey = `${specificite}:${valeur}`;
        const attributeId = attributeMap[attributeKey];

        if (!attributeId) {
          throw new Error(`Attribut '${attributeKey}' non trouvé`);
        }

        // Récupérer le produit du Fichier 1 pour obtenir son taux de taxe
        const product1 = file1Results.products.find(p => p.reference === reference);
        const productPriceHT = product1?.priceHT || 0;
        const productTaxRate = product1?.taxRate || 0;

        // Calculer l'impact prix si fourni
        let priceImpact = 0;
        if (prixVente) {
          const prixVenteHT = convertTTCtoHT(prixVente, productTaxRate);
          priceImpact = roundDecimal(prixVenteHT - productPriceHT);
        }

        const xml = buildCombinationXML(
          { id_product: idProduct, reference: `${reference}-${valeur}` },
          [attributeId],
          priceImpact
        );

        console.log(`DEBUG Combination XML for ${reference}-${valeur}:`, xml);

        const response = await prestashopApi.createResource('combinations', xml);
        const combinationId = response.combination?.id;

        if (!combinationId) {
          throw new Error(`Pas d'ID retourné pour combinaison`);
        }

        results.combinations.push({
          product: reference,
          attribute: `${specificite}:${valeur}`,
          id: combinationId,
          priceImpact,
          status: 'success'
        });

        // Ajouter le stock de la combinaison
        results.stocks.push({
          reference,
          idProduct,
          type: 'combination',
          id_product_attribute: combinationId,
          quantity: stock,
          status: 'pending'
        });

        onProgress?.({
          step: 'combinations',
          message: `Création des combinaisons... (${i + 1}/${csvData.length})`,
          progress: ((i + 1) / csvData.length) * 100
        });
      } catch (error) {
        if (shouldAbortOnError(error)) {
          throw error;
        }
        results.errors.push(`Produit '${reference}': ${error.message}`);
      }
    }

    // ============================================
    // 4. GÉRER LES STOCKS
    // ============================================
    onProgress?.({ step: 'stocks', message: 'Mise à jour des stocks...' });

    // Récupérer tous les stock_availables une seule fois
    const allStockAvailables = await prestashopApi.getResources('stock_availables', null, null, {
      display: 'full'
    });

    console.log(`DEBUG STOCK: Total stock_availables: ${allStockAvailables.length}`);

    const getFieldValue = (obj, field) => {
      if (!obj) return undefined;
      const val = obj[field];
      return val?.value !== undefined ? val.value : val;
    };

    for (const stock of results.stocks) {
      try {
        if (stock.status !== 'pending') continue;

        const idProductAttribute = stock.type === 'product' ? 0 : stock.id_product_attribute;

        // Chercher dans ps_stock_available
        const existingStockAvailable = allStockAvailables.find(s => {
          const sIdProduct = getFieldValue(s, 'id_product');
          const sIdAttr = getFieldValue(s, 'id_product_attribute');

          return parseInt(sIdProduct) === parseInt(stock.idProduct) &&
                 parseInt(sIdAttr) === parseInt(idProductAttribute);
        });

        if (!existingStockAvailable) {
          throw new Error(`Stock_available non trouvé pour ${stock.reference} (id_product: ${stock.idProduct}, id_product_attribute: ${idProductAttribute})`);
        }

        // Mettre à jour ps_stock_available avec TOUS les champs existants + modifications
        const stockFields = [
          'id',
          'id_product',
          'id_product_attribute',
          'id_shop',
          'id_shop_group',
          'quantity',
          'physical_quantity',
          'reserved_quantity',
          'depends_on_stock',
          'out_of_stock'
        ];

        let updateAvailableXML = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop>
  <stock_available>`;

        for (const field of stockFields) {
          let value;

          if (field === 'quantity') {
            // Mettre à jour la quantité
            value = stock.quantity;
          } else if (field === 'depends_on_stock') {
            // Mettre à jour depends_on_stock à 0
            value = 0;
          } else if (field === 'id') {
            // Toujours inclure l'ID
            value = existingStockAvailable.id;
          } else {
            // Récupérer depuis le stock existant
            value = getFieldValue(existingStockAvailable, field);
          }

          if (value !== undefined && value !== null) {
            updateAvailableXML += `
    <${field}>${value}</${field}>`;
          }
        }

        updateAvailableXML += `
  </stock_available>
</prestashop>`;

        console.log(`DEBUG STOCK: UPDATE ps_stock_available ID ${existingStockAvailable.id}: ${stock.reference} = ${stock.quantity}`);
        console.log(`DEBUG STOCK: XML complet:`, updateAvailableXML);
        await prestashopApi.updateResource('stock_availables', existingStockAvailable.id, updateAvailableXML);
        console.log(`✓ Stock mis à jour: ${stock.reference} = ${stock.quantity}`);
        stock.status = 'success';
      } catch (error) {
        stock.status = 'error';
        results.errors.push(`Stock '${stock.reference}': ${error.message}`);
      }
    }

    // ============================================
    // RÉSUMÉ
    // ============================================
    results.summary = {
      totalAttributeGroups: results.attributeGroups.length,
      successAttributeGroups: results.attributeGroups.filter(a => a.status === 'success').length,
      totalAttributes: results.attributes.length,
      successAttributes: results.attributes.filter(a => a.status === 'success').length,
      totalCombinations: results.combinations.length,
      successCombinations: results.combinations.filter(c => c.status === 'success').length,
      totalStocks: results.stocks.length,
      successStocks: results.stocks.filter(s => s.status === 'success').length,
      totalErrors: results.errors.length
    };

    onProgress?.({ step: 'complete', message: 'Import Fichier 2 terminé!' });

    return results;
  } catch (error) {
    results.errors.push(`Erreur générale: ${error.message}`);
    throw error;
  }
};

// ============================================
// FICHIER 3: COMMANDES & CLIENTS
// ============================================

const ensureMd5Like = (value) => {
  const lower = (value || '').toLowerCase();
  if (/^[a-f0-9]{32}$/.test(lower)) {
    return lower;
  }
  return '0123456789abcdef0123456789abcdef';
};

const getPrimitiveValue = (value) => {
  if (value && typeof value === 'object') {
    if (value['#text'] !== undefined) return value['#text'];
    if (value.value !== undefined) return value.value;
  }
  return value;
};

const findOrderByCartId = async ({ cartId, customerId }) => {
  const orders = await prestashopApi.getResources('orders', null, null, {
    display: 'full',
    'filter[id_cart]': `[${cartId}]`
  });

  return orders.find(order => {
    const orderCartId = String(getPrimitiveValue(order?.id_cart) || '').trim();
    const orderCustomerId = String(getPrimitiveValue(order?.id_customer) || '').trim();
    return orderCartId === String(cartId) && orderCustomerId === String(customerId);
  }) || null;
};

const getPaymentMethodLabel = (paymentState) => {
  const normalizedState = (paymentState || '').toString().toLowerCase();

  if (normalizedState.includes('livraison')) {
    return 'Paiement a la livraison';
  }

  return 'Paiement';
};

const normalizeStatusLabel = (value) => (value || '')
  .toString()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

const getOrderStateName = (orderState) => {
  const name = orderState?.name;

  if (typeof name === 'string') {
    return name;
  }

  if (Array.isArray(name?.language)) {
    const preferredLanguage = name.language.find(language => String(language?.['@_id']) === String(CONSTANTS.ID_LANG)) || name.language[0];
    return getPrimitiveValue(preferredLanguage);
  }

  if (name?.language) {
    return getPrimitiveValue(name.language);
  }

  return getPrimitiveValue(name);
};

const getExistingOrderStateId = (stateName, orderStates) => {
  const normalizedWanted = normalizeStatusLabel(stateName);
  const states = Array.isArray(orderStates) ? orderStates : [];

  const exactMatch = states.find((state) => normalizeStatusLabel(getOrderStateName(state)) === normalizedWanted);
  if (exactMatch?.id) {
    return Number.parseInt(exactMatch.id, 10) || null;
  }

  const fallbackMatch = states.find((state) => {
    const normalizedState = normalizeStatusLabel(getOrderStateName(state));
    return normalizedState.includes(normalizedWanted) || normalizedWanted.includes(normalizedState);
  });

  return fallbackMatch?.id ? (Number.parseInt(fallbackMatch.id, 10) || null) : null;
};


/**
 * Parse le champ "achat" au format [(ref;qty;variante)]
 * Exemple: [("T_01";3;"ngoza"),("C_03";1;"")]
 */
const parseAchatField = (achatField) => {
  try {
    if (!achatField) return [];
    
    console.log(`DEBUG parseAchatField INPUT:`, achatField);
    
    // Nettoyer les caractères d'échappement JSON
    let cleaned = achatField
      .replace(/^\[/, '').replace(/\]$/, '') // Enlever [ et ]
      .replace(/^\(/, '').replace(/\)$/, '') // Enlever ( et )
      .replace(/""/g, '"');  // Remplacer "" par "
    
    console.log(`DEBUG parseAchatField CLEANED:`, cleaned);
    
    // Diviser par ),( pour séparer les articles
    const items = cleaned.split('),(');
    console.log(`DEBUG parseAchatField SPLIT ITEMS COUNT:`, items.length, 'ITEMS:', items);

    return items.map(item => {
      // Nettoyer les parenthèses/guillemets des extrémités
      item = item.replace(/^\(/, '').replace(/\)$/, '').trim();
      
      // Splitter par ; mais pas dans les chaînes entre guillemets
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
    }).filter(item => item.reference); // Filtrer les articles vides
  } catch (error) {
    console.error('Erreur parsing achat:', error, 'achatField:', achatField);
    return [];
  }
};

/**
 * Import Fichier 3: Commandes et Clients
 */
export const importFile3 = async (file, file1Results, file2Results, onProgress) => {
  const results = {
    customers: [],
    addresses: [],
    orders: [],
    orderDetails: [],
    errors: [],
    summary: {}
  };

  try {
    // Parser le CSV
    const csvData = await parseFile3CSV(file);

    if (!csvData || csvData.length === 0) {
      throw new Error('Fichier CSV vide');
    }

    // Créer une map des produits et variantes
    const productMap = {};
    file1Results.products.forEach(p => {
      if (p.status === 'success' && p.id) {
        productMap[p.reference] = { id: p.id, name: p.name, priceHT: p.priceHT, taxRate: p.taxRate };
      }
    });

    const combinationMap = {};
    const combinationPriceMap = {};
    file2Results.combinations.forEach(c => {
      if (c.status === 'success') {
        const optionName = (c.attribute || '').split(':').pop();
        const key = `${c.product}:${normalizeKey(optionName)}`;
        combinationMap[key] = c.id;
        // priceImpact was stored during combinaison creation (difference HT)
        combinationPriceMap[key] = Number.parseFloat(c.priceImpact || 0) || 0;
      }
    });

    // Récupérer les order_states
    const orderStates = await prestashopApi.getResources('order_states', null, null, { display: 'full' });
    const carriers = await prestashopApi.getResources('carriers', null, null, { display: 'full' });
    const activeCarrier = carriers.find(c => parseInt(c.active) === 1 && parseInt(c.deleted || 0) === 0);
    const defaultCarrierId = activeCarrier?.id || 1;
    
    // Cache des clients existants pour éviter les appels répétés
    let existingCustomers = [];
    try {
      existingCustomers = await prestashopApi.getResources('customers', null, null, { display: 'full' });
    } catch (error) {
      console.warn('⚠️ Impossible de récupérer les clients existants:', error.message);
    }

    onProgress?.({ step: 'customers', message: 'Création des clients...' });

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];

      try {
        // Données du client
        const email = (row.email?.trim() || '').toLowerCase();
        const nom = row.nom?.trim();
        const pwd = row.pwd?.trim();
        const adresse = row.adresse?.trim();
        const achatField = row.achat?.trim();
        const etat = row.etat?.trim();
        const rawDate = row.date?.trim();

        if (!rawDate || !isValidDateDMY(rawDate)) {
          throw createValidationError(`Ligne ${i + 1}: date invalide pour ${email} (format attendu DD/MM/YYYY)`);
        }

        const dateCmd = convertDateFormat(rawDate);

        // Validation des données
        if (!email || !nom || !pwd) {
          results.errors.push(`Ligne ${i + 1}: Données client incomplètes (email, nom ou pwd manquant)`);
          continue;
        }

        if (!adresse) {
          results.errors.push(`Ligne ${i + 1}: Adresse manquante pour ${email}`);
          continue;
        }

        if (!achatField) {
          results.errors.push(`Ligne ${i + 1}: Articles d'achat manquants pour ${email}`);
          continue;
        }

        // ÉTAPE 1: Chercher ou créer le customer
        let customerId = null;
        let customerSecureKey = null;
        let customerShopGroup = 1;
        let isNewCustomer = false;
        
        // Vérifier si le client existe déjà
        const existingCustomer = existingCustomers.find(c => {
          const customerEmail = (c.email?.value || c.email || '').toLowerCase().trim();
          return customerEmail === email;
        });

        if (existingCustomer) {
          customerId = existingCustomer.id;
          customerSecureKey = getPrimitiveValue(existingCustomer.secure_key);
          customerShopGroup = parseInt(getPrimitiveValue(existingCustomer.id_shop_group)) || 1;
          console.log(`✓ Client trouvé: ${email} (ID: ${customerId})`);
        } else {
          try {
            // Créer le customer
            const customerXML = buildCustomerXML({
              firstname: nom,
              lastname: nom,
              email: email,
              passwd: pwd
            });

            console.log(`DEBUG File3: Customer XML (ligne ${i + 1}):`, customerXML);
            const custResponse = await prestashopApi.createResource('customers', customerXML);
            customerId = custResponse.customer?.id;
            customerSecureKey = getPrimitiveValue(custResponse.customer?.secure_key);
            customerShopGroup = parseInt(getPrimitiveValue(custResponse.customer?.id_shop_group)) || 1;

            if (!customerId) {
              throw new Error(`Pas d'ID retourné pour le client ${email}`);
            }

            results.customers.push({
              email,
              nom,
              id: customerId,
              status: 'success'
            });
            
            isNewCustomer = true;
            existingCustomers.push({
              id: customerId,
              email: email,
              secure_key: customerSecureKey,
              id_shop_group: customerShopGroup
            }); // Ajouter au cache
            console.log(`✓ Client créé: ${email} (ID: ${customerId})`);
          } catch (error) {
            if (shouldAbortOnError(error)) {
              throw error;
            }
            results.errors.push(`Client '${email}': ${error.message}`);
            continue; // Passer à la ligne suivante si le client ne peut pas être créé
          }
        }

        // ÉTAPE 2: Créer l'adresse
        try {
          const addressXML = buildAddressXML({
            id_customer: customerId,
            id_country: CONSTANTS.ID_COUNTRY,
            firstname: nom,
            lastname: nom,
            address1: adresse,
            city: 'Antananarivo'
          });

          const addrResponse = await prestashopApi.createResource('addresses', addressXML);
          const addressId = addrResponse.address?.id;

          if (!addressId) {
            throw new Error(`Pas d'ID retourné pour l'adresse`);
          }

          results.addresses.push({
            customer: email,
            address: adresse,
            id: addressId,
            status: 'success'
          });
          console.log(`✓ Adresse créée: ${adresse} (ID: ${addressId})`);

          // Parser les articles de la commande
          const items = parseAchatField(achatField);
          
          if (!items || items.length === 0) {
            results.errors.push(`Ligne ${i + 1}: Articles d'achat vides pour ${email}`);
            continue;
          }

          let totalPaid = 0;
          let totalProducts = 0;
          let totalProductsWT = 0;

          console.log(`DEBUG File3 totals calc - ITEMS PARSED:`, JSON.stringify(items, null, 2));
          console.log(`DEBUG File3 totals calc - PRODUCTMAP KEYS:`, Object.keys(productMap));

          // Calculer les totaux
          for (const item of items) {
            const product = productMap[item.reference];
            console.log(`DEBUG File3 item [${item.reference}]: qty=${item.quantity}, found=${!!product}`, product);
            if (product) {
              // Calculer l'augmentation liée à la déclinaison (le cas échéant)
              const variantKey = item.variante ? `${item.reference}:${normalizeKey(item.variante)}` : null;
              const priceImpact = variantKey ? (combinationPriceMap[variantKey] || 0) : 0;

              // Prix HT final = prix produit HT + impact de la combinaison
              const finalPriceHT = roundDecimal(Number.parseFloat(product.priceHT || 0) + Number.parseFloat(priceImpact || 0));

              const priceTTC = roundDecimal(finalPriceHT * (1 + product.taxRate / 100));
              const itemTotalTTC = roundDecimal(priceTTC * item.quantity);
              const itemTotalHT = roundDecimal(finalPriceHT * item.quantity);

              console.log(`  → basePriceHT=${product.priceHT}, priceImpact=${priceImpact}, finalPriceHT=${finalPriceHT}, tax=${product.taxRate}%`);
              console.log(`  → priceTTC=${priceTTC}, qty=${item.quantity}`);
              console.log(`  → itemTotalTTC=${itemTotalTTC}, itemTotalHT=${itemTotalHT}`);

              totalPaid = roundDecimal(totalPaid + itemTotalTTC);
              totalProducts = roundDecimal(totalProducts + itemTotalHT);
              totalProductsWT = roundDecimal(totalProductsWT + itemTotalTTC);

              console.log(`  → cumulative: totalPaid=${totalPaid}, totalProducts=${totalProducts}`);
            } else {
              console.warn(`⚠️ Produit '${item.reference}' non trouvé pour la commande`);
            }
          }
          console.log(`DEBUG File3 FINAL TOTALS: totalPaid=${totalPaid}, totalProducts=${totalProducts}, totalProductsWT=${totalProductsWT}`);

          if (totalPaid <= 0) {
            throw createValidationError(`Ligne ${i + 1}: Total de commande invalide pour ${email}`);
          }

          // ÉTAPE 3: Créer le panier (obligatoire pour créer une commande via l'API)
          try {
            const secureKey = ensureMd5Like((customerSecureKey || '').toString());
            const cartItems = items
              .map(item => {
                const product = productMap[item.reference];
                if (!product) return null;

                const variantId = item.variante
                  ? combinationMap[`${item.reference}:${normalizeKey(item.variante)}`] || 0
                  : 0;

                return {
                  id_product: product.id,
                  id_product_attribute: variantId,
                  quantity: item.quantity
                };
              })
              .filter(Boolean);

            if (cartItems.length === 0) {
              results.errors.push(`Commande pour '${email}': aucun produit valide dans le panier`);
              continue;
            }

            const cartXML = buildCartXML({
              id_customer: customerId,
              id_address_delivery: addressId,
              id_address_invoice: addressId,
              id_currency: 1,
              id_lang: CONSTANTS.ID_LANG,
              id_shop: CONSTANTS.ID_SHOP_DEFAULT,
              id_shop_group: customerShopGroup,
              id_carrier: defaultCarrierId,
              secure_key: secureKey,
              date_add: `${dateCmd} 00:00:00`,
              items: cartItems
            });

            const orderRows = cartItems.map(item => ({
              productId: item.id_product,
              productAttributeId: item.id_product_attribute || 0,
              productQuantity: item.quantity,
              customizationId: 0
            }));

            console.log(`DEBUG File3: Cart XML (ligne ${i + 1}):`, cartXML);
            const cartResponse = await prestashopApi.createResource('carts', cartXML);
            const cartId = cartResponse.cart?.id;

            if (!cartId) {
              throw new Error(`Pas d'ID retourné pour le panier`);
            }

            const normalizedStatus = normalizeStatusLabel(etat);

            // CONDITION: Si etat === "dans le panier" OU vide, créer SEULEMENT le cart (pas la commande)
            if (normalizedStatus && normalizedStatus !== 'dans le panier') {
              // ÉTAPE 4: Créer la commande
              const shouldCreateCancellationHistory = normalizedStatus === 'annule';
              const cancelledStateId = shouldCreateCancellationHistory
                ? getExistingOrderStateId('annulé', orderStates)
                : null;

              const orderXML = buildOrderXML({
                id_customer: customerId,
                id_address: addressId,
                id_cart: cartId,
                id_carrier: defaultCarrierId,
                id_shop_group: customerShopGroup,
                id_shop: CONSTANTS.ID_SHOP_DEFAULT,
                id_lang: CONSTANTS.ID_LANG,
                module: CONSTANTS.PAYMENT_MODULE,
                payment: CONSTANTS.PAYMENT_LABEL,
                secure_key: secureKey,
                current_state: 11,
                date_add: `${dateCmd} 00:00:00`,
                date_upd: `${dateCmd} 00:00:00`,
                total_paid: roundDecimal(totalPaid),
                total_products: roundDecimal(totalProducts),
                total_products_wt: roundDecimal(totalProductsWT),
              });

              console.log(`DEBUG File3: Order XML (ligne ${i + 1}):`, orderXML);
              let orderId = null;

              try {
                const orderResponse = await prestashopApi.createResource('orders', orderXML);
                orderId = getPrimitiveValue(orderResponse?.order?.id);
              } catch (creationError) {
                console.warn(`⚠️ Création de commande signalée en erreur pour ${email}:`, creationError.message);

                const fallbackOrder = await findOrderByCartId({ cartId, customerId });
                if (fallbackOrder?.id) {
                  orderId = getPrimitiveValue(fallbackOrder.id);
                  console.warn(`↪ Commande retrouvée malgré l'erreur: ${orderId}`);
                } else {
                  throw creationError;
                }
              }

              if (!orderId) {
                throw createValidationError(`Pas d'ID retourné pour la commande`);
              }

              // Mise à jour des dates après insertion, sans toucher au statut
              try {
                const [freshOrder] = await prestashopApi.getResources('orders', orderId, null, { display: 'full' });

                if (!freshOrder) {
                  throw new Error(`Commande ${orderId} introuvable après création`);
                }

                const orderUpdateXML = buildOrderXML({
                  id_order: orderId,
                  id_customer: getPrimitiveValue(freshOrder?.id_customer) || customerId,
                  id_address: getPrimitiveValue(freshOrder?.id_address_delivery) || addressId,
                  id_cart: getPrimitiveValue(freshOrder?.id_cart) || cartId,
                  id_carrier: getPrimitiveValue(freshOrder?.id_carrier) || defaultCarrierId,
                  id_shop_group: getPrimitiveValue(freshOrder?.id_shop_group) || customerShopGroup,
                  id_shop: getPrimitiveValue(freshOrder?.id_shop) || CONSTANTS.ID_SHOP_DEFAULT,
                  id_lang: getPrimitiveValue(freshOrder?.id_lang) || CONSTANTS.ID_LANG,
                  secure_key: getPrimitiveValue(freshOrder?.secure_key) || secureKey,
                  current_state: getPrimitiveValue(freshOrder?.current_state) || 11,
                  module: CONSTANTS.PAYMENT_MODULE,
                  payment: getPrimitiveValue(freshOrder?.payment) || CONSTANTS.PAYMENT_LABEL,
                  date_add: `${dateCmd} 00:00:00`,
                  date_upd: `${dateCmd} 00:00:00`,
                  total_paid: roundDecimal(totalPaid),
                  total_products: roundDecimal(totalProducts),
                  total_products_wt: roundDecimal(totalProductsWT),
                });

                console.log(`DEBUG File3: Order Update XML (ligne ${i + 1}):`, orderUpdateXML);
                await prestashopApi.updateResource('orders', orderId, orderUpdateXML);
                console.log(`✓ Dates de commande mises à jour: ${dateCmd}`);
              } catch (updateError) {
                if (shouldAbortOnError(updateError)) {
                  throw updateError;
                }
                console.warn(`⚠️ Impossible de mettre à jour les dates de la commande ${orderId}:`, updateError.message);
                results.errors.push(`Commande ${orderId}: Impossible de mettre à jour les dates (${updateError.message})`);
              }

              results.orders.push({
                customer: email,
                date: row.date,
                state: etat,
                id: orderId,
                status: 'success',
                total: totalPaid
              });
              console.log(`✓ Commande créée: ${email} (ID: ${orderId}) - Total: ${roundDecimal(totalPaid)}`);

              // ÉTAPE 5: Enregistrer les détails côté application uniquement
                  for (const item of items) {
                try {
                  const product = productMap[item.reference];
                  if (!product) {
                    results.errors.push(`Produit '${item.reference}' non trouvé`);
                    continue;
                  }

                  const idProductAttribute = item.variante
                    ? combinationMap[`${item.reference}:${normalizeKey(item.variante)}`] || 0
                    : 0;
                      // Prendre en compte l'impact de la combinaison pour le prix HT
                      const variantKey = item.variante ? `${item.reference}:${normalizeKey(item.variante)}` : null;
                      const priceImpact = variantKey ? (combinationPriceMap[variantKey] || 0) : 0;
                      const finalPriceHT = roundDecimal(Number.parseFloat(product.priceHT || 0) + Number.parseFloat(priceImpact || 0));
                      const priceTTC = roundDecimal(finalPriceHT * (1 + product.taxRate / 100));

                  results.orderDetails.push({
                    order: orderId,
                    product: item.reference,
                        quantity: item.quantity,
                        productAttributeId: idProductAttribute,
                        priceHT: finalPriceHT,
                        priceTTC: priceTTC,
                    status: 'success'
                  });
                  console.log(`✓ Article ajouté: ${item.reference} x${item.quantity}`);
                } catch (error) {
                  results.errors.push(`Article '${item.reference}': ${error.message}`);
                }
              }

              if (shouldCreateCancellationHistory) {
                try {
                  if (!cancelledStateId) {
                    throw new Error('État annulé introuvable dans PrestaShop');
                  }

                  const orderHistoryXML = buildOrderHistoryXML({
                    id_order: orderId,
                    id_order_state: cancelledStateId,
                    date_add: `${dateCmd} 00:00:00`
                  });

                  await prestashopApi.createResource('order_histories', orderHistoryXML);
                } catch (historyError) {
                  console.warn(`⚠️ Impossible d'ajouter l'historique d'annulation pour la commande ${orderId}:`, historyError.message);
                  results.errors.push(`Commande '${email}': ${historyError.message}`);
                }
              }
            } else {
              // Si etat === "dans le panier", créer SEULEMENT le cart
              if (totalPaid <= 0) {
                throw createValidationError(`Ligne ${i + 1}: Total de commande invalide pour ${email}`);
              }
              console.log(`✓ Panier créé (en attente): ${email} (Cart ID: ${cartId}) - État: "${etat}" - Total: ${roundDecimal(totalPaid)}`);
              results.orders.push({
                customer: email,
                date: row.date,
                state: etat,
                id: `CART-${cartId}`,
                status: 'cart-only',
                total: totalPaid,
                cartId: cartId
              });
            }
          } catch (error) {
            if (shouldAbortOnError(error)) {
              throw error;
            }
            results.errors.push(`Commande pour '${email}': ${error.message}`);
          }
        } catch (error) {
          if (shouldAbortOnError(error)) {
            throw error;
          }
          results.errors.push(`Adresse pour '${email}': ${error.message}`);
        }

        onProgress?.({
          step: 'orders',
          message: `Import des commandes... (${i + 1}/${csvData.length})`,
          progress: ((i + 1) / csvData.length) * 100
        });
      } catch (error) {
        if (shouldAbortOnError(error)) {
          throw error;
        }
        results.errors.push(`Ligne ${i + 1}: ${error.message}`);
      }
    }

    // Résumé
    results.summary = {
      totalCustomers: results.customers.length,
      successCustomers: results.customers.filter(c => c.status === 'success').length,
      totalAddresses: results.addresses.length,
      successAddresses: results.addresses.filter(a => a.status === 'success').length,
      totalOrders: results.orders.length,
      successOrders: results.orders.filter(o => o.status === 'success').length,
      totalOrderDetails: results.orderDetails.length,
      successOrderDetails: results.orderDetails.filter(od => od.status === 'success').length,
      totalErrors: results.errors.length
    };

    onProgress?.({ step: 'complete', message: 'Import Fichier 3 terminé!' });

    return results;
  } catch (error) {
    results.errors.push(`Erreur générale: ${error.message}`);
    throw error;
  }
};

/**
 * Fichier 4: Import d'images de produits
 * Accepte plusieurs fichiers image (.png, .jpg, .jpeg)
 * Chaque fichier doit être nommé avec la référence du produit (ex: T_01.png, P_01.jpeg)
 */
export const importFile4 = async (imageFiles, file1Results, onProgress = () => {}) => {
  const results = {
    images: [],
    errors: [],
    summary: {
      totalImages: 0,
      successImages: 0,
      totalErrors: 0
    }
  };

  try {
    if (!imageFiles || imageFiles.length === 0) {
      results.errors.push('Aucun fichier image sélectionné');
      results.summary.totalErrors = results.errors.length;
      return results;
    }

    if (!file1Results || !file1Results.products) {
      results.errors.push('Les données du Fichier 1 (produits) sont manquantes');
      results.summary.totalErrors = results.errors.length;
      return results;
    }

    // Créer un cache des produits par référence pour recherche rapide
    const productsByReference = {};
    for (const product of file1Results.products) {
      if (product.id && product.reference) {
        productsByReference[product.reference] = product.id;
      }
    }

    // Filtrer les fichiers images valides
    const supportedExtensions = ['.png', '.jpg', '.jpeg'];
    const validImages = Array.from(imageFiles).filter(file => {
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      return supportedExtensions.includes(ext);
    });

    results.summary.totalImages = validImages.length;

    if (validImages.length === 0) {
      results.errors.push('Aucun fichier image valide (.png/.jpg/.jpeg) trouvé');
      results.summary.totalErrors = results.errors.length;
      return results;
    }

    // Traiter chaque image
    for (let i = 0; i < validImages.length; i++) {
      const file = validImages[i];

      try {
        // Extraire la référence du nom du fichier (sans extension)
        const fileName = file.name;
        const dotIndex = fileName.lastIndexOf('.');
        const reference = fileName.substring(0, dotIndex);

        if (!reference) {
          results.errors.push(`Image ignorée (nom invalide): ${fileName}`);
          continue;
        }

        onProgress?.({
          step: 'images',
          message: `Import des images... (${i + 1}/${validImages.length})`,
          progress: ((i + 1) / validImages.length) * 100
        });

        // Chercher le produit par référence
        const productId = productsByReference[reference];

        if (!productId) {
          results.errors.push(`Image '${fileName}': Produit avec référence '${reference}' non trouvé`);
          continue;
        }

        // Uploader l'image
        await uploadProductImage(productId, file);

        results.images.push({
          fileName,
          reference,
          productId,
          status: 'success'
        });

        results.summary.successImages++;
        console.log(`✓ Image importée: ${fileName} → produit ${reference} (ID: ${productId})`);
      } catch (error) {
        results.errors.push(`Image '${file.name}': ${error.message}`);
        console.error(`✗ Erreur image ${file.name}:`, error);
      }
    }

    results.summary.totalErrors = results.errors.length;
    onProgress?.({ step: 'complete', message: 'Import Fichier 4 (Images) terminé!' });

    return results;
  } catch (error) {
    results.errors.push(`Erreur générale Fichier 4: ${error.message}`);
    results.summary.totalErrors = results.errors.length;
    throw error;
  }
};

/**
 * Upload une image de produit via l'API
 */
const uploadProductImage = async (productId, file) => {
  const formData = new FormData();
  formData.append('image', file, file.name);

  try {
    const response = await api.post(`/images/products/${productId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      return response.data;
    } else {
      return response.data;
    }
  } catch (error) {
    let errorText = `HTTP Exception`;
    if (error.response) {
      errorText = `HTTP ${error.response.status} - ${typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data)}`;
    } else {
      errorText = error.message;
    }
    throw new Error(`Upload échoué: ${errorText}`);
  }
};

/**
 * Rollback complet de tous les imports en cas d'erreur
 * Appelle resetAllData pour supprimer toutes les données importées
 * Cela garantit une transaction "TOUT OU RIEN"
 */
export const rollbackAllImports = async () => {
  try {
    console.warn('⚠️ ROLLBACK EN COURS - Suppression de toutes les données importées...');
    
    // Appeler resetAllData pour vider toutes les tables
    await resetAllData((resourceName, status, completedCount, meta = {}) => {
      console.log(`  → Suppression de ${resourceName}... (${status})`);
    });
    
    console.log('✓ Rollback terminé - Toutes les données ont été supprimées');
  } catch (error) {
    console.error('✗ Erreur lors du rollback:', error);
    throw new Error(`Erreur lors du rollback: ${error.message}`);
  }
};
