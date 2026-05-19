import api from "./api";
import { xmlToJson, jsonToXml, buildPrestashopXml } from "./Util";
import { customerService } from "./Customer";
import { getAddresseById } from "./Addresse";
import { buildOrderXML } from "./xml/ordersXmlBuilder";

const getTextVal = (val) => {
    if (val && typeof val === 'object' && val['#text'] !== undefined) {
        return val['#text'];
    }
    return val;
};

export const commandeService = {
  getOrderDetails: async (orderId) => {
    try {
      const response = await api.get(`/orders/${orderId}?display=full`);
      const jsonObj = xmlToJson(response.data);
      const order = jsonObj?.prestashop?.order;

      if (!order) return null;

      const idCustomer = getTextVal(order.id_customer);
      const idAddressDelivery = getTextVal(order.id_address_delivery);
      const idState = getTextVal(order.current_state);

      // Fetch customer info
      let customerName = `Client #${idCustomer}`;
      try {
        if (idCustomer && idCustomer !== '0') {
          const customer = await customerService.getCustomerById(idCustomer);
          if (customer) {
            customerName = `${customer.firstname} ${customer.lastname}`;
          }
        }
      } catch (err) { }

      // Fetch address info
      let addressInfo = { fullName: `Adresse #${idAddressDelivery}`, address: '' };
      try {
        if (idAddressDelivery && idAddressDelivery !== '0') {
          const address = await getAddresseById(idAddressDelivery);
          if (address) {
            addressInfo = {
              fullName: `${address.firstname} ${address.lastname}`,
              address: `${address.address1}, ${address.postcode} ${address.city}`,
              country: address.country,
              phone: address.phone
            };
          }
        }
      } catch (err) { }

      // Fetch order state name
      let stateName = 'Inconnu';
      try {
        if (idState && idState !== '0') {
          const stateResponse = await api.get(`/order_states?display=full&filter[id]=[${idState}]`);
          const stateJson = xmlToJson(stateResponse.data);
          const states = stateJson?.prestashop?.order_states?.order_state || [];
          const state = Array.isArray(states) ? states[0] : states;
          stateName = getTextVal(state?.name);
        }
      } catch (err) { }

      // Format order rows with product images
      let orderRows = order?.associations?.order_rows?.order_row || [];
      if (!Array.isArray(orderRows)) orderRows = [orderRows];

      const formattedRows = await Promise.all(orderRows.map(async (row) => {
        const productId = getTextVal(row.product_id);
        let productImage = '/placeholder.png';

        // Fetch product image
        try {
          const productResponse = await api.get(`/products/${productId}?display=full`);
          const productJson = xmlToJson(productResponse.data);
          const product = productJson?.prestashop?.product;

          if (product?.associations?.images?.image) {
            let images = product.associations.images.image;
            if (!Array.isArray(images)) images = [images];
            const firstImage = images[0];
            const defaultImageId = getTextVal(product.id_default_image);
            productImage = defaultImageId ? `${api.defaults.baseURL}/images/products/${productId}/${defaultImageId}/?ws_key=${api.defaults.params.ws_key}` : 'https://picsum.photos/300';
          }
        } catch (err) {
          console.error(`Error fetching product image for ${productId}:`, err);
        }

        return {
          id: getTextVal(row.id_),
          productId: productId,
          productName: getTextVal(row.product_name),
          productReference: getTextVal(row.product_reference),
          quantity: parseInt(getTextVal(row.product_quantity), 10) || 0,
          productPrice: parseFloat(getTextVal(row.product_price)) || 0,
          unitPriceTaxIncl: parseFloat(getTextVal(row.unit_price_tax_incl)) || 0,
          productImage: productImage
        };
      }));

      return {
        id: getTextVal(order.id),
        reference: getTextVal(order.reference),
        totalPaid: parseFloat(getTextVal(order.total_paid)) || 0,
        totalProducts: parseFloat(getTextVal(order.total_products)) || 0,
        totalShipping: parseFloat(getTextVal(order.total_shipping)) || 0,
        payment: getTextVal(order.payment),
        module: getTextVal(order.module),
        dateAdd: getTextVal(order.date_add),
        currentState: idState,
        stateName: stateName,
        customerName: customerName,
        customerId: idCustomer,
        addressDelivery: addressInfo,
        idAddressDelivery: idAddressDelivery,
        carrier: getTextVal(order.id_carrier),
        orderRows: formattedRows
      };
    } catch (error) {
      console.error(`Erreur lors de la récupération de la commande ${orderId}:`, error);
      return null;
    }
  },

  getPaymentModules: async () => {
    return [
      { name: 'ps_cashondelivery', displayName: 'Payer comptant à la livraison' }
    ];
  },

  getShippingCarriers: async () => {
    try {
      const response = await api.get('/carriers?display=full');
      const jsonObj = xmlToJson(response.data);
      let carriers = jsonObj?.prestashop?.carriers?.carrier || [];
      if (!Array.isArray(carriers)) carriers = [carriers];

      const extractLanguageText = (val) => {
        if (!val) return '';
        if (typeof val === 'string') return val;
        if (val['#text']) return val['#text'];
        if (val.language) {
          if (Array.isArray(val.language)) {
            return val.language[0]['#text'] || val.language[0];
          }
          return val.language['#text'] || val.language;
        }
        return '';
      };

      return carriers
        .filter(c => getTextVal(c.active) === '1' || getTextVal(c.active) === 1)
        .map(c => ({
          id: getTextVal(c.id),
          name: extractLanguageText(c.name),
          delay: extractLanguageText(c.delay),
          price: parseFloat(getTextVal(c.price)) || 0
        }));
    } catch (error) {
      console.error("Error fetching carriers:", error);
      return [
        { id: 0, name: 'Gratuit', delay: '5-7 jours', price: 0 }
      ];
    }
  },

  getCommandes: async () => {
    const response = await api.get('/orders?display=full');
    const jsonObj = xmlToJson(response.data);
    let orders = jsonObj?.prestashop?.orders?.order || [];
    if (!Array.isArray(orders)) orders = [orders];

    // Format all orders "en un coup" by fetching their nested relations concurrently
    const formattedOrders = await Promise.all(orders.map(async (order) => {
        const idCustomer = getTextVal(order.id_customer);
        const idAddressDelivery = getTextVal(order.id_address_delivery);
        const idState = getTextVal(order.current_state);
        const idCart = getTextVal(order.id_cart);

        // Only fetch address if ID is valid
        let addressName = `Adresse #${idAddressDelivery}`;
        if (idAddressDelivery && idAddressDelivery !== '0' && idAddressDelivery !== 0) {
          addressName = await commandeService.AddresseLivraisonName(idAddressDelivery);
        }

        // Fetch relations in parallel for maximum speed
        const [customerName, stateName] = await Promise.all([
            commandeService.CustomName(idCustomer),
            commandeService.CurrentStateName(idState)
        ]);

        return {
            id: getTextVal(order.id),
            idCustomer: idCustomer,
            reference: getTextVal(order.reference),
            id_cart: idCart,
            total_paid: getTextVal(order.total_paid),
            payment: getTextVal(order.payment),
            date_add: getTextVal(order.date_add),
            current_state: idState,

            // Nested relations stringified properties
            customerName: customerName,
            addressName: addressName,
            stateName: stateName
        };
    }));

    return formattedOrders;
  },

  getStatusCommandes: async () => {
    const response = await api.get('/order_states?display=full');
    const jsonObj = xmlToJson(response.data);
    return jsonObj?.prestashop?.order_states?.order_state || []; 
  },

  CustomName: async (idCustomer) => {
      try {
          const id = getTextVal(idCustomer);
          if (!id || String(id) === '0') {
            return `Client #${idCustomer}`;
          }
          const customer = await customerService.getCustomerById(id);
          if (!customer) {
            return `Client #${idCustomer}`;
          }
          return `${customer.firstname} ${customer.lastname}`;
      } catch (error) {
          return `Client #${idCustomer}`;
      }
  },

  AddresseLivraisonName: async (idAddresse) => {
      let id = getTextVal(idAddresse);
      try {
          const adresse = await getAddresseById(id);
          return `${getTextVal(adresse.city)} '${getTextVal(adresse.address1)}'`;
      } catch (error) {
          return `Adresse #${id}`;
      }
  },

  CurrentStateName: async (idState) => {
      let id = getTextVal(idState);
      if (!id || String(id) === '0') {
        return `Status #${id}`;
      }
      try {
        const response = await api.get(`/order_states?display=full&filter[id]=[${id}]`);
        const stateList = xmlToJson(response.data).prestashop.order_states?.order_state || [];
        const state = Array.isArray(stateList) ? stateList[0] : stateList;

          let nameFinal = "Status inconnu";

          if (Array.isArray(state.name)) {
              nameFinal = state.name[0].language ? state.name[0].language['#text'] : '';
          } else if (state.name && state.name.language) {
              if (Array.isArray(state.name.language)) {
                  nameFinal = state.name.language[0]['#text'] !== undefined ? state.name.language[0]['#text'] : state.name.language[0];
              } else {
                  nameFinal = state.name.language['#text'] !== undefined ? state.name.language['#text'] : state.name.language;
              }
          } else if (typeof state.name === 'string') {
              nameFinal = state.name;
          } else if (state.name && state.name['#text']) {
              nameFinal = state.name['#text'];
          }

          return String(nameFinal);
      } catch (error) {
          return `Status #${id}`
      }
  },

  createOrder: async (orderData) => {
      try {
          console.log('Order data received:', orderData);

        const totalPaid = Number.parseFloat(orderData.total_paid ?? 0) || 0;
        const totalProducts = Number.parseFloat(orderData.total_products ?? 0) || 0;
        const totalShipping = Number.parseFloat(orderData.total_shipping ?? 0) || 0;
        const totalShippingTaxIncl = Number.parseFloat(orderData.total_shipping_tax_incl ?? totalShipping) || 0;
        const payload = {
          id_order: orderData.id_order,
          id_cart: orderData.id_cart,
          id_customer: orderData.id_customer,
          id_address_delivery: orderData.id_address_delivery,
          id_address_invoice: orderData.id_address_invoice || orderData.id_address_delivery,
          id_currency: orderData.id_currency || 1,
          id_lang: orderData.id_lang || 1,
          id_carrier: orderData.id_carrier || 1,
          payment: orderData.payment || 'Paiement a la livraison',
          module: orderData.module || 'ps_cashondelivery',
          current_state: orderData.current_state || 3,
          total_paid: totalPaid,
          total_paid_real: Number.parseFloat(orderData.total_paid_real ?? totalPaid) || totalPaid,
          total_products: totalProducts,
          total_products_wt: Number.parseFloat(orderData.total_products_wt ?? totalProducts) || totalProducts,
          total_shipping: totalShipping,
          total_shipping_tax_incl: totalShippingTaxIncl,
          total_shipping_tax_excl: Number.parseFloat(orderData.total_shipping_tax_excl ?? totalShipping) || totalShipping,
          total_discounts: Number.parseFloat(orderData.total_discounts ?? 0) || 0,
          total_discounts_tax_incl: Number.parseFloat(orderData.total_discounts_tax_incl ?? 0) || 0,
          total_discounts_tax_excl: Number.parseFloat(orderData.total_discounts_tax_excl ?? 0) || 0,
          total_wrapping: Number.parseFloat(orderData.total_wrapping ?? 0) || 0,
          total_wrapping_tax_incl: Number.parseFloat(orderData.total_wrapping_tax_incl ?? 0) || 0,
          total_wrapping_tax_excl: Number.parseFloat(orderData.total_wrapping_tax_excl ?? 0) || 0,
          conversion_rate: orderData.conversion_rate || 1,
          secure_key: orderData.secure_key
        };

          console.log('Order payload:', payload);
        const xmlPayload = buildOrderXML(payload);
          console.log('XML Payload:', xmlPayload);

          const response = await api.post('/orders', xmlPayload, {
              headers: {
                  'Content-Type': 'application/xml'
              }
          });

          const jsonObj = xmlToJson(response.data);
          console.log('Order created response:', jsonObj);
          return jsonObj?.prestashop?.order;
      } catch (error) {
          console.error("Error creating order:", error);
          console.error("Error status:", error.response?.status);
          console.error("Error data:", error.response?.data);
          console.error("Error text:", error.response?.text);
          console.error("Error full response:", error.response);
          throw error;
      }
  },

  updateOrder: async (orderId, orderData) => {
      try {
          console.log('Updating order:', orderId, 'with data:', orderData);

          const payload = {
              id: orderId,
              id_cart: orderData.id_cart || 0,
              id_customer: orderData.id_customer || 0,
              id_currency: orderData.id_currency || 1,
              id_lang: orderData.id_lang || 1,
              ...orderData
          };

          const xmlPayload = buildPrestashopXml('order', payload);
          console.log('Update order XML:', xmlPayload);

          const response = await api.put(`/orders/${orderId}`, xmlPayload, {
              headers: {
                  'Content-Type': 'application/xml'
              }
          });

          const jsonObj = xmlToJson(response.data);
          console.log('Order update response:', jsonObj);
          return jsonObj?.prestashop?.order;
      } catch (error) {
          console.error(`Error updating order ${orderId}:`, error);
          console.error("Error response data:", error.response?.data);
          throw error;
      }
  },

  updateOrderStatus: async (idOrder, idOrderState) => {
      try {
        console.info('order_state_update.create', {
          idOrder,
          idOrderState
        });
        const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order_state_update>
    <id_order><![CDATA[${idOrder}]]></id_order>
    <id_order_state><![CDATA[${idOrderState}]]></id_order_state>
    <date_add><![CDATA[${new Date().toISOString().replace('T', ' ').slice(0, 19)}]]></date_add>
  </order_state_update>
</prestashop>`;

        await api.post('/order_state_update', xmlPayload, {
              headers: {
                  'Content-Type': 'application/xml'
              }
          });

          return true;
      } catch (error) {
          console.error("Error updating order status:", error);
          throw error;
      }
  }
};
