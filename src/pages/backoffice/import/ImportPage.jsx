import React, { useState } from 'react';
import { MdCloudUpload, MdFileUpload, MdFolderZip, MdImage } from 'react-icons/md';
import { importFile1, importFile2, importFile3, importFile4, rollbackAllImports } from '../../../service/csvImportService';
import { extractZipFiles } from '../../../service/Util';

export default function ImportPage() {
    const [file1, setFile1] = useState(null);
    const [file2, setFile2] = useState(null);
    const [file3, setFile3] = useState(null);
    const [imageFiles, setImageFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [progressMsg, setProgressMsg] = useState('');

    const handleFile1Change = (e) => {
        setFile1(e.target.files?.[0] || null);
    };

    const handleFile2Change = (e) => {
        setFile2(e.target.files?.[0] || null);
    };

    const handleFile3Change = (e) => {
        setFile3(e.target.files?.[0] || null);
    };

    const handleImageChange = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            // Pour un ZIP, on stocke le fichier ZIP directement
            setImageFiles([files[0]]);
        } else {
            setImageFiles([]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!file1 && !file2 && !file3 && imageFiles.length === 0) {
            alert("Veuillez sélectionner au moins un fichier à importer.");
            return;
        }

        setIsLoading(true);
        setProgressMsg('Démarrage de l\'import...');

        try {
            let file1Results = null;
            let file2Results = null;
            let file3Results = null;
            let hasError = false;

            // Fichier 1 : Produits et Catégories
            if (file1) {
                try {
                    file1Results = await importFile1(file1, (progress) => setProgressMsg(`(1/4) ${progress.message}`));
                } catch (error) {
                    console.error("Erreur File1:", error);
                    setProgressMsg('Erreur lors de l\'import du Fichier 1, rollback en cours...');
                    await rollbackAllImports();
                    throw new Error(`Fichier 1 échoué: ${error.message}`);
                }
            }

            // Fichier 2 : Variantes et Stock (Nécessite Fichier 1)
            if (file2 && file1Results) {
                try {
                    file2Results = await importFile2(file2, file1Results, (progress) => setProgressMsg(`(2/4) ${progress.message}`));
                } catch (error) {
                    console.error("Erreur File2:", error);
                    setProgressMsg('Erreur lors de l\'import du Fichier 2, rollback en cours...');
                    await rollbackAllImports();
                    throw new Error(`Fichier 2 échoué: ${error.message}`);
                }
            }

            // Fichier 3 : Commandes et Clients (Nécessite Fichier 1 et 2)
            if (file3 && file1Results && file2Results) {
                try {
                    file3Results = await importFile3(file3, file1Results, file2Results, (progress) => setProgressMsg(`(3/4) ${progress.message}`));
                } catch (error) {
                    console.error("Erreur File3:", error);
                    setProgressMsg('Erreur lors de l\'import du Fichier 3, rollback en cours...');
                    await rollbackAllImports();
                    throw new Error(`Fichier 3 échoué: ${error.message}`);
                }
            }

            // Images : Fichier 4 (Nécessite les résultats du fichier 1)
            if (imageFiles.length > 0 && file1Results) {
                try {
                    setProgressMsg('(4/4) Extraction du ZIP des images...');
                    
                    // Extraire les fichiers du ZIP
                    const extractedImages = await extractZipFiles(imageFiles[0]);
                    
                    if (extractedImages.length === 0) {
                        throw new Error('Le fichier ZIP ne contient aucune image');
                    }
                    
                    setProgressMsg(`(4/4) Importation des ${extractedImages.length} image(s)...`);
                    await importFile4(extractedImages, file1Results, (progress) => setProgressMsg(`(4/4) ${progress.message}`));
                } catch (error) {
                    console.error("Erreur File4:", error);
                    setProgressMsg('Erreur lors de l\'import des images, rollback en cours...');
                    await rollbackAllImports();
                    throw new Error(`Fichier 4 (images) échoué: ${error.message}`);
                }
            }

            alert("Fichiers importés avec succès !");
            setFile1(null);
            setFile2(null);
            setFile3(null);
            setImageFiles([]);
            document.querySelector('#file1Input').value = '';
            document.querySelector('#file2Input').value = '';
            document.querySelector('#file3Input').value = '';
            const imgInput = document.querySelector('#imageInput');
            if (imgInput) imgInput.value = '';

        } catch (error) {
            console.error("Erreur d'import", error);
            alert("Une erreur s'est produite lors de l'import : " + error.message);
        } finally {
            setIsLoading(false);
            setProgressMsg('');
        }
    };

    return (
        <div className="container-fluid py-4">
            <h1 className="text-start mb-5 text-dark fw-bold" style={{ textAlign: "right" }}>Import de Données</h1>
            
            <div className="row justify-content-center">
                <div className="col-12 col-md-10 col-lg-8">
                    <div className="card shadow-sm border-0 bg-white" style={{ borderRadius: '12px' }}>
                        <div className="card-body p-5">
                            
                            <div className="text-center mb-5">
                                <MdCloudUpload size={60} className="text-primary mb-3" />
                                <p className="text-muted">
                                    Importez vos fichiers CSV pour les données et ZIP pour les images.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit}>
                                
                                {/* Section CSV - 3 Fichiers Séparés */}
                                <h5 className="mb-3 text-secondary d-flex align-items-center justify-content-center">
                                    <MdFileUpload className="me-2" size={24} /> Fichiers de données (.csv)
                                </h5>
                                <p className="small text-muted text-center mb-4">
                                    Sélectionnez les 3 fichiers CSV dans l'ordre. Chaque fichier a des dépendances sur le(s) précédent(s).
                                </p>

                                {/* Fichier 1 */}
                                <div className="mb-3 p-3 border rounded bg-light">
                                    <label className="form-label fw-bold text-dark mb-2 d-flex align-items-center">
                                        <span className="badge bg-primary me-2">1</span>
                                        Fichier 1 : Produits & Catégories
                                    </label>
                                    <input 
                                        id="file1Input"
                                        type="file" 
                                        className="form-control" 
                                        accept=".csv" 
                                        onChange={handleFile1Change}
                                    />
                                    {file1 && (
                                        <div className="mt-2 small text-success">
                                            ✓ {file1.name}
                                        </div>
                                    )}
                                </div>

                                {/* Fichier 2 */}
                                <div className="mb-3 p-3 border rounded bg-light">
                                    <label className="form-label fw-bold text-dark mb-2 d-flex align-items-center">
                                        <span className="badge bg-info me-2">2</span>
                                        Fichier 2 : Variantes & Stock
                                    </label>
                                    <input 
                                        id="file2Input"
                                        type="file" 
                                        className="form-control" 
                                        accept=".csv" 
                                        onChange={handleFile2Change}
                                    />
                                    {file2 && (
                                        <div className="mt-2 small text-success">
                                            ✓ {file2.name}
                                        </div>
                                    )}
                                </div>

                                {/* Fichier 3 */}
                                <div className="mb-4 p-3 border rounded bg-light">
                                    <label className="form-label fw-bold text-dark mb-2 d-flex align-items-center">
                                        <span className="badge bg-warning me-2" style={{ color: '#fff' }}>3</span>
                                        Fichier 3 : Commandes & Clients
                                    </label>
                                    <input 
                                        id="file3Input"
                                        type="file" 
                                        className="form-control" 
                                        accept=".csv" 
                                        onChange={handleFile3Change}
                                    />
                                    {file3 && (
                                        <div className="mt-2 small text-success">
                                            ✓ {file3.name}
                                        </div>
                                    )}
                                </div>

                                {/* Séparateur */}
                                <hr className="my-5 opacity-25" />

                                {/* Section Images */}
                                <h5 className="mb-3 text-secondary d-flex align-items-center justify-content-center">
                                    <MdImage className="me-2" size={24} /> Images des produits (.zip)
                                </h5>
                                <div className="mb-5 p-4 border rounded bg-light shadow-sm text-center">
                                    <p className="small text-secondary mb-3">
                                        Importez un fichier ZIP contenant les images des produits. Le nom de chaque image doit correspondre à la référence du produit.
                                    </p>
                                    <input 
                                        id="imageInput"
                                        type="file" 
                                        className="form-control" 
                                        accept=".zip" 
                                        onChange={handleImageChange}
                                    />
                                    {imageFiles.length > 0 && (
                                        <div className="mt-2 fw-bold small text-primary">
                                            ✓ {imageFiles[0].name} sélectionné
                                        </div>
                                    )}
                                </div>

                                {/* Bouton de Soumission */}
                                <div className="text-center mt-2 d-flex justify-content-center">
                                    <button 
                                        type="submit" 
                                        className="btn text-white fw-bold py-3 shadow-primary" 
                                        style={{ background: 'var(--primary-gradient)', borderRadius: '8px', minWidth: '300px' }}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <><span className="spinner-border spinner-border-sm me-2"></span> {progressMsg || 'IMPORTATION EN COURS...'}</>
                                        ) : (
                                            "TRAITER ET IMPORTER LES DONNÉES"
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
