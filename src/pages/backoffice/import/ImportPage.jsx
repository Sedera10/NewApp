
import React, { useState } from 'react';
import { MdCloudUpload, MdFileUpload, MdFolderZip } from 'react-icons/md';
import '../login/Login.css';

export default function ImportPage() {
    const [csvFiles, setCsvFiles] = useState([]);
    const [zipFile, setZipFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleCsvChange = (e) => {
        setCsvFiles(Array.from(e.target.files));
    };

    const handleZipChange = (e) => {
        setZipFile(e.target.files[0] || null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (csvFiles.length === 0 && !zipFile) {
            alert("Veuillez sélectionner au moins un fichier à importer.");
            return;
        }

        setIsLoading(true);
        // Simulation d'un upload avec FormData plus tard : 
        // const formData = new FormData();
        // csvFiles.forEach(f => formData.append('csvFiles', f));
        // if(zipFile) formData.append('zipFile', zipFile);
        
        setTimeout(() => {
            setIsLoading(false);
            alert("Fichiers importés avec succès ! (Simulation terminèe)");
            setCsvFiles([]);
            setZipFile(null);
            // Réinitialiser les inputs :
            document.querySelector('#csvInput').value = '';
            document.querySelector('#zipInput').value = '';
        }, 2000);
    };

    return (
        <div className="login-page" style={{ paddingTop: '50px', minHeight: '100vh' }}>
            <div className="container" style={{ paddingBottom: '80px' }}>
                <div className="row justify-content-center">
                    <div className="col-12 col-md-10 col-lg-8">
                        <div style={{ maxWidth: '100%' }}>
                            
                            {/* En-tête de la carte */}
                            <div className="mat-card-header-floating text-center" style={{ background: 'var(--primary-gradient)' }}>
                                <h4 className="text-white mb-2">Import de Données</h4>
                                <div className="social-icons d-flex justify-content-center mb-2">
                                    <MdCloudUpload size={40} className="text-white" />
                                </div>
                                <p className="text-white-50 small mt-2">
                                    Importez vos fichiers CSV pour les données et ZIP pour les images.
                                </p>
                            </div>

                            <div className="card-body p-4 mt-2">
                                <form onSubmit={handleSubmit}>
                                    
                                    {/* Section CSV */}
                                    <h5 className="mb-3 text-secondary d-flex align-items-center">
                                        <MdFileUpload className="me-2" size={24} /> Fichiers de données (.csv)
                                    </h5>
                                    <div className="mb-4 p-4 border rounded bg-light shadow-sm">
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

                                    {/* Section ZIP */}
                                    <h5 className="mb-3 text-secondary d-flex align-items-center">
                                        <MdFolderZip className="me-2" size={24} /> Archive d'images (.zip)
                                    </h5>
                                    <div className="mb-5 p-4 border rounded bg-light shadow-sm">
                                        <p className="small text-secondary mb-3">
                                            Importez un fichier ZIP contenant l'ensemble des images associées à votre catalogue.
                                        </p>
                                        <input 
                                            id="zipInput"
                                            type="file" 
                                            className="form-control" 
                                            accept=".zip" 
                                            onChange={handleZipChange}
                                        />
                                        {zipFile && (
                                            <div className="mt-2 fw-bold small text-primary">
                                                Fichier sélectionné : {zipFile.name}
                                            </div>
                                        )}
                                    </div>

                                    {/* Bouton de Soumission */}
                                    <button 
                                        type="submit" 
                                        className="btn w-100 text-white fw-bold py-3 mt-2 shadow-primary" 
                                        style={{ background: 'var(--primary-gradient)', borderRadius: '8px' }}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <><span className="spinner-border spinner-border-sm me-2"></span> IMPORTATION EN COURS...</>
                                        ) : (
                                            "TRAITER ET IMPORTER LES DONNÉES"
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}