import api from "./api";
import { xmlToJson, jsonToXml } from "./Util";
import { getCustomerById } from "./Customer";
import { getAddresseById } from "./Addresse";

export const getCommandes = async () => {
  const response = await api.get('/orders?display=full');
  const jsonObj = xmlToJson(response.data);
  return jsonObj.prestashop.orders.order; 
};

export const getStatusCommandes = async() => {
    const response = await api.get('/order_states?display=full');
  const jsonObj = xmlToJson(response.data);
  return jsonObj.prestashop.order_states.order_state; 
}

export const CustomName = async (idCustomer) => {
    try {
        const id = typeof idCustomer === 'object' && idCustomer !== null && idCustomer['#text'] !== undefined 
            ? idCustomer['#text'] 
            : idCustomer;
        const customer = await getCustomerById(id);

        return `${customer.firstname} ${customer.lastname}`;
    } catch (error) {
        return `Client #${idCustomer}`;
    }
}   

export const AddresseLivraisonName = async (idAddresse) => {
    let id;
    try {
        id = typeof idAddresse === 'object' && idAddresse !== null && idAddresse['#text'] !== undefined 
            ? idAddresse['#text'] 
            : idAddresse;
        const adresse = await getAddresseById(id);

        return `${adresse.city} '${adresse.address1}'`;
    } catch (error) {
        return `Adresse #${id}`;
    }
}   

export const CurrentStateName = async(idState) => {
    let id;
    try {
        id = typeof idState === 'object' && idState !== null && idState['#text'] !== undefined 
            ? idState['#text'] 
            : idState;
        const response = await api.get(`/order_states/${id}?display=full`)
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
}
