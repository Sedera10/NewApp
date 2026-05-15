import api from './api';

const resourcesLigne = import.meta.env.VITE_RESOURCES_TO_WIPE || "";
const resourcesToWipe = resourcesLigne.split(',').filter(res => res !== "");

export const getResourcesToWipe = () => resourcesToWipe;

export async function resetResource(resource) {
    const getRes = await api.get(`/${resource}?display=[id]&output_format=JSON`);
    let data;
    try {
        data = getRes.json ? await getRes.json() : getRes;
    } catch(e) {
        data = getRes;
    }
    
    let idArray = [];
    if (data && data[resource]) {
        idArray = data[resource].map(item => item.id);
    }

    if (idArray.length > 0) {
        if (resource === 'categories') {
            idArray = idArray.filter(id => parseInt(id) > 2);
        }
        if (resource === 'addresses') {
            idArray = idArray.filter(id => parseInt(id) != 3 && parseInt(id) != 4 && parseInt(id) != 6);
        }
        if (idArray.length === 0) return;
        
        const idsString = `[${idArray.join(',')}]`;
        
        await api.delete(`/${resource}/${idsString}`);
        console.log(`${resource} vidée.`);
    }
}

export async function resetAllData(onProgress) {
    let completed = 0;
    for (const resource of resourcesToWipe) {
        if (onProgress) onProgress(resource, 'loading', completed);
        try {
            await resetResource(resource);
            completed++;
            if (onProgress) onProgress(resource, 'done', completed);
        } catch (error) {
            console.error(error);
            if (onProgress) onProgress(resource, 'error', completed);
        }
    }
}
