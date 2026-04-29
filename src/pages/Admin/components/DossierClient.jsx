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

    const [activeDossierTab, setActiveDossierTab] = useState('details');
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
                folder: `clients/${client.id}/Documents`
            });

            await adminDataService.addDocument(client.id, {
                name: file.name || info.original_filename || 'Sans nom',
                size: (file.size / 1024).toFixed(0) + ' KB',
                type: file.type || (info.resource_type + '/' + info.format),
                owner: 'admin',
                folder: 'Documents',
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
        let defaultAmount = '20.00';
        if (client.plan === 'Scan+') defaultAmount = '24.00';
        else if (client.plan === 'Physique+') defaultAmount = '38.00';
        
        const amount = prompt(`Montant de la facture (ex: ${defaultAmount}) ?`, defaultAmount);
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
                let amount = 20;
                if (client.plan === 'Scan+') amount = 24;
                else if (client.plan === 'Physique+') amount = 38;

                await adminDataService.addPayment(client.id, {
                    amount,
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

    let extra = null;
    try {
        if (client.extra_info) {
            extra = typeof client.extra_info === 'string' ? JSON.parse(client.extra_info) : client.extra_info;
        }
    } catch (e) {
        console.error("Error parsing extra_info", e);
    }

    const renderTabContent = () => {
        switch (activeDossierTab) {
            case 'docs':
                return (
                    <>
                        <div className="card-header">
                            <h2>Documents</h2>
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
                            style={{ minHeight: '250px' }}
                        >
                            {isLoading && documents.length === 0 ? (
                                <div className="empty-state-full"><p>Chargement...</p></div>
                            ) : (
                                <div className="ec-explorer-grid" style={{ padding: '0px', border: 'none', background: 'transparent' }}>
                                    {documents.length === 0 ? (
                                        <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#64748B' }}>
                                            <Icons.File style={{ width: '48px', height: '48px', opacity: '0.4', marginBottom: '12px' }} />
                                            <p>Aucun document pour ce client. Glissez-déposez ou cliquez sur Uploader.</p>
                                        </div>
                                    ) : (
                                        documents.map(doc => (
                                            <div key={doc.id} className="ec-explorer-item file" onClick={() => doc.url && window.open(doc.url, '_blank')} style={{ border: '1px solid #E2E8F0', padding: '16px', borderRadius: '12px', background: 'white' }}>
                                                <div className="ec-explorer-icon"><Icons.File style={{ width: '24px', height: '24px', color: '#6366F1' }} /></div>
                                                <div className="ec-explorer-name" style={{ fontWeight: '600', fontSize: '14px', color: '#1E293B' }}>{doc.name}</div>
                                                <div className="ec-explorer-meta" style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                                                    {doc.size} · {doc.owner === 'admin' ? 'Déposé par vous' : 'Client'}
                                                </div>
                                                <button 
                                                    className="ec-explorer-dl" 
                                                    onClick={(e) => { e.stopPropagation(); window.open(doc.url, '_blank'); }}
                                                    style={{ marginTop: '12px', width: '100%', padding: '8px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#F8FAFC', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}
                                                >
                                                    Ouvrir / Télécharger
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                );
            case 'messages':
                return (
                    <>
                        <div className="card-header" style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '16px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>Chat avec {client.name}</h2>
                        </div>
                        <div className="card-body" style={{ height: '400px', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
                            <div className="messages-list" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {messages.length === 0 ? (
                                    <div style={{ textAlign: 'center', color: '#64748B', marginTop: '40px', fontSize: '14px' }}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 40, height: 40, opacity: 0.3, marginBottom: '12px' }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                        <p>Aucun message. Envoyez le premier message au client.</p>
                                    </div>
                                ) : (
                                    messages.map(m => (
                                        <div key={m.id} style={{ alignSelf: m.sender === 'admin' ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                                            <div style={{
                                                background: m.sender === 'admin' ? '#0F172A' : '#F1F5F9',
                                                color: m.sender === 'admin' ? '#FFFFFF' : '#0F172A',
                                                padding: '12px 16px',
                                                borderRadius: '12px',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                lineHeight: '1.5',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                borderBottomRightRadius: m.sender === 'admin' ? '2px' : '12px',
                                                borderBottomLeftRadius: m.sender === 'admin' ? '12px' : '2px'
                                            }}>
                                                {m.content}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px', textAlign: m.sender === 'admin' ? 'right' : 'left', padding: '0 4px' }}>
                                                {new Date(m.createdAt).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <form onSubmit={handleSendMessage} style={{ padding: '16px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: '12px', background: '#F8FAFC', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                                <input
                                    type="text"
                                    placeholder="Écrivez votre message..."
                                    style={{ 
                                        flex: 1,
                                        height: '44px', 
                                        borderRadius: '8px', 
                                        border: '1px solid #E2E8F0', 
                                        padding: '0 16px', 
                                        fontSize: '14px', 
                                        background: '#FFFFFF',
                                        color: '#0F172A',
                                        outline: 'none',
                                        transition: 'border-color 0.2s'
                                    }}
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                />
                                <button 
                                    type="submit" 
                                    style={{ 
                                        background: '#0F172A', 
                                        color: '#FFFFFF', 
                                        border: 'none', 
                                        borderRadius: '8px', 
                                        padding: '0 16px', 
                                        fontWeight: '600', 
                                        fontSize: '14px', 
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    Envoyer
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                </button>
                            </form>
                        </div>
                    </>
                );
            case 'facturation':
                return (
                    <>
                        <div className="card-header" style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '16px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>Historique de facturation ({client.name})</h2>
                        </div>
                        <div className="card-body" style={{ minHeight: '250px', padding: '24px', background: '#FFFFFF' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1E293B', marginBottom: '4px' }}>Paiements Abonnements</h3>
                                    <p style={{ color: '#64748B', fontSize: '13px' }}>Historique des derniers prélèvements effectués pour ce compte.</p>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button 
                                        className="btn-secondary-sm" 
                                        onClick={handleSyncStripe} 
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '6px', 
                                            border: '1px solid #E2E8F0', 
                                            background: '#FFFFFF', 
                                            color: '#334155', 
                                            fontWeight: '600',
                                            padding: '8px 14px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                            fontSize: '13px'
                                        }}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
                                        Sync Stripe
                                    </button>
                                    <button 
                                        className="btn-primary-sm" 
                                        onClick={handleAddInvoice}
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '6px', 
                                            background: '#0F172A', 
                                            color: '#FFFFFF', 
                                            border: 'none',
                                            fontWeight: '600',
                                            padding: '8px 14px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                            fontSize: '13px'
                                        }}
                                    >
                                        + Ajouter une facture
                                    </button>
                                </div>
                            </div>
                            
                            <div style={{ border: '1px solid #F1F5F9', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                                            <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Facture ID</th>
                                            <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Date</th>
                                            <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Montant</th>
                                            <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Méthode</th>
                                            <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Statut</th>
                                            <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B', background: '#FFFFFF' }}>
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 40, height: 40, opacity: 0.3, marginBottom: '12px' }}><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                                                    <p style={{ fontSize: '14px', marginBottom: '16px' }}>Aucune facture enregistrée pour ce client.</p>
                                                    <button 
                                                        className="btn-secondary-sm" 
                                                        onClick={handleGenerateMockHistory}
                                                        style={{ 
                                                            border: '1px solid #E2E8F0', 
                                                            background: '#FFFFFF', 
                                                            color: '#475569', 
                                                            fontWeight: '600',
                                                            padding: '8px 16px',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                            fontSize: '13px'
                                                        }}
                                                    >
                                                        Générer l'historique auto
                                                    </button>
                                                </td>
                                            </tr>
                                        ) : (
                                            payments.map(p => (
                                                <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }}>
                                                    <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500', color: '#0F172A' }}>{p.invoice_ref}</td>
                                                    <td style={{ padding: '16px', fontSize: '14px', color: '#475569' }}>{new Date(p.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                    <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: '#0F172A' }}>{p.amount} €</td>
                                                    <td style={{ padding: '16px', fontSize: '14px', color: '#475569' }}>{p.method}</td>
                                                    <td style={{ padding: '16px' }}>
                                                        <span style={{ 
                                                            background: p.status === 'payé' ? '#DCFCE7' : '#FFE4E6', 
                                                            color: p.status === 'payé' ? '#15803D' : '#9F1239', 
                                                            padding: '4px 10px', 
                                                            borderRadius: '9999px', 
                                                            fontSize: '12px', 
                                                            fontWeight: '600' 
                                                        }}>
                                                            {p.status === 'payé' ? 'Payé' : 'Échec'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '16px' }}>
                                                        <div style={{ display: 'flex', gap: '12px' }}>
                                                            <button 
                                                                className="btn-text"
                                                                onClick={() => p.url && window.open(p.url, '_blank')}
                                                                style={{ background: 'none', border: 'none', color: '#4F46E5', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
                                                            >
                                                                Ouvrir
                                                            </button>
                                                            <button 
                                                                onClick={async () => {
                                                                    if (window.confirm("Supprimer cette facture ?")) {
                                                                        await adminDataService.deletePayment(p.id);
                                                                        setPayments(prev => prev.filter(x => x.id !== p.id));
                                                                    }
                                                                }}
                                                                className="btn-text" 
                                                                style={{ background: 'none', border: 'none', color: '#EF4444', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
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
                );
            case 'details':
            default:
                return (
                    <>
                        <div className="card-header" style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '16px', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>Fiche Client Détaillée</h2>
                        </div>
                        <div className="card-body" style={{ padding: '0 24px 24px 24px' }}>
                            {extra ? (
                                <>
                                    {/* Section Dirigeant */}
                                    <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>👤 Coordonnées du Dirigeant</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>Nom Complet</div>
                                            <div style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>{extra.nom} {extra.prenom}</div>
                                        </div>
                                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>Email</div>
                                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A', wordBreak: 'break-all' }}>{extra.email || 'N/A'}</div>
                                        </div>
                                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>Téléphone</div>
                                            <div style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>{extra.telephone || 'N/A'}</div>
                                        </div>
                                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>Naissance</div>
                                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{extra.dateNaissance} ({extra.lieuNaissance})</div>
                                        </div>
                                    </div>

                                    {/* Section Entreprise */}
                                    <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>🏢 Informations Entreprise</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>Nom Société</div>
                                            <div style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>{extra.nomSociete || 'En cours de création'}</div>
                                        </div>
                                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>SIREN</div>
                                            <div style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>{extra.siren || 'N/A'}</div>
                                        </div>
                                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>Forme Juridique</div>
                                            <div style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>{extra.formeJuridique || 'N/A'}</div>
                                        </div>
                                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>Type Projet</div>
                                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>
                                                {extra.typeProjet === 'creation' ? "Création" : extra.typeProjet === 'transfert' ? "Transfert" : "Domiciliation"}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section Domiciliation */}
                                    <h3 style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>⚙️ Domiciliation & Forfait</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>Adresse choisie</div>
                                            <div style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A' }}>{extra.ville || 'Toulouse'}</div>
                                        </div>
                                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>Offre Courrier</div>
                                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#2563EB' }}>
                                                {extra.offre === 'scan' ? 'Scan numérique' : (extra.offre === 'reexpedition' ? 'Physique (+38€)' : 'Notification')}
                                            </div>
                                        </div>
                                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', marginBottom: '6px', textTransform: 'uppercase' }}>Fréquence</div>
                                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{extra.frequence === 'annuel' ? 'Annuelle (2 mois off.)' : 'Mensuelle'}</div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#64748B' }}>
                                    <p>Aucune information détaillée d'inscription disponible pour ce client (créé manuellement ou données anciennes).</p>
                                </div>
                            )}
                        </div>
                    </>
                );
        }
    };

    return (
        <div className="dossier-animate">
            <div className="dossier-header">
                <button onClick={onBack} className="btn-back">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14 }}><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Retour
                </button>
                <div className="dossier-title">
                    <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.025em' }}>{client.company}</h1>
                </div>
            </div>

            <div style={{ display: 'inline-flex', padding: '4px', background: '#F1F5F9', borderRadius: '8px', marginBottom: '24px', gap: '4px' }}>
                <button 
                    onClick={() => setActiveDossierTab('details')} 
                    style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: activeDossierTab === 'details' ? 'white' : 'transparent', color: activeDossierTab === 'details' ? '#0F172A' : '#64748B', fontWeight: 600, boxShadow: activeDossierTab === 'details' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                    Détails Client
                </button>
                <button 
                    onClick={() => setActiveDossierTab('docs')} 
                    style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: activeDossierTab === 'docs' ? 'white' : 'transparent', color: activeDossierTab === 'docs' ? '#0F172A' : '#64748B', fontWeight: 600, boxShadow: activeDossierTab === 'docs' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                    Documents
                </button>
                <button 
                    onClick={() => setActiveDossierTab('messages')} 
                    style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: activeDossierTab === 'messages' ? 'white' : 'transparent', color: activeDossierTab === 'messages' ? '#0F172A' : '#64748B', fontWeight: 600, boxShadow: activeDossierTab === 'messages' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                    Messagerie
                </button>
                <button 
                    onClick={() => setActiveDossierTab('facturation')} 
                    style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: activeDossierTab === 'facturation' ? 'white' : 'transparent', color: activeDossierTab === 'facturation' ? '#0F172A' : '#64748B', fontWeight: 600, boxShadow: activeDossierTab === 'facturation' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                    Facturation
                </button>
            </div>

            <div className="dossier-grid">
                <div className="content-card">
                    {renderTabContent()}
                </div>

                <div className="dossier-sidebar">
                    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Informations</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>CLERK USER ID</span>
                                <code style={{ fontSize: '11px', background: '#F8FAFC', padding: '4px 8px', borderRadius: '6px', border: '1px solid #E2E8F0', wordBreak: 'break-all', color: '#334155' }}>{client.clerkId || "user_unknown"}</code>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>GÉRANT</span>
                                <span style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A' }}>{client.name}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>EMAIL</span>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A', wordBreak: 'break-all' }}>{client.email}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>FORMULE</span>
                                <span style={{ fontSize: '14px', fontWeight: '700', color: '#2563EB' }}>{client.plan}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>DATE D'ENTRÉE</span>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{client.since}</span>
                            </div>
                        </div>
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
                                style={{ background: '#fff1f2', color: '#9f1239', borderColor: '#fda4af', borderStyle: 'solid', borderWidth: '1px', padding: '10px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', width: '100%' }}
                            >
                                Le client a un impayé
                            </button>
                            <button 
                                className="btn-danger-outline" 
                                onClick={handleDelete} 
                                disabled={isLoading}
                                style={{ background: '#FFFFFF', color: '#DC2626', borderColor: '#FCA5A5', borderStyle: 'solid', borderWidth: '1px', padding: '10px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', width: '100%' }}
                            >
                                {isLoading ? 'Suppression...' : 'Supprimer le profil'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
