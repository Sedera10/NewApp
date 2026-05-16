import React, { useState } from 'react';
import { MdCloudUpload, MdFileUpload, MdFolderZip, MdImage } from 'react-icons/md';
import { importFile1, importFile2, importFile3, importFile4 } from '../../../service/csvImportService';

export default function ImportPage() {
    const [csvFiles, setCsvFiles] = useState([]);
    const [imageFiles, setImageFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [progressMsg, setProgressMsg] = useState('');

    const handleCsvChange = (e) => {
        // Trier les fichiers par nom pour s'assurer que c'est dans l'ordre de traitement
        // ou vous pouvez vous fier à l'ordre de sélection
        const selectedFiles = Array.from(e.target.files).sort((a, b) => a.name.localeCompare(b.name));
        setCsvFiles(selectedFiles);
    };

    const handleImageChange = (e) => {
        setImageFiles(Array.from(e.target.files));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (csvFiles.length === 0 && imageFiles.length === 0) {
            alert("Veuillez sélectionner au moins un fichier à importer.");
            return;
        }

        setIsLoading(true);
        setProgressMsg('Démarrage de l\'import...');

        try {
            let file1Results = null;
            let file2Results = null;

            // Fichier 1 : Produits et Catégories
            if (csvFiles.length > 0) {
                file1Results = await importFile1(csvFiles[0], (progress) => setProgressMsg(`(1/4) ${progress.message}`));
            }

            // Fichier 2 : Variantes et Stock (Nécessite Fichier 1)
            if (csvFiles.length > 1 && file1Results) {
                file2Results = await importFile2(csvFiles[1], file1Results, (progress) => setProgressMsg(`(2/4) ${progress.message}`));
            }

            // Fichier 3 : Commandes et Clients (Nécessite Fichier 1 et 2)
            if (csvFiles.length > 2 && file1Results && file2Results) {
                await importFile3(csvFiles[2], file1Results, file2Results, (progress) => setProgressMsg(`(3/4) ${progress.message}`));
            }

            // Images : Fichier 4 (Nécessite les résultats du fichier 1)
            if (imageFiles.length > 0 && file1Results) {
                setProgressMsg('(4/4) Importation des images...');
                await importFile4(imageFiles, file1Results, (progress) => setProgressMsg(`(4/4) ${progress.message}`));
            }

            alert("Fichiers importés avec succès !");
            setCsvFiles([]);
            setImageFiles([]);
            document.querySelector('#csvInput').value = '';
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
                                
                                {/* Section CSV */}
                                <h5 className="mb-3 text-secondary d-flex align-items-center justify-content-center">
                                    <MdFileUpload className="me-2" size={24} /> Fichiers de données (.csv)
                                </h5>
                                <div className="mb-4 p-4 border rounded bg-light shadow-sm text-center">
                                    <p className="small text-secondary mb-3">
                                        Sélectionnez jusqu'à 3 fichiers CSV séparés par des virgules (virgules ou point-virgules).
                                    </p>
                                    <input 
                                        id="csvInput"
                                        type="file" 
                                        className="form-control" 
                                        accept=".csv" 
                                        multiple 
                                        onChange={handleCsvChange}
                                    />
                                    {csvFiles.length > 0 && (
                                        <div className="mt-2 fw-bold small text-primary">
                                            {csvFiles.length} fichier(s) sélectionné(s) : {csvFiles.map(f => f.name).join(', ')}
                                        </div>
                                    )}
                                </div>

                                {/* Séparateur */}
                                <hr className="my-5 opacity-25" />

                                {/* Section Images */}
                                <h5 className="mb-3 text-secondary d-flex align-items-center justify-content-center">
                                    <MdImage className="me-2" size={24} /> Images des produits (.jpg, .png)
                                </h5>
                                <div className="mb-5 p-4 border rounded bg-light shadow-sm text-center">
                                    <p className="small text-secondary mb-3">
                                        Importez plusieurs images. Le nom de chaque image doit correspondre à la référence du produit.
                                    </p>
                                    <input 
                                        id="imageInput"
                                        type="file" 
                                        className="form-control" 
                                        accept=".png,.jpg,.jpeg" 
                                        multiple
                                        onChange={handleImageChange}
                                    />
                                    {imageFiles.length > 0 && (
                                        <div className="mt-2 fw-bold small text-primary">
                                            {imageFiles.length} image(s) sélectionnée(s)
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
