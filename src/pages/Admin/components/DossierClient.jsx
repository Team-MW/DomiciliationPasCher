import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { adminDataService } from '../../../services/adminDataService';
import { uploadFile } from '../../../utils/cloudinary';

export default function DossierClient({ client, onBack, onUpdate }) {
    const [documents, setDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentFolder, setCurrentFolder] = useState(null);

    // Dériver les dossiers depuis la liste des documents
    const folders = Array.from(new Set(documents.map(d => d.folder || 'Documents')));

    const [activeDossierTab, setActiveDossierTab] = useState('docs');
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [payments, setPayments] = useState([]);

    useEffect(() => {
        if (client) {
            const fetchData = async () => {
                setIsLoading(true);
                const [docs, pay] = await Promise.all([
                    adminDataService.getDocuments(client.id),
                    adminDataService.getPayments(client.id)
                ]);
                setDocuments(docs);
                setPayments(pay);
                setIsLoading(false);
            };
            fetchData();
        }
    }, [client]);

    useEffect(() => {
        const body = document.querySelector('.admin-body');
        if (body) body.scrollTop = 0;
    }, [activeDossierTab, currentFolder]);

    useEffect(() => {
        if (client && activeDossierTab === 'messages') {
            const fetchMessages = async () => {
                const msgs = await adminDataService.getMessages(client.id);
                setMessages(msgs);
                // Marquer comme lu
                await adminDataService.markMessagesAsRead(client.id, 'admin');
            };
            fetchMessages();
        }
    }, [client, activeDossierTab]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            const msg = await adminDataService.addMessage(client.id, {
                content: newMessage,
                sender: 'admin'
            });
            setMessages(prev => [...prev, msg]);
            setNewMessage('');
        } catch (err) {
            alert("Erreur lors de l'envoi du message");
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        await performUpload(file);
    };

    const performUpload = async (file) => {
        setIsLoading(true);
        try {
            const info = await uploadFile(file, {
                folder: `clients/${client.id}/${currentFolder || 'Documents'}`
            });

            await adminDataService.addDocument(client.id, {
                name: file.name || info.original_filename || 'Sans nom',
                size: (file.size / 1024).toFixed(0) + ' KB',
                type: file.type || (info.resource_type + '/' + info.format),
                owner: 'admin',
                folder: currentFolder || 'Documents',
                url: info.secure_url
            });
            const docs = await adminDataService.getDocuments(client.id);
            setDocuments(docs);
        } catch (err) {
            console.error("Error during upload:", err);
            alert("Erreur lors de l'envoi : " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const onDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const onDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            performUpload(files[0]);
        }
    };

    const handleAddInvoice = async () => {
        const amount = prompt("Montant de la facture (ex: 23.00) ?", client.plan === 'Scan+' ? '28.00' : '23.00');
        if (!amount) return;
        
        const date = prompt("Date de la facture (AAAA-MM-JJ) ?", new Date().toISOString().split('T')[0]);
        if (!date) return;

        try {
            setIsLoading(true);
            await adminDataService.addPayment(client.id, {
                amount: parseFloat(amount),
                date
            });
            const pay = await adminDataService.getPayments(client.id);
            setPayments(pay);
        } catch (err) {
            alert("Erreur lors de l'ajout de la facture");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateMockHistory = async () => {
        if (!window.confirm("Générer l'historique complet des paiements pour ce client depuis son inscription ?")) return;
        
        try {
            setIsLoading(true);
            const startDate = new Date(client.since);
            const currentDate = new Date();
            let iter = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            
            while (iter <= currentDate) {
                const dateStr = iter.toISOString().split('T')[0];
                await adminDataService.addPayment(client.id, {
                    amount: client.plan === 'Scan+' ? 28 : 23,
                    date: dateStr,
                    status: 'payé'
                });
                iter.setMonth(iter.getMonth() + 1);
            }
            
            const pay = await adminDataService.getPayments(client.id);
            setPayments(pay);
            alert("Historique généré avec succès !");
        } catch (err) {
            alert("Erreur lors de la génération de l'historique");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSyncStripe = async () => {
        if (!window.confirm(`Vérifier les paiements réels sur Stripe pour ${client.email} ?`)) return;

        try {
            setIsLoading(true);
            const stripePayments = await adminDataService.syncStripePayments(client.email);
            
            if (stripePayments.length === 0) {
                alert("Aucun paiement trouvé sur Stripe pour ce client.");
                return;
            }

            // Sync : on ajoute ceux qui ne sont pas là
            let addedCount = 0;
            const currentPayments = await adminDataService.getPayments(client.id);
            for (const sp of stripePayments) {
                const alreadyExists = currentPayments.some(p => p.amount == sp.amount && p.date == sp.date);
                if (!alreadyExists) {
                    await adminDataService.addPayment(client.id, {
                        ...sp,
                        invoice_ref: `STRIPE-${sp.id.substring(3, 10)}`
                    });
                    addedCount++;
                }
            }

            if (addedCount > 0) {
                alert(`${addedCount} nouveau(x) paiement(s) récupéré(s) de Stripe !`);
                const pay = await adminDataService.getPayments(client.id);
                setPayments(pay);
            } else {
                alert("Historique déjà à jour avec Stripe.");
            }
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la synchronisation Stripe.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le compte de ${client.company} ?\n\nCela révoquera instantanément son accès à l'Espace Client.`)) {
            setIsLoading(true);
            try {
                await adminDataService.deleteClient(client.id);
                onUpdate(); // Refresh the list
                onBack(); // Go back to the client list
            } catch (err) {
                console.error("Error deleting client:", err);
                alert("Erreur lors de la suppression du client.");
            } finally {
                setIsLoading(false);
            }
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

            <div className="dossier-tabs" style={{ display: 'flex', gap: '2px', marginBottom: '20px', borderBottom: '1px solid #E2E8F0', paddingBottom: '0' }}>
                <button
                    className={`d-tab ${activeDossierTab === 'docs' ? 'active' : ''}`}
                    onClick={() => setActiveDossierTab('docs')}
                    style={{ padding: '12px 24px', borderBottom: activeDossierTab === 'docs' ? '2px solid var(--primary)' : 'none', fontWeight: 600, color: activeDossierTab === 'docs' ? 'var(--primary)' : '#64748B' }}
                >
                    Documents
                </button>
                <button
                    className={`d-tab ${activeDossierTab === 'messages' ? 'active' : ''}`}
                    onClick={() => setActiveDossierTab('messages')}
                    style={{ padding: '12px 24px', borderBottom: activeDossierTab === 'messages' ? '2px solid var(--primary)' : 'none', fontWeight: 600, color: activeDossierTab === 'messages' ? 'var(--primary)' : '#64748B' }}
                >
                    Messagerie
                </button>
                <button
                    className={`d-tab ${activeDossierTab === 'facturation' ? 'active' : ''}`}
                    onClick={() => setActiveDossierTab('facturation')}
                    style={{ padding: '12px 24px', borderBottom: activeDossierTab === 'facturation' ? '2px solid var(--primary)' : 'none', fontWeight: 600, color: activeDossierTab === 'facturation' ? 'var(--primary)' : '#64748B' }}
                >
                    Facturation
                </button>
            </div>

            <div className="dossier-grid">
                <div className="content-card">
                    {activeDossierTab === 'docs' && (
                        <>
                            <div className="card-header">
                                <div className="ec-breadcrumb">
                                    <button className={`ec-crumb ${!currentFolder ? 'active' : ''}`} onClick={() => setCurrentFolder(null)}>Documents</button>
                                    {currentFolder && (
                                        <>
                                            <span className="ec-divider">/</span>
                                            <button className="ec-crumb active">{currentFolder}</button>
                                        </>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="file"
                                        id="admin-file-upload"
                                        style={{ display: 'none' }}
                                        onChange={handleFileChange}
                                        disabled={isLoading}
                                    />
                                    <button className="btn-primary-sm" onClick={() => document.getElementById('admin-file-upload').click()} disabled={isLoading}>
                                        {isLoading ? 'Envoi...' : 'Uploader'}
                                    </button>
                                </div>
                            </div>
                            <div
                                className="card-body"
                                onDragOver={onDragOver}
                                onDrop={onDrop}
                                style={{ minHeight: '400px' }}
                            >
                                {isLoading && documents.length === 0 ? (
                                    <div className="empty-state-full"><p>Chargement...</p></div>
                                ) : (
                                    <div className="ec-explorer-grid" style={{ padding: '0px', border: 'none', background: 'transparent' }}>
                                        {!currentFolder && (
                                            <>
                                                {folders.map(folder => (
                                                    <div key={folder} className="ec-explorer-item folder" onClick={() => setCurrentFolder(folder)}>
                                                        <div className="ec-explorer-icon"><Icons.File style={{ color: '#6366F1' }} /></div>
                                                        <div className="ec-explorer-name">{folder}</div>
                                                        <div className="ec-explorer-count">
                                                            {documents.filter(d => d.folder === folder).length} fichiers
                                                        </div>
                                                    </div>
                                                ))}
                                                <div className="ec-explorer-item folder new" onClick={() => {
                                                    const name = prompt('Nom du nouveau dossier ?');
                                                    if (name) setCurrentFolder(name);
                                                }}>
                                                    <div className="ec-explorer-icon add">+</div>
                                                    <div className="ec-explorer-name">Nouveau dossier</div>
                                                </div>
                                            </>
                                        )}

                                        {currentFolder && (
                                            <>
                                                <div className="ec-explorer-item back" onClick={() => setCurrentFolder(null)}>
                                                    <div className="ec-explorer-icon">←</div>
                                                    <div className="ec-explorer-name">Retour</div>
                                                </div>
                                                {documents.filter(d => d.folder === currentFolder).map(doc => (
                                                    <div key={doc.id} className="ec-explorer-item file" onClick={() => doc.url && window.open(doc.url, '_blank')}>
                                                        <div className="ec-explorer-icon"><Icons.File /></div>
                                                        <div className="ec-explorer-name">{doc.name}</div>
                                                        <div className="ec-explorer-meta">
                                                            {doc.size} · {doc.owner === 'admin' ? 'Vous' : 'Client'}
                                                        </div>
                                                        <button className="ec-explorer-dl" onClick={(e) => { e.stopPropagation(); window.open(doc.url, '_blank'); }}>↓</button>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                    {activeDossierTab === 'messages' && (
                        <>
                            <div className="card-header">
                                <h2>Chat avec {client.name}</h2>
                            </div>
                            <div className="card-body" style={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
                                <div className="messages-list" style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {messages.length === 0 ? (
                                        <div style={{ textAlign: 'center', color: '#64748B', marginTop: '40px' }}>Aucun message. Envoyez le premier message.</div>
                                    ) : (
                                        messages.map(m => (
                                            <div key={m.id} style={{ alignSelf: m.sender === 'admin' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                                                <div style={{
                                                    background: m.sender === 'admin' ? 'var(--primary)' : '#F1F5F9',
                                                    color: m.sender === 'admin' ? 'white' : '#1E293B',
                                                    padding: '10px 16px',
                                                    borderRadius: '16px',
                                                    fontSize: '14px',
                                                    borderBottomRightRadius: m.sender === 'admin' ? '2px' : '16px',
                                                    borderBottomLeftRadius: m.sender === 'admin' ? '16px' : '2px'
                                                }}>
                                                    {m.content}
                                                </div>
                                                <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '4px', textAlign: m.sender === 'admin' ? 'right' : 'left' }}>
                                                    {new Date(m.createdAt).toLocaleString()}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <form onSubmit={handleSendMessage} style={{ padding: '16px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: '12px' }}>
                                    <input
                                        type="text"
                                        placeholder="Écrivez votre message..."
                                        className="admin-input"
                                        style={{ height: '44px', borderRadius: '12px' }}
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                    />
                                    <button type="submit" className="btn-primary" style={{ padding: '0 24px' }}>Envoyer</button>
                                </form>
                            </div>
                        </>
                    )}
                    
                    {activeDossierTab === 'facturation' && (
                        <>
                            <div className="card-header">
                                <h2>Historique de facturation ({client.name})</h2>
                            </div>
                            <div className="card-body" style={{ minHeight: '500px', padding: '24px', background: '#FAFBFF' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                    <div>
                                        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', marginBottom: '8px' }}>Paiements Abonnements</h3>
                                        <p style={{ color: '#64748B', fontSize: '14px' }}>Historique des derniers prélèvements.</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="btn-secondary-sm" onClick={handleSyncStripe} style={{ border: '1px solid #6366F1', color: '#6366F1' }}>
                                            🔄 Sync Stripe
                                        </button>
                                        <button className="btn-primary-sm" style={{ background: '#10b981' }} onClick={handleAddInvoice}>+ Ajouter une facture</button>
                                    </div>
                                </div>
                                
                                <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden' }}>
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Facture ID</th>
                                                <th>Date</th>
                                                <th>Montant</th>
                                                <th>Méthode</th>
                                                <th>Statut</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {payments.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                                                        Aucune facture enregistrée pour ce client.
                                                        <br /><br />
                                                        <button className="btn-secondary-sm" onClick={handleGenerateMockHistory}>
                                                            Générer l'historique auto
                                                        </button>
                                                    </td>
                                                </tr>
                                            ) : (
                                                payments.map(p => (
                                                    <tr key={p.id} className="row-hover">
                                                        <td className="table-primary">{p.invoice_ref}</td>
                                                        <td>{new Date(p.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                        <td style={{ fontWeight: 800 }}>{p.amount} €</td>
                                                        <td className="table-secondary">{p.method}</td>
                                                        <td>
                                                            <span style={{ 
                                                                background: p.status === 'payé' ? 'rgba(16, 185, 129, 0.1)' : '#FFF1F2', 
                                                                color: p.status === 'payé' ? '#10b981' : '#9F1239', 
                                                                padding: '4px 8px', 
                                                                borderRadius: '6px', 
                                                                fontSize: '12px', 
                                                                fontWeight: '700' 
                                                            }}>
                                                                {p.status === 'payé' ? '✓ Payé' : '✘ Échec'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                                <button className="btn-text">Télécharger</button>
                                                                <button 
                                                                    onClick={async () => {
                                                                        if (window.confirm("Supprimer cette facture ?")) {
                                                                            await adminDataService.deletePayment(p.id);
                                                                            setPayments(prev => prev.filter(x => x.id !== p.id));
                                                                        }
                                                                    }}
                                                                    className="btn-text" 
                                                                    style={{ color: '#EF4444' }}
                                                                >
                                                                    Supprimer
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="dossier-sidebar">
                    <div className="content-card">
                        <div className="card-header"><h2>Informations</h2></div>
                        <div className="card-body info-list">
                            <div className="info-group"><label>Clerk User ID</label><code style={{ fontSize: '10px' }}>{client.clerkId || "En attente d'inscription"}</code></div>
                            <div className="info-group"><label>Gérant</label><span>{client.name}</span></div>
                            <div className="info-group"><label>Email</label><span>{client.email}</span></div>
                            <div className="info-group"><label>Formule</label><span>{client.plan}</span></div>
                            <div className="info-group"><label>Date d'entrée</label><span>{client.since}</span></div>
                            <div className="info-actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <button 
                                    className="btn-danger-outline" 
                                    onClick={async () => {
                                        if (window.confirm("Alerte: Déclarer ce client en défaut de paiement ? Son statut passera à 'impayé'.")) {
                                            try {
                                                await adminDataService.updateClientStatus(client.id, 'impayé');
                                                onUpdate();
                                                onBack();
                                            } catch (e) {
                                                alert("Erreur de mise à jour");
                                            }
                                        }
                                    }} 
                                    disabled={isLoading}
                                    style={{ background: '#fff1f2', color: '#9f1239', borderColor: '#fda4af', borderStyle: 'solid', borderWidth: '1px' }}
                                >
                                    Le client a un impayé
                                </button>
                                <button className="btn-danger-outline" onClick={handleDelete} disabled={isLoading}>
                                    {isLoading ? 'Suppression...' : 'Supprimer le profil'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
