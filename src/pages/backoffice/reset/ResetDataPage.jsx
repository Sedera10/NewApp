import React, { useState, useEffect } from 'react';
import { MdCheckCircle, MdWarning } from 'react-icons/md';
import ConfirmDialog from '../../../components/UI/others/ConfirmDialog';
import { resetAllData, getResourcesToWipe } from '../../../service/resetService';
import Header from '../../../components/layout/Header';
import './ResetDataPage.css';

export default function ResetDataPage() {
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [isLoading, setLoading] = useState(false);
    const [tables, setTables] = useState([]);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const resources = getResourcesToWipe();
        setTables(resources.map(res => ({ name: res, status: 'idle' })));
    }, []);

    const handleConfirm = async () => {
        setLoading(true);
        setConfirmOpen(false);
        setProgress(0);

        let currentTables = [...tables];
        currentTables = currentTables.map(t => ({ ...t, status: 'idle' }));
        setTables(currentTables);

        const total = currentTables.length;

        await resetAllData((resourceName, status, completedCount) => {
            setTables(prev => prev.map(t => 
                t.name === resourceName ? { ...t, status } : t
            ));
            
            if (status === 'done' || status === 'error') {
                const newProgress = Math.round((completedCount / total) * 100);
                setProgress(newProgress);
            }
        });

        setLoading(false);
    };

    return (
        <div className="reset-page-container">
            <h1 className="h2 mb-0">Reset data</h1>
            <div className="reset-content">
                <div className="reset-card">
                    <MdWarning size={70} className="warning-icon" />
                    <h2>Purge de la base de données</h2>
                    <p className="reset-description">
                        Attention, cette action est irréversible. Toutes les données seront supprimées définitivement de la base de données. 
                        Veuillez confirmer cette action uniquement si vous êtes sûr.
                    </p>

                    <button 
                        className="reset-btn"
                        onClick={() => setConfirmOpen(true)}
                        disabled={isLoading || tables.length === 0}
                    >
                        {isLoading ? 'RÉINITIALISATION EN COURS...' : 'RÉINITIALISER LES DONNÉES'}
                    </button>

                    {(isLoading || progress > 0) && (
                        <div className="progress-section">
                            <div className="progress-bar-container">
                                <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                                <span className="progress-text">{progress}%</span>
                            </div>

                            <ul className="tables-list">
                                {tables.map(table => (
                                    <li key={table.name} className={`table-item ${table.status}`}>
                                        <span className="table-name">{table.name}</span>
                                        <div className="status-icon">
                                            {table.status === 'loading' && <span className="spinner"></span>}
                                            {table.status === 'done' && <MdCheckCircle className="check-icon" size={24} />}
                                            {table.status === 'error' && <span className="error-text">Erreur</span>}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmDialog 
                isOpen={isConfirmOpen}
                title="Avertissement"
                message="Voulez-vous vraiment vider toutes ces tables dans la base de données de test ? Cette action est irréversible."
                type="danger"
                onConfirm={handleConfirm}
                onCancel={() => setConfirmOpen(false)}
            />
        </div>
    );
}
