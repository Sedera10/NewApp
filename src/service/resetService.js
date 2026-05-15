import api from './api';

const resourcesLigne = import.meta.env.VITE_RESOURCES_TO_WIPE || "";
const resourcesToWipe = resourcesLigne.split(',').filter(res => res !== "");

const getSingularResourceName = (resource) => {
    if (resource.endsWith('ies')) {
        return `${resource.slice(0, -3)}y`;
    }

    if (resource.endsWith('s')) {
        return resource.slice(0, -1);
    }

    return resource;
};

const extractResourceItems = (payload, resource) => {
    const singularResource = getSingularResourceName(resource);
    const prestashopNode = payload?.prestashop ?? payload;

    const candidates = [
        payload?.[resource],
        payload?.[singularResource],
        prestashopNode?.[resource],
        prestashopNode?.[singularResource]
    ];

    for (const candidate of candidates) {
        if (!candidate) continue;

        if (Array.isArray(candidate)) {
            return candidate;
        }

        if (candidate.id !== undefined || candidate.ID !== undefined || candidate.Id !== undefined) {
            return [candidate];
        }

        if (Array.isArray(candidate[resource])) {
            return candidate[resource];
        }

        if (Array.isArray(candidate[singularResource])) {
            return candidate[singularResource];
        }

        const nestedArray = Object.values(candidate).find(value => Array.isArray(value));
        if (nestedArray) {
            return nestedArray;
        }
    }

    return [];
};

const extractIdValue = (item) => {
    const rawId = item?.id ?? item?.ID ?? item?.Id;

    if (rawId && typeof rawId === 'object') {
        return rawId['#text'] ?? rawId.text ?? rawId.value;
    }

    return rawId;
};

export const getResourcesToWipe = () => resourcesToWipe;

export async function resetResource(resource) {
    const response = await api.get(`/${resource}?display=[id]&output_format=JSON`);
    const payload = response?.data ?? response;
    const items = extractResourceItems(payload, resource);

    let idArray = items
        .map(extractIdValue)
        .filter(id => id !== undefined && id !== null && id !== "");

    if (idArray.length > 0) {
        if (resource === 'categories') {
            idArray = idArray.filter(id => parseInt(id) > 2);
        }
        if (resource === 'addresses') {
            idArray = idArray.filter(id => parseInt(id) != 3 && parseInt(id) != 4 && parseInt(id) != 6);
        }
        if (idArray.length === 0) return;

        let deletedCount = 0;

        for (const id of idArray) {
            try {
                await api.delete(`/${resource}/${id}`);
                deletedCount++;
            } catch (error) {
                const status = error?.response?.status;

                if (status !== 404) {
                    throw error;
                }

                console.warn(`Suppression ignorée pour ${resource}/${id} (route introuvable).`);
            }
        }

        console.log(`${resource} vidée. ${deletedCount} élément(s) supprimé(s).`);
        return deletedCount;
    }

    return 0;
}

export async function resetAllData(onProgress) {
    let completed = 0;
    for (const resource of resourcesToWipe) {
        if (onProgress) onProgress(resource, 'loading', completed);
        try {
            const deletedCount = await resetResource(resource);
            completed++;
            if (onProgress) onProgress(resource, 'done', completed, { deletedCount: deletedCount ?? 0 });
        } catch (error) {
            console.error(error);
            if (onProgress) onProgress(resource, 'error', completed);
        }
    }
}
