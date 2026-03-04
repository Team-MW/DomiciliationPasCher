import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { adminDataService } from '../../../services/adminDataService';

export default function DossierClient({ client, onBack, onUpdate }) {
    const [documents, setDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (client) {
            const fetchDocs = async () => {
                setIsLoading(true);
                const docs = await adminDataService.getDocuments(client.id);
                setDocuments(docs);
                setIsLoading(false);
            };
            fetchDocs();
        }
    }, [client]);

    const handleUploadSim = async () => {
        const name = prompt('Nom du document ?');
        const folder = prompt('Dossier de destination (ex: Factures, Contrats, Juridique) ?', 'Documents');
        if (name) {
            setIsLoading(true);
            await adminDataService.addDocument(client.id, {
                name: name, size: '250KB', type: 'application/pdf', owner: 'admin', folder, url: '#'
            });
            const docs = await adminDataService.getDocuments(client.id);
            setDocuments(docs);
            setIsLoading(false);
        }
    };

    if (!client) return null;

    return (
        <div className="dossier-animate">
            <div className="dossier-header">
                <button onClick={onBack} className="btn-back">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14 }}><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Retour
                </button>
                <div className="dossier-title">
                    <h1>{client.company}</h1>
                    <span className="badge-status">Compte {client.status}</span>
                </div>
            </div>

            <div className="dossier-grid">
                <div className="content-card">
                    <div className="card-header">
                        <h2>Espace Documentaire</h2>
                        <button className="btn-primary-sm" onClick={handleUploadSim} disabled={isLoading}>
                            {isLoading ? 'Envoi...' : 'Uploader'}
                        </button>
                    </div>
                    <div className="card-body">
                        {isLoading && documents.length === 0 ? (
                            <div className="empty-state-full"><p>Chargement...</p></div>
                        ) : documents.length === 0 ? (
                            <div className="empty-state-full">
                                <Icons.File />
                                <p>Aucun document dans le dossier.</p>
                            </div>
                        ) : (
                            <div className="docs-grid">
                                {documents.map(doc => (
                                    <div key={doc.id} className="doc-card">
                                        <div className="doc-icon">
                                            {doc.type.includes('image') ? <Icons.Image /> : <Icons.File />}
                                        </div>
                                        <div className="doc-info">
                                            <span className="doc-name">{doc.name}</span>
                                            <span className="doc-meta">{doc.size}</span>
                                            <span className={`owner-tag ${doc.owner === 'admin' ? 'admin' : 'client'}`}>
                                                {doc.owner === 'admin' ? 'Par Admin' : 'Par Client'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="dossier-sidebar">
                    <div className="content-card">
                        <div className="card-header"><h2>Informations</h2></div>
                        <div className="card-body info-list">
                            <div className="info-group"><label>Clerk User ID</label><code style={{ fontSize: '10px' }}>{client.clerkId || 'N/A'}</code></div>
                            <div className="info-group"><label>Gérant</label><span>{client.name}</span></div>
                            <div className="info-group"><label>Email</label><span>{client.email}</span></div>
                            <div className="info-group"><label>Formule</label><span>{client.plan}</span></div>
                            <div className="info-group"><label>Date d'entrée</label><span>{client.since}</span></div>
                            <div className="info-actions">
                                <button className="btn-danger-outline">Suspendre l'accès</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
