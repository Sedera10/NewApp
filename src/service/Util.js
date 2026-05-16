import { XMLBuilder, XMLParser } from 'fast-xml-parser';

// methode pour verifier url 
export const urlContains = (pathname, value) => {
  return pathname.includes(value);
};

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: "@_" });

export const xmlToJson = (xml) => {
  return parser.parse(xml);
};

export const jsonToXml = (jsonObj) => {
  return builder.build(jsonObj);
};

// Creates a properly formatted XML string for Prestashop POST/PUT requests
export const buildPrestashopXml = (resourceName, dataObj) => {
  const jsonObj = {
    prestashop: {
      [resourceName]: dataObj
    }
  };
  // Prepend XML declaration
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + builder.build(jsonObj);
};

/**
 * Extrait les fichiers d'une archive ZIP
 * @param {File} zipFile - Le fichier ZIP à extraire
 * @returns {Promise<File[]>} - Tableau des fichiers extraits
 */
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
