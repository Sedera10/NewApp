import { useState } from 'react';
import { MdCheckCircle, MdWarning } from 'react-icons/md';
import ConfirmDialog from '../../../components/UI/others/ConfirmDialog';
import { resetAllData, getResourcesToWipe } from '../../../service/resetService';
import './ResetDataPage.css';

export default function ResetDataPage() {
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [isLoading, setLoading] = useState(false);
    const [hasRun, setHasRun] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [tables, setTables] = useState(() => {
        const resources = getResourcesToWipe();
        return resources.map(res => ({ name: res, status: 'idle', deletedCount: null }));
    });
    const [progress, setProgress] = useState(0);

    const getDisplayedResources = () => {
        const completed = tables.filter(t => t.status === 'done');
        const last5Completed = completed.slice(-5).reverse();
        
        return { last5Completed };
    };

    const handleOkClick = () => {
        window.location.reload();
    };

    const handleConfirm = async () => {
        setLoading(true);
        setConfirmOpen(false);
        setProgress(0);
        setHasRun(false);
        setHasError(false);

        let currentTables = [...tables];
        currentTables = currentTables.map(t => ({ ...t, status: 'idle', deletedCount: null }));
        setTables(currentTables);

        const total = currentTables.length;

        await resetAllData((resourceName, status, completedCount, meta = {}) => {
            setTables(prev => prev.map(t => 
                t.name === resourceName ? { ...t, status, deletedCount: meta.deletedCount ?? t.deletedCount } : t
            ));

            if (status === 'error') {
                setHasError(true);
            }
            
            if (status === 'done' || status === 'error') {
                const newProgress = Math.round((completedCount / total) * 100);
                setProgress(newProgress);
            }
        });

        setLoading(false);
        setHasRun(true);
    };

    const { last5Completed } = getDisplayedResources();
    const totalTables = tables.length;
    const doneTablesCount = tables.filter(t => t.status === 'done').length;
    const errorTablesCount = tables.filter(t => t.status === 'error').length;

    return (
        <div className="reset-page-container">
            <div className="reset-content">
                <div className={`reset-card ${(isLoading || progress > 0) ? 'active-reset' : ''}`}>
                    {!isLoading && !hasRun ? (
                        <>
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
                                RÉINITIALISER LES DONNÉES
                            </button>
                        </>
                    ) : isLoading ? (
                        <>
                            <h2 className="reset-title-active">Suppression en cours...</h2>
                            
                            {last5Completed.length > 0 && (
                                <ul className="tables-list last-completed">
                                    {last5Completed.map(table => (
                                        <li key={table.name} className="table-item done completed">
                                            <span className="table-name">
                                                {table.name}
                                                {table.deletedCount !== null && (
                                                    <span className="table-count">{table.deletedCount} supprimé{table.deletedCount > 1 ? 's' : ''}</span>
                                                )}
                                            </span>
                                            <MdCheckCircle className="check-icon" size={20} />
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <div className="progress-section-bottom">
                                <div className="progress-bar-container">
                                    <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                                    <span className="progress-text">{progress}%</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <h2 className={hasError ? 'reset-title-error' : 'reset-title-complete'}>
                                {hasError ? 'Suppression terminée avec erreurs' : '✓ Suppression terminée'}
                            </h2>
                            <p className="reset-description reset-summary">
                                Tables vidées : <strong>{doneTablesCount}</strong> / {totalTables}
                                {errorTablesCount > 0 ? ` · Erreurs : ${errorTablesCount}` : ''}
                            </p>

                            {last5Completed.length > 0 && (
                                <ul className="tables-list last-completed">
                                    {last5Completed.map(table => (
                                        <li key={table.name} className="table-item done completed">
                                            <span className="table-name">
                                                {table.name}
                                                {table.deletedCount !== null && (
                                                    <span className="table-count">{table.deletedCount} supprimé{table.deletedCount > 1 ? 's' : ''}</span>
                                                )}
                                            </span>
                                            <MdCheckCircle className="check-icon" size={20} />
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <button 
                                className="reset-btn reset-btn-ok"
                                onClick={handleOkClick}
                            >
                                OK
                            </button>
                        </>
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
