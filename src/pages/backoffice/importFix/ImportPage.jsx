import React, { useState, useEffect } from 'react';
import { MdCloudUpload } from 'react-icons/md';
import { importFile4, rollbackAllImports } from '../../../service/csvImportService';
import { importFile1 } from '../../../service/csvImport/file1/index';
import { importFile2 } from '../../../service/csvImport/file2/index';
import { importFile3 } from '../../../service/csvImport/file3';
import { extractZipFiles } from '../../../service/csvImport/image/helper';
import { LoadingProgress } from '../../../components/UI/others/LoadingProgress';

export default function ImportPage() {
    const [file1, setFile1] = useState(null);
    const [file2, setFile2] = useState(null);
    const [file3, setFile3] = useState(null);
    const [imageFiles, setImageFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [progressMsg, setProgressMsg] = useState('');
    const [progress1, setProgress1] = useState({
        step: "",
        message: "",
        description: "",
        percentage: 0
    });
    const [progress2, setProgress2] = useState({
        step: "",
        message: "",
        description: "",
        percentage: 0
    });
    const [progress3, setProgress3] = useState({
        step: "",
        message: "",
        description: "",
        percentage: 0
    });
    const [progress4, setProgress4] = useState({
        step: "",
        message: "",
        description: "",
        percentage: 0
    });
    const [result1, setResult1] = useState(null);
    const [result2, setResult2] = useState(null);
    const [result3, setResult3] = useState(null);
    const [result4, setResult4] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [activeStep, setActiveStep] = useState(null);

    const [noImage, setNoImage] = useState(false);
    const [step, setStep] = useState(4)

    const handleNoImage = () => {
        setNoImage(!noImage)
    }

    useEffect(() => {
        if (!successMessage) return;
        const id = setTimeout(() => setSuccessMessage(''), 8000);
        return () => clearTimeout(id);
    }, [successMessage]);

    useEffect(() => {
        if (!errorMessage) return;
        // scroll to top so alert becomes visible if out of view
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { /* ignore */ }
        const id = setTimeout(() => setErrorMessage(''), 10000);
        return () => clearTimeout(id);
    }, [errorMessage]);

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
            setImageFiles([files[0]]);
        } else {
            setImageFiles([]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // clear previous messages
        setErrorMessage('');
        setSuccessMessage('');

        if (!file1 && !file2 && !file3 && imageFiles.length === 0) {
            setErrorMessage("Veuillez sélectionner au moins un fichier à importer.");
            return;
        }

        const totalSteps = noImage ? 3 : 4;
        setStep(totalSteps);

        setIsLoading(true);
        setProgressMsg('Démarrage de l\'import...');
        
        try { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth'}); } catch (e) {/* ignore */}

        try {
            let file1Results = null;
            let file2Results = null;
            let file3Results = null;
            let file4Results = null;
            // Fichier 1 : Produits et Catégories
            if (file1) {
                try {
                    setActiveStep(1);
                    file1Results = await importFile1(file1, (progress) => {
                        setProgress1(progress);
                        setProgressMsg(`(1/${totalSteps}) ${progress.message}`);
                    });
                } catch (error) {
                    console.error("Erreur File1:", error);
                    setProgressMsg('Erreur lors de l\'import du Fichier 1, rollback en cours...');
                    await rollbackAllImports();
                    throw new Error(`Fichier 1 échoué: ${error.message}`);
                }
            }

            setResult1(file1Results)

            if (file2 && file1Results) {
                try {
                    setActiveStep(2);
                    file2Results = await importFile2(file2, file1Results, (progress) => {
                        setProgress2(progress);
                        setProgressMsg(`(2/${totalSteps}) ${progress.message}`);
                    });
                } catch (error) {
                    console.error("Erreur File2:", error);
                    setProgressMsg('Erreur lors de l\'import du Fichier 2, rollback en cours...');
                    await rollbackAllImports();
                    throw new Error(`Fichier 2 échoué: ${error.message}`);
                }
            }

            setResult2(file2Results)

            if (file3 && file1Results && file2Results) {
                try {
                    setActiveStep(3);
                    file3Results = await importFile3(file3, file1Results, file2Results, (progress) => {
                        setProgress3(progress);
                        setProgressMsg(`(3/${totalSteps}) ${progress.message}`);
                    });
                } catch (error) {
                    console.error("Erreur File3:", error);
                    setProgressMsg('Erreur lors de l\'import du Fichier 3, rollback en cours...');
                    await rollbackAllImports();
                    throw new Error(`Fichier 3 échoué: ${error.message}`);
                }
            }

            setResult3(file3Results)

            if (!noImage && imageFiles.length > 0 && file1Results) {
                try {
                    setActiveStep(4);
                    setProgress4({
                        step: 'zip',
                        message: 'Extraction du ZIP des images...',
                        description: 'Preparation des images...',
                        percentage: 10
                    });
                    setProgressMsg(`(4/${totalSteps}) Extraction du ZIP des images...`);

                    const extractedImages = await extractZipFiles(imageFiles[0]);

                    if (extractedImages.length === 0) {
                        throw new Error('Le fichier ZIP ne contient aucune image');
                    }

                    setProgress4({
                        step: 'images',
                        message: `Importation des ${extractedImages.length} image(s)...`,
                        description: 'Upload des images...',
                        percentage: 20
                    });
                    setProgressMsg(`(4/${totalSteps}) Importation des ${extractedImages.length} image(s)...`);
                    file4Results = await importFile4(extractedImages, file1Results, (progress) => {
                        const percentage = Math.round(progress.progress || 0);
                        setProgress4({
                            step: progress.step || 'images',
                            message: progress.message || 'Import des images...',
                            description: `Progression: ${percentage}%`,
                            percentage
                        });
                        setProgressMsg(`(4/${totalSteps}) ${progress.message}`);
                    });
                    setProgress4({
                        step: 'complete',
                        message: 'Import des images termine !',
                        description: 'Images importees.',
                        percentage: 100
                    });
                } catch (error) {
                    console.error("Erreur File4:", error);
                    setProgressMsg('Erreur lors de l\'import des images, rollback en cours...');
                    await rollbackAllImports();
                    throw new Error(`Fichier 4 (images) échoué: ${error.message}`);
                }
            }

            setResult4(file4Results)

            setSuccessMessage("Fichiers importés avec succès !");
            setFile1(null);
            setFile2(null);
            setFile3(null);
            setImageFiles([]);
            document.querySelector('#file1Input').value = '';
            document.querySelector('#file2Input').value = '';
            const file3Input = document.querySelector('#file3Input');
            if (file3Input) file3Input.value = '';
            const imageInput = document.querySelector('#imageInput');
            if (imageInput) imageInput.value = '';

        } catch (error) {
            console.error("Erreur d'import", error);
            try {
                await rollbackAllImports();
            } catch (rollbackError) {
                console.error('Erreur rollback:', rollbackError);
            }
            setErrorMessage("Une erreur s'est produite lors de l'import : " + (error?.message || String(error)));
        } finally {
            setIsLoading(false);
            setProgressMsg('');
            setActiveStep(null);
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

                            {errorMessage && (
                                <div className="alert alert-danger alert-dismissible fade show" role="alert" aria-live="polite">
                                    {errorMessage}
                                    <button type="button" className="btn-close" aria-label="Close" onClick={() => setErrorMessage('')}></button>
                                </div>
                            )}

                            {successMessage && (
                                <div className="alert alert-success alert-dismissible fade show" role="alert">
                                    {successMessage}
                                    <button type="button" className="btn-close" aria-label="Close" onClick={() => setSuccessMessage('')}></button>
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>

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
                                        <span className="badge bg-primary me-2">2</span>
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
                                <div className="mb-3 p-3 border rounded bg-light">
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

                                <div className='form-check'>
                                    <label className='form-check-label' htmlFor="noImage">No image </label>
                                    <input className='form-check-input'
                                        type="checkbox" 
                                        checked={noImage}
                                        name="noImage" 
                                        id="noImage" 
                                        onChange={handleNoImage}
                                    />
                                </div>

                                <hr className="my-4 opacity-15" />

                                { !noImage && (
                                <div className="mb-3 p-3 border rounded bg-light">
                                    <label className="form-label fw-bold text-dark mb-2 d-flex align-items-center">
                                        <span className="badge bg-secondary me-2">4</span>
                                        Images produits (.zip)
                                    </label>
                                    <input
                                        id="imageInput"
                                        type="file"
                                        className="form-control"
                                        accept=".zip"
                                        onChange={handleImageChange}
                                    />
                                    {imageFiles.length > 0 && (
                                        <div className="mt-2 small text-success">
                                            ✓ {imageFiles[0]?.name}
                                        </div>
                                    )}
                                </div>
                                )}

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
                    <div className="loading-progress-group loading-progress-group--horizontal">
                        {isLoading && activeStep === 1 && (
                            <LoadingProgress title="File 1 : Produits & Taxes" progress={progress1} />
                        )}
                        {isLoading && activeStep === 2 && (
                            <LoadingProgress title="File 2 : Variantes & Stock" progress={progress2} />
                        )}
                        {isLoading && activeStep === 3 && (
                            <LoadingProgress title="File 3 : Commandes & Clients" progress={progress3} />
                        )}
                        {isLoading && activeStep === 4 && (
                            <LoadingProgress title="File 4 : Images" progress={progress4} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
