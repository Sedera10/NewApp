export const extractZipFiles = async (zipFile) => {
  try {
    // Dynamique import de JSZip
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    
    // Charger le ZIP
    const contents = await zip.loadAsync(zipFile);
    
    const extractedFiles = [];
    
    // Parcourir tous les fichiers du ZIP
    for (const [path, file] of Object.entries(contents.files)) {
      // Ignorer les dossiers et fichiers système
      if (file.dir || path.includes('__MACOSX') || path.includes('.DS_Store')) {
        continue;
      }
      
      // Obtenir le nom du fichier sans le chemin
      const fileName = path.split('/').pop();
      
      // Récupérer les données du fichier
      const blob = await file.async('blob');
      
      // Créer un objet File
      const extractedFile = new File([blob], fileName, { type: blob.type });
      extractedFiles.push(extractedFile);
      
      console.log(`✓ Fichier extrait du ZIP: ${fileName}`);
    }
    
    console.log(`✓ Total de fichiers extraits: ${extractedFiles.length}`);
    return extractedFiles;
  } catch (error) {
    console.error('Erreur lors de l\'extraction du ZIP:', error);
    throw new Error(`Impossible d'extraire le fichier ZIP: ${error.message}`);
  }
};