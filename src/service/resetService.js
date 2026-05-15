import api from './api';

const resourcesLigne = import.meta.env.VITE_RESOURCES_TO_WIPE || "";
const resourcesToWipe = resourcesLigne.split(',').filter(res => res !== "");

export async function resetAllData() {
    for (const resource of resourcesToWipe) {
      console.log(resource);
        // const getRes = await api.get(`/${resource}?display=[id]&output_format=JSON`);
        // const data = await getRes.json();
        
        // let idArray = [];
        // if (data[resource]) {
        //     idArray = data[resource].map(item => item.id);
        // }

        // if (idArray.length > 0) {
        //     // Protection de la Base Catalogue
        //     if (resource === 'categories') {
        //         idArray = idArray.filter(id => parseInt(id) > 2);
        //     }
        //     if (resource === 'addresses') {
        //         idArray = idArray.filter(id => parseInt(id) != 3 && parseInt(id) != 4 && parseInt(id) != 6);
        //     }
        //     if (idArray.length === 0) continue;
            
        //     const idsString = `[${idArray.join(',')}]`;
        //     await fetch(`/api/${resource}/${idsString}?ws_key=${wsKey}`, {
        //         method: 'DELETE'
        //     });
        //     console.log(`${resource} vidée.`);
        // }
    }
}
