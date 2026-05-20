import api from './api';
import { xmlToJson } from './Util';
import { commandeService } from './Commande';
import { productService } from './Product';

const getTextVal = (value) => {
  if (value && typeof value === 'object' && value['#text'] !== undefined) {
    return value['#text'];
  }
  return value;
};

const getNumericValue = (value, fallback = 0) => {
  const parsed = Number.parseFloat(getTextVal(value));
  return Number.isNaN(parsed) ? fallback : parsed;
};

const ensureArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const extractCategoryName = (category) => {
  if (!category) return '';
  const name = category.name;
  if (!name) return '';
  if (typeof name === 'string') return name;
  if (name.language) {
    const langNode = Array.isArray(name.language) ? name.language[0] : name.language;
    return getTextVal(langNode) || '';
  }
  return getTextVal(name) || '';
};

const buildCategoryMap = (categories) => categories.reduce((acc, category) => {
  const id = String(getTextVal(category.id) || '').trim();
  if (!id) return acc;
  acc[id] = extractCategoryName(category) || `Categorie ${id}`;
  return acc;
}, {});

const getDefaultCategoryId = (product) => {
  const categoryId = getTextVal(product?.id_category_default);
  return categoryId ? String(categoryId) : 'uncategorized';
};

const getOrderStateId = (order) => String(getTextVal(order?.current_state) || '').trim();
const isPaidOrder = (order) => {
  const stateId = getOrderStateId(order);
  return stateId === '11' || stateId === '2';
};

const normalizeStockMovements = (rows = []) => ensureArray(rows).map((row) => {
  const sign = Number.parseFloat(getTextVal(row?.sign));
  const quantity = Number.parseFloat(getTextVal(row?.physical_quantity || row?.quantity) || 0) || 0;
  const delta = Number.isNaN(sign) ? quantity : quantity * sign;

  return {
    idProduct: String(getTextVal(row?.id_product) || '').trim(),
    delta
  };
});

const parseStockMovementsPayload = (payload) => {
  if (!payload) return [];
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('<')) {
      const xmlObj = xmlToJson(payload);
      const movements = xmlObj?.prestashop?.stock_movements?.stock_movement || [];
      return normalizeStockMovements(movements);
    }
    try {
      const jsonObj = JSON.parse(payload);
      const movements = jsonObj?.stock_movements?.stock_movement
        || jsonObj?.prestashop?.stock_movements?.stock_movement
        || jsonObj?.stock_mvts?.stock_movement
        || jsonObj?.stock_mvts?.stock_mvt
        || jsonObj?.stock_mvts
        || [];
      return normalizeStockMovements(movements);
    } catch (error) {
      return [];
    }
  }

  const movements = payload?.stock_movements?.stock_movement
    || payload?.prestashop?.stock_movements?.stock_movement
    || payload?.stock_mvts?.stock_movement
    || payload?.stock_mvts?.stock_mvt
    || payload?.stock_mvts
    || [];
  return normalizeStockMovements(movements);
};

const fetchStockMovements = async () => {
  const response = await api.get('/stock_movements?display=full&output_format=JSON');
  return parseStockMovementsPayload(response.data);
};

const buildSalesData = async () => {
  const [orders, products, categories, stockMovements] = await Promise.all([
    commandeService.getCommandes(),
    productService.getAllProducts(),
    productService.getCategories(),
    fetchStockMovements()
  ]);

  const paidOrders = (orders || []).filter(isPaidOrder);
  const categoryMap = buildCategoryMap(ensureArray(categories));
  const productMap = products.reduce((acc, product) => {
    const id = String(getTextVal(product?.id) || '').trim();
    if (!id) return acc;

    acc[id] = {
      categoryId: getDefaultCategoryId(product),
      wholesalePrice: getNumericValue(product?.wholesale_price, 0)
    };
    return acc;
  }, {});

  const orderDetails = await Promise.all(
    paidOrders.map((order) => commandeService.getOrderDetails(order.id))
  );

  const categoryTotals = {};
  let totalSalesHT = 0;
  let totalPurchaseHT = 0;

  orderDetails
    .filter(Boolean)
    .forEach((order) => {
      const rows = ensureArray(order.orderRows);
      rows.forEach((row) => {
        const productId = String(getTextVal(row.productId) || '').trim();
        const quantity = Number.parseInt(getTextVal(row.quantity), 10) || 0;
        const unitSaleHT = getNumericValue(row.productPrice, 0);
        const productInfo = productMap[productId] || {};
        const categoryId = productInfo.categoryId || 'uncategorized';

        const salesAmount = unitSaleHT * quantity;
        totalSalesHT += salesAmount;

        if (!categoryTotals[categoryId]) {
          categoryTotals[categoryId] = {
            categoryId,
            categoryName: categoryMap[categoryId] || 'Non classe',
            salesHT: 0,
            purchaseHT: 0
          };
        }

        categoryTotals[categoryId].salesHT += salesAmount;
      });
    });

  stockMovements
    .filter((movement) => movement.delta > 0)
    .forEach((movement) => {
      const productInfo = productMap[movement.idProduct] || {};
      const categoryId = productInfo.categoryId || 'uncategorized';
      const unitPurchaseHT = getNumericValue(productInfo.wholesalePrice, 0);
      const purchaseAmount = unitPurchaseHT * movement.delta;

      totalPurchaseHT += purchaseAmount;

      if (!categoryTotals[categoryId]) {
        categoryTotals[categoryId] = {
          categoryId,
          categoryName: categoryMap[categoryId] || 'Non classe',
          salesHT: 0,
          purchaseHT: 0
        };
      }

      categoryTotals[categoryId].purchaseHT += purchaseAmount;
    });

  const profitByCategory = Object.values(categoryTotals)
    .map((row) => ({
      ...row,
      profitHT: row.salesHT - row.purchaseHT
    }))
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName));

  return {
    totalSalesHT,
    totalPurchaseHT,
    profitByCategory
  };
};

const buildStockByCategory = async () => {
  const [products, categories, orders] = await Promise.all([
    productService.getAllProducts(),
    productService.getCategories(),
    commandeService.getCommandes()
  ]);

  const categoryMap = buildCategoryMap(ensureArray(categories));
  const productCategoryMap = products.reduce((acc, product) => {
    const id = String(getTextVal(product?.id) || '').trim();
    if (!id) return acc;
    acc[id] = getDefaultCategoryId(product);
    return acc;
  }, {});

  const paidOrders = (orders || []).filter(isPaidOrder);
  const orderDetails = await Promise.all(
    paidOrders.map((order) => commandeService.getOrderDetails(order.id))
  );

  const reservedByCategory = {};
  orderDetails
    .filter(Boolean)
    .forEach((order) => {
      const rows = ensureArray(order.orderRows);
      rows.forEach((row) => {
        const productId = String(getTextVal(row.productId) || '').trim();
        const quantity = Number.parseInt(getTextVal(row.quantity), 10) || 0;
        const categoryId = productCategoryMap[productId] || 'uncategorized';
        reservedByCategory[categoryId] = (reservedByCategory[categoryId] || 0) + quantity;
      });
    });

  const response = await api.get('/stock_availables?display=full&limit=1000');
  const jsonObj = xmlToJson(response.data);
  const stockRows = ensureArray(jsonObj?.prestashop?.stock_availables?.stock_available);

  const totalsByCategory = {};
  stockRows.forEach((row) => {
    const productId = String(getTextVal(row?.id_product) || '').trim();
    if (!productId) return;

    const categoryId = productCategoryMap[productId] || 'uncategorized';
    if (!totalsByCategory[categoryId]) {
      totalsByCategory[categoryId] = {
        categoryId,
        categoryName: categoryMap[categoryId] || 'Non classe',
        physicalQuantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0
      };
    }

    totalsByCategory[categoryId].availableQuantity += getNumericValue(row?.quantity, 0);
  });

  Object.keys(totalsByCategory).forEach((categoryId) => {
    const reserved = reservedByCategory[categoryId] || 0;
    totalsByCategory[categoryId].reservedQuantity = reserved;
    totalsByCategory[categoryId].physicalQuantity = totalsByCategory[categoryId].availableQuantity + reserved;
  });

  Object.keys(reservedByCategory).forEach((categoryId) => {
    if (totalsByCategory[categoryId]) return;
    const reserved = reservedByCategory[categoryId] || 0;
    totalsByCategory[categoryId] = {
      categoryId,
      categoryName: categoryMap[categoryId] || 'Non classe',
      physicalQuantity: reserved,
      reservedQuantity: reserved,
      availableQuantity: 0
    };
  });

  return Object.values(totalsByCategory)
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName));
};

export const dashboardService = {
  getSalesOverview: async () => buildSalesData(),
  getProfitByCategory: async () => {
    const data = await buildSalesData();
    return data.profitByCategory;
  },
  getStockByCategory: async () => buildStockByCategory()
};
