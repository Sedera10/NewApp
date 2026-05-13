import api from "./api";
import { xmlToJson, jsonToXml, buildPrestashopXml } from "./Util";
import { getCustomerById } from "./Customer";
import { getAddresseById } from "./Addresse";

const getTextVal = (val) => {
    if (val && typeof val === 'object' && val['#text'] !== undefined) {
        return val['#text'];
    }
    return val;
};

export const commandeService = {
  getPaymentModules: async () => {
    try {
      // Try the API endpoint first
      const response = await api.get('/modules?display=full');
      const jsonObj = xmlToJson(response.data);
      let modules = jsonObj?.prestashop?.modules?.module || [];
      if (!Array.isArray(modules)) modules = [modules];

      const paymentModules = modules.filter(mod => {
        const active = getTextVal(mod.active);
        const name = getTextVal(mod.name);
        const isPaymentModule = ['bankwire', 'cash_on_delivery', 'ps_checkpayment', 'stripe', 'paypal'].includes(name);
        return (active === '1' || active === 1) && isPaymentModule;
      });

      return paymentModules.map(mod => ({
        name: getTextVal(mod.name),
        displayName: getTextVal(mod.display_name) || getTextVal(mod.name)
      }));
    } catch (error) {
      console.error("Error fetching payment modules from API:", error);
      // Fallback to default list - in real scenario these would be fetched from config
      return [
        { name: 'cash_on_delivery', displayName: 'Payer comptant à la livraison' }
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
        const idAddress = getTextVal(order.id_address_delivery);
        const idState = getTextVal(order.current_state);

        // Fetch relations in parallel for maximum speed
        const [customerName, addressName, stateName] = await Promise.all([
            commandeService.CustomName(idCustomer),
            commandeService.AddresseLivraisonName(idAddress),
            commandeService.CurrentStateName(idState)
        ]);

        return {
            id: getTextVal(order.id),
            reference: getTextVal(order.reference),
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
          const customer = await getCustomerById(id);
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
      try {
          const response = await api.get(`/order_states/${id}?display=full`);
          const state = xmlToJson(response.data).prestashop.order_state;

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

          const payload = {
              id_cart: orderData.id_cart,
              id_customer: orderData.id_customer,
              id_address_delivery: orderData.id_address_delivery,
              id_address_invoice: orderData.id_address_invoice || orderData.id_address_delivery,
              id_currency: 1,
              id_lang: 1,
              id_carrier: orderData.id_carrier || 0,
              payment: orderData.payment || 'Transfer',
              module: orderData.module || 'bankwire',
              conversion_rate: 1,
              total_paid: orderData.total_paid,
              total_paid_real: orderData.total_paid_real || orderData.total_paid,
              total_products: orderData.total_products,
              total_products_wt: orderData.total_products_wt || orderData.total_products,
              total_shipping: orderData.total_shipping || 0,
              total_shipping_tax_incl: orderData.total_shipping_tax_incl || orderData.total_shipping || 0,
              current_state: 1
          };

          console.log('Order payload:', payload);
          const xmlPayload = buildPrestashopXml('order', payload);
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

  updateOrderStatus: async (idOrder, idOrderState) => {
      try {
          // PrestaShop needs an order history entry to change the current status
          const payload = {
              id_order: idOrder,
              id_order_state: idOrderState
          };

          const xmlPayload = buildPrestashopXml('order_history', payload);

          // Send to PrestaShop API
          await api.post('/order_histories', xmlPayload, {
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
