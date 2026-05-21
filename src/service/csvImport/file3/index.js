import {
  convertDateFormat,
  createOrderStateChange,
  ensureMd5Like,
  findOrderByCartId,
  getExistingOrderStateId,
  getPrimitiveValue,
  normalizeStatusLabel,
  parseAchatField,
  parseFile3CSV,
  shouldAbortOnError
} from './helper';
import {
  createValidationError,
  isValidDateDMY,
  normalizeKey,
  prestashopApi,
  roundDecimal
} from '../Global';
import { buildCartXML } from './xml/cartsXmlBuilder';
import { buildOrderXML } from './xml/ordersXmlBuilder';
import { buildCustomerXML, buildAddressXML } from './xml/customersXmlBuilder';

const CONSTANTS = {
  ID_LANG: 1,
  ID_COUNTRY: 8,
  ID_SHOP_DEFAULT: 1,
  ID_SHOP_GROUP: 1,
  PAYMENT_MODULE: 'ps_cashondelivery',
  PAYMENT_LABEL: 'Paiement a la livraison'
};

export const importFile3 = async (file, file1Results, file2Results, onProgress = () => {}) => {
  const results = {
    customers: [],
    addresses: [],
    orders: [],
    orderDetails: [],
    errors: [],
    summary: {}
  };

  try {
    onProgress?.({ step: 'parsing', message: 'parsing', description: 'Parsing du CSV Fichier 3...', percentage: 0 });
    const csvData = await parseFile3CSV(file);

    if (!csvData || csvData.length === 0) {
      throw new Error('Fichier CSV vide');
    }

    const totalUnits = 1 + csvData.length;
    let completedUnits = 1;

    const updateProgress = ({ step, message, description }) => {
      const percentage = Math.round((completedUnits / totalUnits) * 100);
      onProgress?.({ step, message, description, percentage });
    };

    updateProgress({ step: 'parsing', message: 'parsing', description: 'Parsing du CSV Fichier 3...' });

    const productMap = {};
    file1Results.products.forEach((p) => {
      if (p.status === 'success' && p.id) {
        productMap[p.reference] = { id: p.id, name: p.name, priceHT: p.priceHT, taxRate: p.taxRate };
      }
    });

    const combinationMap = {};
    const combinationPriceMap = {};
    file2Results.combinations.forEach((c) => {
      if (c.status === 'success') {
        const optionName = (c.attribute || '').split(':').pop();
        const key = `${c.product}:${normalizeKey(optionName)}`;
        combinationMap[key] = c.id;
        combinationPriceMap[key] = Number.parseFloat(c.priceImpact || 0) || 0;
      }
    });

    const orderStates = await prestashopApi.getResources('order_states', null, null, { display: 'full' });
    const carriers = await prestashopApi.getResources('carriers', null, null, { display: 'full' });
    const activeCarrier = carriers.find((c) => parseInt(c.active, 10) === 1 && parseInt(c.deleted || 0, 10) === 0);
    const defaultCarrierId = activeCarrier?.id || 1;

    // CLIENT
    let existingCustomers = [];
    try {
      existingCustomers = await prestashopApi.getResources('customers', null, null, { display: 'full' });
    } catch (error) {
      console.warn('Impossible de recuperer les clients existants:', error.message);
    }

    onProgress?.({ step: 'customers', message: 'customers', description: 'Creation des clients...' });

    const mergeOrderItems = (items) => {
      const mergedMap = new Map();

      items.forEach((item) => {
        const reference = item.reference || '';
        const variantKey = normalizeKey(item.variante || '');
        const key = `${reference}::${variantKey}`;

        if (!mergedMap.has(key)) {
          mergedMap.set(key, {
            reference,
            variante: item.variante || '',
            quantity: 0
          });
        }

        const current = mergedMap.get(key);
        current.quantity += item.quantity || 0;
      });

      return Array.from(mergedMap.values()).filter((item) => item.reference && item.quantity > 0);
    };

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];

      try {
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

        if (!email || !nom || !pwd) {
          results.errors.push(`Ligne ${i + 1}: Donnees client incompletes (email, nom ou pwd manquant)`);
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

        let customerId = null;
        let customerSecureKey = null;
        let customerShopGroup = 1;

        const existingCustomer = existingCustomers.find((c) => {
          const customerEmail = (c.email?.value || c.email || '').toLowerCase().trim();
          return customerEmail === email;
        });

        if (existingCustomer) {
          customerId = existingCustomer.id;
          customerSecureKey = getPrimitiveValue(existingCustomer.secure_key);
          customerShopGroup = Number.parseInt(getPrimitiveValue(existingCustomer.id_shop_group), 10) || 1;
        } else {
          try {
            const customerXML = buildCustomerXML({
              firstname: nom,
              lastname: nom,
              email: email,
              passwd: pwd
            });

            const custResponse = await prestashopApi.createResource('customers', customerXML);
            customerId = custResponse.customer?.id;
            customerSecureKey = getPrimitiveValue(custResponse.customer?.secure_key);
            customerShopGroup = Number.parseInt(getPrimitiveValue(custResponse.customer?.id_shop_group), 10) || 1;

            if (!customerId) {
              throw new Error(`Pas d'ID retourne pour le client ${email}`);
            }

            results.customers.push({
              email,
              nom,
              id: customerId,
              status: 'success'
            });

            existingCustomers.push({
              id: customerId,
              email: email,
              secure_key: customerSecureKey,
              id_shop_group: customerShopGroup
            });
          } catch (error) {
            if (shouldAbortOnError(error)) {
              throw error;
            }
            results.errors.push(`Client '${email}': ${error.message}`);
            continue;
          }
        }

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
            throw new Error('Pas d\'ID retourne pour l\'adresse');
          }

          results.addresses.push({
            customer: email,
            address: adresse,
            id: addressId,
            status: 'success'
          });

          const items = parseAchatField(achatField);

          if (!items || items.length === 0) {
            results.errors.push(`Ligne ${i + 1}: Articles d'achat vides pour ${email}`);
            continue;
          }

          const mergedItems = mergeOrderItems(items);

          if (!mergedItems.length) {
            results.errors.push(`Ligne ${i + 1}: Articles d'achat vides pour ${email}`);
            continue;
          }

          let totalPaid = 0;
          let totalProducts = 0;
          let totalProductsWT = 0;

          for (const item of mergedItems) {
            const product = productMap[item.reference];
            if (product) {
              const variantKey = item.variante ? `${item.reference}:${normalizeKey(item.variante)}` : null;
              const priceImpact = variantKey ? (combinationPriceMap[variantKey] || 0) : 0;
              const finalPriceHT = roundDecimal(Number.parseFloat(product.priceHT || 0) + Number.parseFloat(priceImpact || 0));

              const priceTTC = roundDecimal(finalPriceHT * (1 + product.taxRate / 100));
              const itemTotalTTC = roundDecimal(priceTTC * item.quantity);
              const itemTotalHT = roundDecimal(finalPriceHT * item.quantity);

              totalPaid = roundDecimal(totalPaid + itemTotalTTC);
              totalProducts = roundDecimal(totalProducts + itemTotalHT);
              totalProductsWT = roundDecimal(totalProductsWT + itemTotalTTC);
            }
          }

          if (totalPaid <= 0) {
            throw createValidationError(`Ligne ${i + 1}: Total de commande invalide pour ${email}`);
          }

          try {
            const secureKey = ensureMd5Like((customerSecureKey || '').toString());
            const cartItems = mergedItems
              .map((item) => {
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

            const cartResponse = await prestashopApi.createResource('carts', cartXML);
            const cartId = cartResponse.cart?.id;

            if (!cartId) {
              throw new Error('Pas d\'ID retourne pour le panier');
            }

            const normalizedStatus = normalizeStatusLabel(etat);
            const paidStateId = getExistingOrderStateId('paiement', orderStates, CONSTANTS.ID_LANG)
              || getExistingOrderStateId('payment', orderStates, CONSTANTS.ID_LANG)
              || 11;
            const deliveredStateId = getExistingOrderStateId('livre', orderStates, CONSTANTS.ID_LANG)
              || getExistingOrderStateId('livré', orderStates, CONSTANTS.ID_LANG)
              || 5;
            const cancelledStateId = getExistingOrderStateId('annule', orderStates, CONSTANTS.ID_LANG)
              || getExistingOrderStateId('annulé', orderStates, CONSTANTS.ID_LANG)
              || 6;

            let targetStateId = null;
            let shouldApplyStateChange = false;

            if (normalizedStatus.startsWith('annul')) {
              targetStateId = cancelledStateId;
              shouldApplyStateChange = true;
            } else if (normalizedStatus.startsWith('livr')) {
              targetStateId = deliveredStateId;
              shouldApplyStateChange = true;
            } else if (normalizedStatus.includes('paiement') || normalizedStatus.includes('payment')) {
              targetStateId = paidStateId;
            }

            if (normalizedStatus && normalizedStatus !== 'dans le panier') {
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
                current_state: targetStateId || paidStateId,
                date_add: `${dateCmd} 00:00:00`,
                date_upd: `${dateCmd} 00:00:00`,
                total_paid: roundDecimal(totalPaid),
                total_products: roundDecimal(totalProducts),
                total_products_wt: roundDecimal(totalProductsWT)
              });

              let orderId = null;

              try {
                const orderResponse = await prestashopApi.createResource('orders', orderXML);
                orderId = getPrimitiveValue(orderResponse?.order?.id);
              } catch (creationError) {
                const fallbackOrder = await findOrderByCartId({ cartId, customerId });
                if (fallbackOrder?.id) {
                  orderId = getPrimitiveValue(fallbackOrder.id);
                } else {
                  throw creationError;
                }
              }

              if (!orderId) {
                throw createValidationError('Pas d\'ID retourne pour la commande');
              }

              console.log(`Commande creee: order=${orderId}, cart=${cartId}`);

              if (targetStateId && shouldApplyStateChange) {
                try {
                  await createOrderStateChange({
                    id_order: orderId,
                    id_order_state: targetStateId,
                    date_add: `${dateCmd} 00:00:00`
                  });
                  const [updatedOrder] = await prestashopApi.getResources('orders', orderId, null, { display: 'full' });
                  const updatedState = getPrimitiveValue(updatedOrder?.current_state);
                  if (String(updatedState) === '0') {
                    results.errors.push(`Commande ${orderId}: etat non applique`);
                  }
                } catch (stateError) {
                  results.errors.push(`Commande ${orderId}: etat non traite (${stateError.message})`);
                }
              }

            //   try {
            //     const [freshOrder] = await prestashopApi.getResources('orders', orderId, null, { display: 'full' });

            //     if (!freshOrder) {
            //       throw new Error(`Commande ${orderId} introuvable apres creation`);
            //     }

            //     const orderUpdateXML = buildOrderXML({
            //       id_order: orderId,
            //       id_customer: getPrimitiveValue(freshOrder?.id_customer) || customerId,
            //       id_address: getPrimitiveValue(freshOrder?.id_address_delivery) || addressId,
            //       id_cart: getPrimitiveValue(freshOrder?.id_cart) || cartId,
            //       id_carrier: getPrimitiveValue(freshOrder?.id_carrier) || defaultCarrierId,
            //       id_shop_group: getPrimitiveValue(freshOrder?.id_shop_group) || customerShopGroup,
            //       id_shop: getPrimitiveValue(freshOrder?.id_shop) || CONSTANTS.ID_SHOP_DEFAULT,
            //       id_lang: getPrimitiveValue(freshOrder?.id_lang) || CONSTANTS.ID_LANG,
            //       secure_key: getPrimitiveValue(freshOrder?.secure_key) || secureKey,
            //       module: CONSTANTS.PAYMENT_MODULE,
            //       payment: getPrimitiveValue(freshOrder?.payment) || CONSTANTS.PAYMENT_LABEL,
            //       current_state: targetStateId || paidStateId,
            //       date_add: `${dateCmd} 00:00:00`,
            //       date_upd: `${dateCmd} 00:00:00`,
            //       total_paid: roundDecimal(totalPaid),
            //       total_products: roundDecimal(totalProducts),
            //       total_products_wt: roundDecimal(totalProductsWT)
            //     });

            //     await prestashopApi.updateResource('orders', orderId, orderUpdateXML);
            //   } catch (updateError) {
            //     results.errors.push(`Commande ${orderId}: Impossible de mettre a jour les dates (${updateError.message})`);
            //   }

              results.orders.push({
                customer: email,
                date: row.date,
                state: etat,
                id: orderId,
                status: 'success',
                total: totalPaid,
                cartId: cartId
              });

              for (const item of mergedItems) {
                try {
                  const product = productMap[item.reference];
                  if (!product) {
                    results.errors.push(`Produit '${item.reference}' non trouve`);
                    continue;
                  }

                  const idProductAttribute = item.variante
                    ? combinationMap[`${item.reference}:${normalizeKey(item.variante)}`] || 0
                    : 0;

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
                  console.log(`Ligne commande créé : id=${orderId} , product=${item.reference} , variant=${idProductAttribute} , quantite=${item.quantity} , etat=${etat}` )
                } catch (error) {
                  results.errors.push(`Article '${item.reference}': ${error.message}`);
                }
              }
            } else {
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

        completedUnits += 1;
        updateProgress({
          step: 'orders',
          message: 'orders',
          description: `Import des commandes... (${i + 1}/${csvData.length})`
        });
      } catch (error) {
        if (shouldAbortOnError(error)) {
          throw error;
        }
        results.errors.push(`Ligne ${i + 1}: ${error.message}`);
      }
    }

    results.summary = {
      totalCustomers: results.customers.length,
      successCustomers: results.customers.filter((c) => c.status === 'success').length,
      totalAddresses: results.addresses.length,
      successAddresses: results.addresses.filter((a) => a.status === 'success').length,
      totalOrders: results.orders.length,
      successOrders: results.orders.filter((o) => o.status === 'success').length,
      totalOrderDetails: results.orderDetails.length,
      successOrderDetails: results.orderDetails.filter((od) => od.status === 'success').length,
      totalErrors: results.errors.length
    };

    onProgress?.({ step: 'complete', message: 'success', description: 'Import Fichier 3 termine !', percentage: 100 });

    return results;
  } catch (error) {
    results.errors.push(`Erreur generale: ${error.message}`);
    throw error;
  }
};
