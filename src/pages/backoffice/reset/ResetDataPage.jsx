import React, { useState } from 'react';
import { MdCheckCircle, MdWarning } from 'react-icons/md';
import ConfirmDialog from '../../../components/UI/others/ConfirmDialog';
import { resetTable } from '../../../service/resetService';

export default function ResetDataPage() {
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [isLoading, setLoading] = useState(false);
    
    // Etat pour le suivi de chaque table
    const [tables, setTables] = useState([
        { name: 'categories', status: 'idle' },
        { name: 'products', status: 'idle' },
        { name: 'users', status: 'idle' }
    ]);

    const handleConfirm = async () => {
        setLoading(true);
        setConfirmOpen(false);

        let currentTables = [...tables];
        // Réinitialiser les statuts avant de démarrer
        currentTables = currentTables.map(t => ({ ...t, status: 'idle' }));
        
        for (let i = 0; i < currentTables.length; i++) {
            currentTables[i].status = 'loading';
            setTables([...currentTables]);

            try {
                // Utilisation de la méthode spécifique item-par-item de notre service
                await resetTable(currentTables[i].name);
                currentTables[i].status = 'done';
            } catch (err) {
                console.error(err);
                currentTables[i].status = 'error';
            }

            setTables([...currentTables]);
        }
        setLoading(false);
    };

    return (
        <div className="container-fluid py-4">
            <h1 className="text-start mb-5 text-dark fw-bold" style={{ textAlign: "right" }}>Réinitialisation (Test)</h1>
            
            <div className="row justify-content-center">
                <div className="col-12 col-md-8 col-lg-6">
                    <div className="card shadow-sm border-0 bg-white" style={{ borderRadius: '12px' }}>
                        <div className="card-body p-5 text-center">
                            
                            <div className="mb-4">
                                <MdWarning size={60} className="text-danger mb-3" />
                                <h4 className="fw-bold">Purge de la base de données</h4>
                                <p className="text-muted">
                                    Attention, cette action est irréversible. Cette interface permet de purger complètement les données via un backend de test Node.js / MySQL. 
                                </p>
                            </div>

                            <button 
                                className="btn btn-danger btn-lg w-100 fw-bold shadow-sm mb-4" 
                                style={{ borderRadius: '8px' }}
                                onClick={() => setConfirmOpen(true)}
                                disabled={isLoading}
                            >
                                RESET DATA
                            </button>

                            {/* Détails du chargement ligne par ligne */}
                            {tables.some(t => t.status !== 'idle') && (
                                <div className="bg-light p-3 rounded text-start">
                                    <h6 className="mb-3 text-secondary text-center">Progression :</h6>
                                    <ul className="list-group list-group-flush bg-transparent">
                                        {tables.map(table => (
                                            <li key={table.name} className="list-group-item bg-transparent d-flex justify-content-between align-items-center border-0 px-0 py-2">
                                                <span style={{ 
                                                    textDecoration: table.status === 'done' ? 'line-through' : 'none',
                                                    color: table.status === 'done' ? '#6c757d' : 'inherit'
                                                }}>
                                                    reset data from "{table.name}"
                                                </span>
                                                
                                                {table.status === 'loading' && <span className="spinner-border spinner-border-sm text-primary"></span>}
                                                {table.status === 'done' && <MdCheckCircle className="text-success" size={20} />}
                                                {table.status === 'error' && <span className="text-danger fw-bold small">Erreur</span>}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
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
