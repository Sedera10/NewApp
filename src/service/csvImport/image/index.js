// importation des images via .zip

export const importImage = async (imageFiles, file1Results, onProgress = () => {}) => {
  const results = {
    images: [],
    errors: [],
    summary: {
      totalImages: 0,
      successImages: 0,
      totalErrors: 0
    }
  };

  try {
    if (!imageFiles || imageFiles.length === 0) {
      results.errors.push('Aucun fichier image sélectionné');
      results.summary.totalErrors = results.errors.length;
      return results;
    }

    if (!file1Results || !file1Results.products) {
      results.errors.push('Les données du Fichier 1 (produits) sont manquantes');
      results.summary.totalErrors = results.errors.length;
      return results;
    }

    // Créer un cache des produits par référence pour recherche rapide
    const productsByReference = {};
    for (const product of file1Results.products) {
      if (product.id && product.reference) {
        productsByReference[product.reference] = product.id;
      }
    }

    // Filtrer les fichiers images valides
    const supportedExtensions = ['.png', '.jpg', '.jpeg'];
    const validImages = Array.from(imageFiles).filter(file => {
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      return supportedExtensions.includes(ext);
    });

    results.summary.totalImages = validImages.length;

    if (validImages.length === 0) {
      results.errors.push('Aucun fichier image valide (.png/.jpg/.jpeg) trouvé');
      results.summary.totalErrors = results.errors.length;
      return results;
    }

    // Traiter chaque image
    for (let i = 0; i < validImages.length; i++) {
      const file = validImages[i];

      try {
        // Extraire la référence du nom du fichier (sans extension)
        const fileName = file.name;
        const dotIndex = fileName.lastIndexOf('.');
        const reference = fileName.substring(0, dotIndex);

        if (!reference) {
          results.errors.push(`Image ignorée (nom invalide): ${fileName}`);
          continue;
        }

        onProgress?.({
          step: 'images',
          message: `Import des images... (${i + 1}/${validImages.length})`,
          progress: ((i + 1) / validImages.length) * 100
        });

        // Chercher le produit par référence
        const productId = productsByReference[reference];

        if (!productId) {
          results.errors.push(`Image '${fileName}': Produit avec référence '${reference}' non trouvé`);
          continue;
        }

        // Uploader l'image
        await uploadProductImage(productId, file);

        results.images.push({
          fileName,
          reference,
          productId,
          status: 'success'
        });

        results.summary.successImages++;
        console.log(`✓ Image importée: ${fileName} → produit ${reference} (ID: ${productId})`);
      } catch (error) {
        results.errors.push(`Image '${file.name}': ${error.message}`);
        console.error(`✗ Erreur image ${file.name}:`, error);
      }
    }

    results.summary.totalErrors = results.errors.length;
    onProgress?.({ step: 'complete', message: 'Import Fichier 4 (Images) terminé!' });

    return results;
  } catch (error) {
    results.errors.push(`Erreur générale Fichier 4: ${error.message}`);
    results.summary.totalErrors = results.errors.length;
    throw error;
  }
};

export const uploadProductImage = async (productId, file) => {
  const formData = new FormData();
  formData.append('image', file, file.name);

  try {
    const response = await api.post(`/images/products/${productId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      return response.data;
    } else {
      return response.data;
    }
  } catch (error) {
    let errorText = `HTTP Exception`;
    if (error.response) {
      errorText = `HTTP ${error.response.status} - ${typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data)}`;
    } else {
      errorText = error.message;
    }
    throw new Error(`Upload échoué: ${errorText}`);
  }
};