import {
  extractAttributeGroups,
  extractAttributesByGroup,
  parseFile2CSV,
  shouldAbortOnError,
  upsertStockAvailableQuantity
} from './helper';
import {
  convertTTCtoHT,
  createValidationError,
  isPositiveAmount,
  normalizeNumber,
  prestashopApi,
  roundDecimal
} from '../Global';
import {
  buildAttributeGroupXML,
  buildAttributeXML,
  buildCombinationXML
} from './xml/importBuilderXml';

export const importFile2 = async (csvFile, file1Results, onProgress = () => {}) => {
  const results = {
    attributeGroups: [],
    attributes: [],
    combinations: [],
    stocks: [],
    missingStocks: [],
    errors: [],
    summary: {}
  };

  try {
    onProgress?.({ step: 'parsing', message: 'parsing', description: 'Parsing du CSV Fichier 2...', percentage: 0 });
    const csvData = await parseFile2CSV(csvFile);

    if (!csvData || csvData.length === 0) {
      throw new Error('Fichier CSV vide');
    }

    const attributeGroups = extractAttributeGroups(csvData);
    const attributesByGroup = extractAttributesByGroup(csvData);
    const totalAttributes = Object.values(attributesByGroup)
      .reduce((sum, group) => sum + Object.keys(group).length, 0);

    const totalUnits = 1 + attributeGroups.length + totalAttributes + csvData.length;
    let completedUnits = 1;

    const updateProgress = ({ step, message, description }) => {
      const percentage = Math.round((completedUnits / totalUnits) * 100);
      onProgress?.({ step, message, description, percentage });
    };

    updateProgress({ step: 'parsing', message: 'parsing', description: 'Parsing du CSV Fichier 2...' });

    const productMap = {};
    file1Results.products.forEach((p) => {
      if (p.status === 'success' && p.id) {
        productMap[p.reference] = p.id;
      }
    });

    // 1. CREATION GROUPES D'ATTRIBUTS
    onProgress?.({ step: 'attributeGroups', message: 'attributeGroups', description: 'Creation des groupes d\'attributs...' });
    const attributeGroupMap = {};

    for (const groupName of attributeGroups) {
      try {
        const xml = buildAttributeGroupXML(groupName);
        const response = await prestashopApi.createResource('product_options', xml);
        const groupId = response.product_option_group?.id || response.product_option?.id;

        if (!groupId) {
          console.warn('Pas d\'ID retourne pour groupe attribut:', { groupName, response });
        }

        results.attributeGroups.push({
          name: groupName,
          id: groupId,
          status: 'success'
        });

        attributeGroupMap[groupName] = groupId;
      } catch (error) {
        results.attributeGroups.push({
          name: groupName,
          status: 'error',
          error: error.message
        });
        results.errors.push(`Groupe attribut '${groupName}': ${error.message}`);
      }

      completedUnits += 1;
      updateProgress({
        step: 'attributeGroups',
        message: 'attributeGroups',
        description: `Creation des groupes d'attributs... (${results.attributeGroups.length}/${attributeGroups.length})`
      });
    }

    // 2. CREATION DES ATTRIBUTS
    onProgress?.({ step: 'attributes', message: 'attributes', description: 'Creation des attributs...' });
    const attributeMap = {};

    for (const [groupName, values] of Object.entries(attributesByGroup)) {
      const groupId = attributeGroupMap[groupName];
      if (!groupId) {
        results.errors.push(`Groupe attribut '${groupName}' non trouve`);
        continue;
      }

      for (const valueName of Object.keys(values)) {
        try {
          const xml = buildAttributeXML(valueName, groupId);
          const response = await prestashopApi.createResource('product_option_values', xml);
          const attributeId = response.product_option_value?.id;

          if (!attributeId) {
            console.warn('Pas d\'ID retourne pour attribut:', { valueName, response });
          }

          const key = `${groupName}:${valueName}`;
          results.attributes.push({
            group: groupName,
            value: valueName,
            id: attributeId,
            status: 'success'
          });

          attributeMap[key] = attributeId;
        } catch (error) {
          results.attributes.push({
            group: groupName,
            value: valueName,
            status: 'error',
            error: error.message
          });
          results.errors.push(`Attribut '${groupName}:${valueName}': ${error.message}`);
        }

        completedUnits += 1;
        updateProgress({
          step: 'attributes',
          message: 'attributes',
          description: `Creation des attributs... (${results.attributes.length}/${totalAttributes})`
        });
      }
    }

    // 3. CREATION DES COMBINAISONS
    onProgress?.({ step: 'combinations', message: 'combinations', description: 'Creation des combinaisons...' });

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const reference = row.reference?.trim();
      const specificite = row.specificité?.trim();
      const valeur = row.karazany?.trim();
      const stock = normalizeNumber(row.stock_initial);
      const prixVente = row.prix_vente_ttc?.trim();

      if (!reference) {
        completedUnits += 1;
        updateProgress({
          step: 'combinations',
          message: 'combinations',
          description: `Creation des combinaisons... (${i + 1}/${csvData.length})`
        });
        continue;
      }

      const idProduct = productMap[reference];
      if (!idProduct) {
        results.errors.push(`Produit '${reference}' du Fichier 1 non trouve`);
        completedUnits += 1;
        updateProgress({
          step: 'combinations',
          message: 'combinations',
          description: `Creation des combinaisons... (${i + 1}/${csvData.length})`
        });
        continue;
      }

      try {
        if (prixVente && !isPositiveAmount(prixVente)) {
          throw createValidationError(`Ligne ${i + 1}: prix_vente_ttc doit etre un montant positif`);
        }

        if (!specificite || !valeur) {
          const updateResult = await upsertStockAvailableQuantity({
            productId: idProduct,
            productAttributeId: 0,
            quantity: stock
          });

          results.stocks.push({
            reference,
            idProduct,
            type: 'product',
            quantity: stock,
            stockId: updateResult.stockId,
            status: updateResult.updated ? 'success' : 'pending'
          });
        } else {
          const attributeKey = `${specificite}:${valeur}`;
          const attributeId = attributeMap[attributeKey];

          if (!attributeId) {
            throw new Error(`Attribut '${attributeKey}' non trouve`);
          }

          const product1 = file1Results.products.find((p) => p.reference === reference);
          const productPriceHT = product1?.priceHT || 0;
          const productTaxRate = product1?.taxRate || 0;

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

          const response = await prestashopApi.createResource('combinations', xml);
          const combinationId = response.combination?.id;

          if (!combinationId) {
            throw new Error('Pas d\'ID retourne pour combinaison');
          }

          results.combinations.push({
            product: reference,
            attribute: `${specificite}:${valeur}`,
            id: combinationId,
            priceImpact,
            status: 'success'
          });

          console.log(`Combinaison créé : id_product = ${idProduct} , id_product_attribut = ${combinationId}`)

          const updateResult = await upsertStockAvailableQuantity({
            productId: idProduct,
            productAttributeId: combinationId,  
            quantity: stock
          });

          results.stocks.push({
            reference: `${reference}-${valeur}`,
            idProduct,
            type: 'combination',
            id_product_attribute: combinationId,
            quantity: stock,
            stockId: updateResult.stockId,
            status: updateResult.updated ? 'success' : 'pending'
          });
        }
      } catch (error) {
        if (shouldAbortOnError(error)) {
          throw error;
        }
        results.errors.push(`Produit '${reference}': ${error.message}`);
      }

      completedUnits += 1;
      updateProgress({
        step: 'combinations',
        message: 'combinations',
        description: `Creation des combinaisons... (${i + 1}/${csvData.length})`
      });
    }

    results.summary = {
      totalAttributeGroups: results.attributeGroups.length,
      successAttributeGroups: results.attributeGroups.filter((a) => a.status === 'success').length,
      totalAttributes: results.attributes.length,
      successAttributes: results.attributes.filter((a) => a.status === 'success').length,
      totalCombinations: results.combinations.length,
      successCombinations: results.combinations.filter((c) => c.status === 'success').length,
      totalStocks: results.stocks.length,
      successStocks: results.stocks.filter((s) => s.status === 'success').length,
      totalErrors: results.errors.length
    };

    onProgress?.({ step: 'complete', message: 'success', description: 'Import Fichier 2 termine !', percentage: 100 });

    return results;
  } catch (error) {
    results.errors.push(`Erreur generale: ${error.message}`);
    throw error;
  }
};