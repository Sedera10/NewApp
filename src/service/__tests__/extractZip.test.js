/**
 * Test unitaire pour la fonction extractZipFiles
 * Ce fichier documente comment tester l'extraction de fichiers ZIP
 */

import { extractZipFiles } from '../Util';

describe('extractZipFiles', () => {
  // Note: Ce test est documentaire car il nécessite des fichiers réels
  // Pour tester en développement, utilisez le navigateur ou un test d'intégration
  
  it('devrait extraire les fichiers d\'un ZIP valide', async () => {
    // Créer un ZIP de test avec JSZip
    const JSZip = require('jszip');
    const zip = new JSZip();
    
    // Ajouter des fichiers test
    zip.file('image1.jpg', 'contenu fake 1');
    zip.file('image2.png', 'contenu fake 2');
    zip.file('subfolder/image3.jpg', 'contenu fake 3');
    
    // Générer le blob ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipFile = new File([zipBlob], 'test.zip', { type: 'application/zip' });
    
    // Appeler la fonction
    const extractedFiles = await extractZipFiles(zipFile);
    
    // Assertions
    expect(extractedFiles.length).toBe(3);
    expect(extractedFiles[0].name).toBe('image1.jpg');
    expect(extractedFiles[1].name).toBe('image2.png');
    expect(extractedFiles[2].name).toBe('image3.jpg'); // Sans le chemin du dossier
  });

  it('devrait ignorer les dossiers et fichiers système', async () => {
    const JSZip = require('jszip');
    const zip = new JSZip();
    
    // Ajouter des fichiers incluant des fichiers système
    zip.file('image1.jpg', 'contenu');
    zip.folder('__MACOSX'); // Dossier macOS
    zip.file('.DS_Store', 'contenu');
    
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipFile = new File([zipBlob], 'test.zip', { type: 'application/zip' });
    
    const extractedFiles = await extractZipFiles(zipFile);
    
    // Seul image1.jpg devrait être extrait
    expect(extractedFiles.length).toBe(1);
    expect(extractedFiles[0].name).toBe('image1.jpg');
  });

  it('devrait lever une erreur pour un ZIP vide', async () => {
    const JSZip = require('jszip');
    const zip = new JSZip();
    
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipFile = new File([zipBlob], 'empty.zip', { type: 'application/zip' });
    
    await expect(extractZipFiles(zipFile)).rejects.toThrow();
  });
});
