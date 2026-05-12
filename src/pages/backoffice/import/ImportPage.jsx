import React, { useState } from 'react';
import { MdCloudUpload, MdFileUpload, MdFolderZip } from 'react-icons/md';

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
            alert("Fichiers importés avec succès ! (Simulation terminée)");
            setCsvFiles([]);
            setZipFile(null);
            // Réinitialiser les inputs :
            document.querySelector('#csvInput').value = '';
            document.querySelector('#zipInput').value = '';
        }, 2000);
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

                                {/* Section ZIP */}
                                <h5 className="mb-3 text-secondary d-flex align-items-center justify-content-center">
                                    <MdFolderZip className="me-2" size={24} /> Archive d'images (.zip)
                                </h5>
                                <div className="mb-5 p-4 border rounded bg-light shadow-sm text-center">
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
                                <div className="text-center mt-2 d-flex justify-content-center">
                                    <button 
                                        type="submit" 
                                        className="btn text-white fw-bold py-3 shadow-primary" 
                                        style={{ background: 'var(--primary-gradient)', borderRadius: '8px', minWidth: '300px' }}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <><span className="spinner-border spinner-border-sm me-2"></span> IMPORTATION EN COURS...</>
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
