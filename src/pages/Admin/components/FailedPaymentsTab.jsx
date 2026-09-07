import React, { useCallback, useEffect, useState } from 'react';
import { adminDataService } from '../../../services/adminDataService';
import { isPaymentGraceExpired, paymentGraceDeadline, formatDateFr } from '../../../../shared/paymentGrace.js';

const formatDateShort = (dateStr) => {
    if (!dateStr) return 'Non définie';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
    }
    return dateStr;
};

const formatAmount = (amount, currency = 'eur') => {
    if (typeof amount !== 'number' || Number.isNaN(amount)) return '—';
    return amount.toLocaleString('fr-FR', { style: 'currency', currency: currency.toUpperCase() });
};

const SUB_STATUS_LABELS = {
    past_due: 'Prélèvement en échec',
    unpaid: 'Impayé (abonnement suspendu)',
    incomplete: 'Paiement initial non finalisé',
};

const readStripeCustomerId = (client) => {
    if (!client?.extra_info) return null;
    try {
        let extra = typeof client.extra_info === 'string' ? JSON.parse(client.extra_info) : client.extra_info;
        if (typeof extra === 'string') extra = JSON.parse(extra);
        return extra?.stripe_customer_id || null;
    } catch {
        return null;
    }
};

export default function FailedPaymentsTab({ clients, onSelect, onUpdate, showConfirm, showAlert }) {
    const [stripeFailures, setStripeFailures] = useState([]);
    const [isSyncing, setIsSyncing] = useState(true);
    const [syncError, setSyncError] = useState(null);
    const [lastSync, setLastSync] = useState(null);

    const loadFailures = useCallback(async () => {
        setIsSyncing(true);
        setSyncError(null);
        try {
            const failures = await adminDataService.getStripeFailedPayments();
            setStripeFailures(failures);
            setLastSync(new Date());
        } catch (err) {
            setSyncError(err.message || 'Impossible de contacter Stripe');
        } finally {
            setIsSyncing(false);
        }
    }, []);

    useEffect(() => { loadFailures(); }, [loadFailures]);

    // Rapproche chaque échec Stripe d'une fiche client (par ID Stripe, sinon par email).
    const rows = [];
    const coveredClientIds = new Set();

    for (const failure of stripeFailures) {
        const client = clients.find(c => readStripeCustomerId(c) === failure.customerId)
            || (failure.email && clients.find(c => c.email?.trim().toLowerCase() === failure.email.trim().toLowerCase()));
        if (client) coveredClientIds.add(client.id);
        rows.push({ key: failure.customerId, client, failure });
    }

    // Fiches marquées impayées en base mais qu'aucun échec Stripe ne confirme
    // (impayés déclarés à la main, virements, anciens dossiers).
    for (const client of clients) {
        if (client.status !== 'impayé' && client.status !== 'echec_paiement') continue;
        if (coveredClientIds.has(client.id)) continue;
        rows.push({ key: `db-${client.id}`, client, failure: null });
    }

    // Propage l'échec sur la fiche client pour que l'espace client et les exports restent cohérents.
    useEffect(() => {
        const toFlag = rows.filter(r => r.failure && r.client && r.client.status === 'actif');
        if (toFlag.length === 0) return;
        let cancelled = false;
        (async () => {
            try {
                await Promise.all(toFlag.map(r => adminDataService.updateClientStatus(r.client.id, 'echec_paiement')));
                if (!cancelled) onUpdate();
            } catch (err) {
                console.error('Impossible de marquer les clients en échec de paiement:', err);
            }
        })();
        return () => { cancelled = true; };
    }, [stripeFailures, clients]);

    const handleMarkAsActive = async (row, e) => {
        e.stopPropagation();
        const stillFailing = Boolean(row.failure);
        const message = stillFailing
            ? "Stripe signale toujours un impayé pour ce client. Le repasser en \"actif\" quand même ? Il sera de nouveau signalé au prochain rafraîchissement."
            : 'Confirmer que le paiement a bien été régularisé ? Le compte repassera en "actif".';
        const confirmed = await showConfirm(message, { isDanger: stillFailing });
        if (!confirmed) return;
        try {
            await adminDataService.updateClientStatus(row.client.id, 'actif');
            onUpdate();
        } catch (err) {
            console.error("Erreur mise à jour statut", err);
            await showAlert("Erreur lors de la mise à jour");
        }
    };

    const th = { padding: '16px 20px', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' };
    const td = { padding: '16px 20px', fontSize: '13px', color: '#64748B' };

    return (
        <div className="failed-payments-container">
            <div className="tab-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 24, height: 24 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        Paiements Échoués ({rows.length})
                    </h2>
                    <p style={{ color: 'var(--admin-text-sub)', fontSize: '14px', marginTop: '4px' }}>
                        Impayés remontés directement de Stripe, sans avoir à ouvrir chaque dossier.
                        {lastSync && <span> Dernière vérification à {lastSync.toLocaleTimeString('fr-FR')}.</span>}
                    </p>
                </div>
                <button
                    onClick={loadFailures}
                    disabled={isSyncing}
                    style={{ padding: '10px 16px', background: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: isSyncing ? 'default' : 'pointer', opacity: isSyncing ? 0.6 : 1, whiteSpace: 'nowrap' }}
                >
                    {isSyncing ? 'Vérification...' : 'Rafraîchir depuis Stripe'}
                </button>
            </div>

            {syncError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', fontSize: '13px', fontWeight: '600' }}>
                    Synchronisation Stripe impossible : {syncError}. La liste ci-dessous ne montre que les impayés déjà enregistrés en base.
                </div>
            )}

            {isSyncing && rows.length === 0 ? (
                <div style={{ background: 'white', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '60px 40px', textAlign: 'center', color: 'var(--admin-text-sub)' }}>
                    Vérification des paiements auprès de Stripe...
                </div>
            ) : rows.length === 0 ? (
                <div style={{ background: 'white', border: '1px solid var(--admin-border)', borderRadius: '12px', padding: '60px 40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--admin-text-main)', marginBottom: '8px' }}>Aucun paiement échoué</h3>
                    <p style={{ color: 'var(--admin-text-sub)' }}>Tous vos clients sont à jour dans leurs paiements. Excellent travail !</p>
                </div>
            ) : (
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                                <th style={th}>Client / Entreprise</th>
                                <th style={th}>Motif</th>
                                <th style={th}>Montant dû</th>
                                <th style={th}>Tentatives</th>
                                <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(({ key, client, failure }) => (
                                <tr key={key} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                    <td style={{ padding: '16px 20px', cursor: client ? 'pointer' : 'default' }} onClick={() => client && onSelect(client.id)}>
                                        <div style={{ fontWeight: '700', fontSize: '14px', color: '#991B1B' }}>
                                            {client?.company || failure?.name || 'Client Stripe non rattaché'}
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
                                            {client ? `${client.name} (${client.email})` : (failure?.email || failure?.customerId)}
                                        </div>
                                        {!client && (
                                            <div style={{ fontSize: '12px', color: '#B45309', marginTop: '4px', fontWeight: '600' }}>
                                                Aucune fiche client ne correspond à ce client Stripe
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px 20px' }}>
                                        <span style={{ padding: '4px 10px', borderRadius: '9999px', background: '#FEF2F2', color: '#DC2626', fontSize: '12px', fontWeight: '700', display: 'inline-block' }}>
                                            {failure
                                                ? (SUB_STATUS_LABELS[failure.subscriptionStatus] || (failure.invoiceStatus === 'uncollectible' ? 'Facture irrécouvrable' : 'Facture impayée'))
                                                : (client?.status === 'impayé' ? 'Impayé déclaré manuellement' : 'Échec de paiement (base)')}
                                        </span>
                                        <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '6px' }}>
                                            {failure?.failedAt
                                                ? `Depuis le ${formatDateShort(failure.failedAt)}`
                                                : `Client depuis le ${formatDateShort(client?.since)}`}
                                        </div>
                                        {failure?.failedAt && (
                                            <div style={{ fontSize: '12px', fontWeight: '700', marginTop: '4px', color: isPaymentGraceExpired(failure.failedAt) ? '#DC2626' : '#B45309' }}>
                                                {isPaymentGraceExpired(failure.failedAt)
                                                    ? 'Délai de 2 mois dépassé — résiliation automatique'
                                                    : `Résiliation auto le ${formatDateFr(paymentGraceDeadline(failure.failedAt))} sans règlement`}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ ...td, fontWeight: '700', color: '#0F172A' }}>
                                        {failure ? formatAmount(failure.amountDue, failure.currency) : '—'}
                                    </td>
                                    <td style={td}>
                                        {failure?.attemptCount ? `${failure.attemptCount} tentative${failure.attemptCount > 1 ? 's' : ''}` : '—'}
                                        {failure?.nextAttempt && (
                                            <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
                                                Prochaine le {formatDateShort(failure.nextAttempt)}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                            {failure?.invoiceUrl && (
                                                <a href={failure.invoiceUrl} target="_blank" rel="noreferrer" style={{ padding: '8px 14px', background: '#635BFF', color: '#FFFFFF', borderRadius: '8px', fontWeight: '600', fontSize: '13px', textDecoration: 'none' }}>
                                                    Facture Stripe
                                                </a>
                                            )}
                                            {client && (
                                                <>
                                                    <button onClick={(e) => handleMarkAsActive({ client, failure }, e)} style={{ padding: '8px 14px', background: '#10B981', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                                                        Régulariser
                                                    </button>
                                                    <button onClick={() => onSelect(client.id)} style={{ padding: '8px 14px', background: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                                                        Dossier
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
