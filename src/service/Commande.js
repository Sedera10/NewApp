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
