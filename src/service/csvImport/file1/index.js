import {
  extractCategories,
  extractTaxes,
  parseFile1CSV,
  shouldAbortOnError
} from './helper';
import {
  convertTTCtoHT,
  createValidationError,
  isPositiveAmount,
  isValidDateDMY,
  normalizeNumber,
  prestashopApi
} from '../Global';
import {
  buildCategoryXML,
  buildProductXML,
  buildTaxRuleXML,
  buildTaxRulesGroupXML,
  buildTaxXML
} from './xml/importXmlBuilder';

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
    onProgress?.({ step: 'parsing', message: 'parsing', description: 'Parsing du CSV...', percentage: 0 });
    const csvData = await parseFile1CSV(csvFile);

    if (!csvData || csvData.length === 0) {
      throw new Error('Fichier CSV vide');
    }

    const categories = extractCategories(csvData);
    const taxes = extractTaxes(csvData);
    const taxesCount = Object.keys(taxes).length;
    const totalUnits = 1 + categories.length + (taxesCount * 3) + csvData.length;
    let completedUnits = 1;

    const updateProgress = ({ step, message, description }) => {
      const percentage = Math.round((completedUnits / totalUnits) * 100);
      onProgress?.({ step, message, description, percentage });
    };

    updateProgress({ step: 'parsing', message: 'parsing', description: 'Parsing du CSV...' });

    // 1 - CREATION CATEGORIE
    onProgress?.({ step: 'categories', message: 'categories', description: 'Creation des categories...', percentage: Math.round((completedUnits / totalUnits) * 100) });
    const categoryMap = {};

    for (const categoryName of categories) {
      try {
        const xml = buildCategoryXML(categoryName);
        const response = await prestashopApi.createResource('categories', xml);
        const categoryId = response.category?.id;

        if (!categoryId) {
          console.warn('Pas d\'ID retourne pour categorie:', { categoryName, response });
        }

        results.categories.push({
          name: categoryName,
          id: categoryId,
          status: 'success'
        });

        categoryMap[categoryName] = categoryId;
      } catch (error) {
        results.categories.push({
          name: categoryName,
          status: 'error',
          error: error.message
        });
        results.errors.push(`Categorie '${categoryName}': ${error.message}`);
      }

      completedUnits += 1;
      updateProgress({
        step: 'categories',
        message: 'categories',
        description: `Creation des categories... (${results.categories.length}/${categories.length})`
      });
    }

    // 2- CREATION TAXE
    onProgress?.({ step: 'taxes', message: 'taxes', description: 'Creation des taxes...' });
    const taxMap = {};

    for (const [rate, name] of Object.entries(taxes)) {
      try {
        const xml = buildTaxXML(name, rate);
        const response = await prestashopApi.createResource('taxes', xml);
        const taxId = response.tax?.id;

        if (!taxId) {
          console.warn('Pas d\'ID retourne pour taxe:', { rate, response });
        }

        results.taxes.push({
          rate,
          name,
          id: taxId,
          status: 'success'
        });

        taxMap[rate] = taxId;
      } catch (error) {
        results.taxes.push({
          rate,
          name,
          status: 'error',
          error: error.message
        });
        results.errors.push(`Taxe '${rate}': ${error.message}`);
      }

      completedUnits += 1;
      updateProgress({
        step: 'taxes',
        message: 'taxes',
        description: `Creation des taxes... (${results.taxes.length}/${taxesCount})`
      });
    }

    // 3- CREATION GROUPE DE REGLES DE TAXES
    onProgress?.({ step: 'taxRulesGroups', message: 'taxRulesGroups', description: 'Creation des groupes de taxes...' });
    const taxRulesGroupMap = {};

    for (const [rate, name] of Object.entries(taxes)) {
      try {
        const groupName = `Groupe TVA ${rate}`;
        const xml = buildTaxRulesGroupXML(groupName);
        const response = await prestashopApi.createResource('tax_rule_groups', xml);
        const groupId = response.tax_rule_group?.id;

        if (!groupId) {
          console.warn('Pas d\'ID retourne pour groupe de taxe:', { rate, response });
        }

        results.taxRulesGroups.push({
          rate,
          groupName,
          id: groupId,
          status: 'success'
        });

        taxRulesGroupMap[rate] = groupId;
      } catch (error) {
        results.taxRulesGroups.push({
          rate,
          status: 'error',
          error: error.message
        });
        results.errors.push(`Groupe de taxe '${rate}': ${error.message}`);
      }

      completedUnits += 1;
      updateProgress({
        step: 'taxRulesGroups',
        message: 'taxRulesGroups',
        description: `Creation des groupes de taxes... (${results.taxRulesGroups.length}/${taxesCount})`
      });
    }

    // 4 - CREATION DES REGLES DE TAXES
    onProgress?.({ step: 'taxRules', message: 'taxRules', description: 'Creation des regles de taxe...' });

    for (const [rate, taxId] of Object.entries(taxMap)) {
      try {
        const groupId = taxRulesGroupMap[rate];
        if (!groupId) throw new Error(`Groupe de taxe non trouve pour ${rate}`);

        const xml = buildTaxRuleXML(groupId, taxId);
        const response = await prestashopApi.createResource('tax_rules', xml);
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
        results.errors.push(`Regle de taxe '${rate}': ${error.message}`);
      }

      completedUnits += 1;
      updateProgress({
        step: 'taxRules',
        message: 'taxRules',
        description: `Creation des regles de taxe... (${results.taxRules.length}/${taxesCount})`
      });
    }

    // 5 - CREATION PRODUITS
    const totalProducts = csvData.length;

    for (let i = 0; i < csvData.length; i++) {
      const productData = csvData[i];

      try {
        const categoryName = productData.categorie?.trim();
        const taxRate = productData.Taxe?.trim();
        const availabilityDate = productData.date_availability_produit?.trim();

        if (!availabilityDate || !isValidDateDMY(availabilityDate)) {
          throw createValidationError(
            `Ligne ${i + 1}: date_availability_produit invalide, format attendu DD/MM/YYYY`
          );
        }

        if (!isPositiveAmount(productData.prix_ttc)) {
          throw createValidationError(`Ligne ${i + 1}: prix_ttc doit etre un montant positif`);
        }

        if (!isPositiveAmount(productData.prix_achat)) {
          throw createValidationError(`Ligne ${i + 1}: prix_achat doit etre un montant positif`);
        }

        const idCategory = categoryMap[categoryName];
        const idTaxRulesGroup = taxRulesGroupMap[taxRate];

        if (!idCategory) throw new Error(`Categorie '${categoryName}' non trouvee`);
        if (!idTaxRulesGroup) throw new Error(`Groupe de taxe '${taxRate}' non trouve`);

        const xml = buildProductXML(productData, idCategory, idTaxRulesGroup);
        const response = await prestashopApi.createResource('products', xml);
        const productId = response.product?.id;

        console.log(`Produit créé : id = ${productId} , name = ${response.product?.name}`);

        if (!productId) {
          throw new Error(`Pas d\'ID retourne pour le produit ${productData.reference}`);
        }

        results.products.push({
          reference: productData.reference,
          name: productData.nom,
          id: productId,
          priceHT: convertTTCtoHT(productData.prix_ttc, productData.Taxe),
          taxRate: normalizeNumber(productData.Taxe),
          status: 'success'
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

      completedUnits += 1;
      updateProgress({
        step: 'products',
        message: 'products',
        description: `Creation des produits... (${i + 1}/${totalProducts})`
      });
    }

    results.summary = {
      totalCategories: results.categories.length,
      successCategories: results.categories.filter((c) => c.status === 'success').length,
      totalTaxes: results.taxes.length,
      successTaxes: results.taxes.filter((t) => t.status === 'success').length,
      totalTaxRulesGroups: results.taxRulesGroups.length,
      successTaxRulesGroups: results.taxRulesGroups.filter((t) => t.status === 'success').length,
      totalTaxRules: results.taxRules.length,
      successTaxRules: results.taxRules.filter((t) => t.status === 'success').length,
      totalProducts: results.products.length,
      successProducts: results.products.filter((p) => p.status === 'success').length,
      totalErrors: results.errors.length
    };

    onProgress?.({ step: 'complete', message: 'success', description: 'Import Fichier 1 termine !', percentage: 100 });

    console.log("Resume import file 1 : " , results.summary)

    return results;
  } catch (error) {
    results.errors.push(`Erreur generale: ${error.message}`);
    throw error;
  }
};