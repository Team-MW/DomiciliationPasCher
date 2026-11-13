import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { adminDataService } from '../../../../services/adminDataService';
import { buildDashboard, toCsv } from '../../../../../shared/adminStats.js';
import { BarChart, LineChart, SegmentedBar, HBarChart, Heatmap, StatTile, ChartCard, DataTable, downloadText, fmtValue, SERIES_COLORS } from './charts';
import './stats.css';

const PERIODS = [
    { months: 6, label: '6 mois' },
    { months: 12, label: '12 mois' },
    { months: 24, label: '24 mois' },
];

/**
 * Onglet « Statistiques » : pilotage de l'activité (clients, revenus, acquisition, courrier, emails, salles).
 * Les chiffres viennent de la base (getStatsDashboard) et de Stripe (stripe-stats). Tout se recalcule
 * côté navigateur selon la période choisie ; chaque graphique a une vue tableau et le tout s'exporte en CSV.
 */
export default function StatsTab() {
    const [raw, setRaw] = useState(null);
    const [stripe, setStripe] = useState(null);
    const [months, setMonths] = useState(12);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [updatedAt, setUpdatedAt] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [data, stripeStats] = await Promise.all([
                adminDataService.getStatsDashboard(),
                adminDataService.getStripeStats(24),
            ]);
            setRaw(data || {});
            setStripe(stripeStats || null);
            setUpdatedAt(new Date());
        } catch (err) {
            console.error('Statistiques :', err);
            setError(err?.message || 'Impossible de charger les statistiques.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const dash = useMemo(() => (raw ? buildDashboard(raw, { months, stripe }) : null), [raw, months, stripe]);

    if (error && !dash) {
        return (
            <div className="stats-page">
                <div className="viz-error" role="alert">{error} <button type="button" className="viz-toggle" onClick={load}>Réessayer</button></div>
            </div>
        );
    }
    if (!dash) return <div className="stats-page"><div className="viz-loading">Chargement des statistiques…</div></div>;

    const { kpis, buckets, monthly, splits, funnel, heatmap, csvRows } = dash;
    const labels = buckets.map((b) => b.label);
    const k = (key) => kpis[key] || {};
    const conv = (i) => (funnel[0].value > 0 ? `${Math.round((funnel[i].value / funnel[0].value) * 100)} % des inscriptions` : '');
    const monthlyColumns = [
        { key: 'mois', label: 'Mois' }, { key: 'nouveaux_clients', label: 'Nouveaux' }, { key: 'resiliations', label: 'Résiliations' },
        { key: 'clients_actifs', label: 'Actifs' }, { key: 'encaisse_stripe_ttc', label: 'Encaissé (€ TTC)' }, { key: 'courriers', label: 'Courriers' },
        { key: 'numerisations', label: 'Scans' }, { key: 'messages_clients', label: 'Messages' }, { key: 'reservations', label: 'Réservations' },
        { key: 'inscriptions_commencees', label: 'Inscriptions' }, { key: 'emails', label: 'Emails' },
    ];
    const seriesTable = (names, arrays, unit) => ({
        columns: [{ key: 'mois', label: 'Mois' }, ...names.map((n, i) => ({ key: `s${i}`, label: n, unit }))],
        rows: labels.map((m, i) => Object.fromEntries([['mois', m], ...arrays.map((a, j) => [`s${j}`, a[i]])])),
    });
    const partsTable = (parts) => ({ columns: [{ key: 'name', label: 'Catégorie' }, { key: 'value', label: 'Nombre' }], rows: parts.map((p) => ({ name: p.name, value: p.value })) });

    return (
        <div className={`stats-page${loading ? ' is-loading' : ''}`}>
            <div className="tab-header stats-header">
                <div>
                    <h2>Statistiques</h2>
                    <p>Pilotage de l’activité · {updatedAt ? `actualisé à ${updatedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : '…'}{stripe?.livemode === false ? ' · Stripe en mode test' : ''}</p>
                </div>
                <div className="stats-filters" role="group" aria-label="Période">
                    {PERIODS.map((p) => (
                        <button key={p.months} type="button" className={`viz-toggle${months === p.months ? ' on' : ''}`} aria-pressed={months === p.months} onClick={() => setMonths(p.months)}>{p.label}</button>
                    ))}
                    <button type="button" className="viz-toggle" onClick={load} disabled={loading}>{loading ? 'Actualisation…' : 'Actualiser'}</button>
                    <button type="button" className="viz-toggle primary" onClick={() => downloadText(`statistiques-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(csvRows))}>Exporter CSV</button>
                </div>
            </div>
            {error && <div className="viz-error" role="alert">{error}</div>}

            {/* ── Chiffres clés ── */}
            <section className="stats-section" aria-label="Chiffres clés">
                <div className="stats-tiles">
                    <StatTile hero label="Revenu mensuel récurrent (HT, d’après les dossiers)" value={k('mrrHt').value} unit="€" hint={k('mrrHt').hint} />
                    <StatTile label="Clients actifs" value={k('activeClients').value} hint={k('activeClients').hint} />
                    <StatTile label="Nouveaux clients (30 j)" value={k('newClients30').value} delta={k('newClients30').delta} hint={k('newClients30').hint} />
                    {kpis.revenueMonth && <StatTile label="Encaissé ce mois (Stripe, TTC)" value={k('revenueMonth').value} unit="€" delta={k('revenueMonth').delta} hint="vs mois précédent" />}
                    {kpis.stripeMrr && <StatTile label="MRR Stripe (TTC)" value={k('stripeMrr').value} unit="€" hint={k('stripeMrr').hint} />}
                    <StatTile label="Taux de conversion (30 j)" value={k('conversion30').value} unit="%" hint={k('conversion30').hint} />
                    <StatTile label="Impayés en cours" value={k('unpaid').value} hint={k('unpaid').hint} tone={k('unpaid').tone} />
                    <StatTile label="Dossiers payés à valider" value={k('pendingValidation').value} hint={k('pendingValidation').hint} tone={k('pendingValidation').tone} />
                    <StatTile label="Clients avec compte" value={k('accounts').value} unit="%" hint={k('accounts').hint} />
                    <StatTile label="Contrats signés" value={k('contracts').value} unit="%" hint={k('contracts').hint} />
                    <StatTile label="Procurations signées" value={k('procurations').value} unit="%" hint={k('procurations').hint} />
                    <StatTile label="Cartes non enregistrées" value={k('pendingPayLink').value} hint={k('pendingPayLink').hint} tone={k('pendingPayLink').tone} />
                    <StatTile label="Courriers reçus (30 j)" value={k('mail30').value} delta={k('mail30').delta} hint={k('mail30').hint} />
                    <StatTile label="Messages clients (30 j)" value={k('messages30').value} hint={k('messages30').hint} tone={k('messages30').tone} />
                    <StatTile label="Réservations (30 j)" value={k('bookings30').value} hint={k('bookings30').hint} tone={k('bookings30').tone} />
                    <StatTile label="Réexpéditions à traiter" value={k('reexpPending').value} hint={k('reexpPending').hint} tone={k('reexpPending').tone} />
                    <StatTile label="Emails envoyés (30 j)" value={k('emails30').value} hint={k('emails30').hint} tone={k('emails30').tone} />
                    <StatTile label="Inscriptions en cours" value={k('leadsOpen').value} hint={k('leadsOpen').hint} />
                </div>
            </section>

            {/* ── Clients et revenus ── */}
            <h3 className="stats-section-title">Clients et revenus</h3>
            <div className="stats-grid">
                <ChartCard title="Clients actifs" subtitle="Portefeuille en fin de mois (dossiers actifs, hors résiliés)" table={seriesTable(['Clients actifs'], [monthly.activeCum])}>
                    <LineChart labels={labels} series={[{ name: 'Clients actifs', values: monthly.activeCum }]} />
                </ChartCard>
                <ChartCard title="Nouveaux clients et résiliations" subtitle="Par mois" table={seriesTable(['Nouveaux', 'Résiliations'], [monthly.newClients, monthly.terminated])}>
                    <BarChart labels={labels} series={[{ name: 'Nouveaux', values: monthly.newClients }, { name: 'Résiliations', values: monthly.terminated, color: SERIES_COLORS[1] }]} />
                </ChartCard>
                <ChartCard title="Encaissé (Stripe)" subtitle={stripe ? 'Paiements réussis, nets de remboursements, TTC' : 'Stripe indisponible : montants enregistrés manuellement'} table={seriesTable(['€ TTC'], [stripe ? monthly.stripeRevenue.map((v) => v ?? 0) : monthly.payments], '€')}>
                    <BarChart labels={labels} unit="€" series={[{ name: stripe ? 'Encaissé TTC' : 'Paiements enregistrés', values: stripe ? monthly.stripeRevenue.map((v) => v ?? 0) : monthly.payments }]} />
                </ChartCard>
                <ChartCard title="Revenu récurrent par formule" subtitle="Mensualité HT des dossiers actifs (annuel ramené au mois)" table={partsTable(splits.plans.map((p) => ({ name: p.name, value: p.value })))}>
                    <SegmentedBar parts={splits.plans.map((p) => ({ name: p.name, value: p.value }))} />
                    <div className="viz-split-row">
                        <div><div className="viz-mini-title">Périodicité</div><SegmentedBar parts={splits.billing} /></div>
                        <div><div className="viz-mini-title">Grille tarifaire</div><SegmentedBar parts={splits.grid.map((g, i) => ({ ...g, color: SERIES_COLORS[i === 0 ? 0 : 3] }))} /></div>
                    </div>
                </ChartCard>
                <ChartCard title="Statuts des dossiers" subtitle="Tous les dossiers, résiliés compris" table={partsTable(splits.statuses)}>
                    <HBarChart items={splits.statuses} />
                </ChartCard>
                <ChartCard title="Villes" subtitle="Dossiers actifs par ville" table={partsTable(splits.cities)}>
                    <HBarChart items={splits.cities} color={SERIES_COLORS[2]} />
                </ChartCard>
            </div>

            {/* ── Acquisition ── */}
            <h3 className="stats-section-title">Acquisition et parcours</h3>
            <div className="stats-grid">
                <ChartCard title="Entonnoir de souscription" subtitle={`Sur ${months} mois : de l’email saisi jusqu’à la procuration signée`} table={partsTable(funnel)}>
                    <HBarChart items={funnel.map((f, i) => ({ ...f, hint: i > 0 ? conv(i) : '' }))} />
                </ChartCard>
                <ChartCard title="Inscriptions commencées" subtitle="Emails saisis dans le tunnel, par mois" table={seriesTable(['Inscriptions'], [monthly.leads])}>
                    <BarChart labels={labels} series={[{ name: 'Inscriptions commencées', values: monthly.leads, color: SERIES_COLORS[2] }]} />
                </ChartCard>
                <ChartCard title="Quand les clients s’inscrivent" subtitle={`${fmtValue(heatmap.total)} action(s) de souscription · jour et heure (Paris)`} wide table={{ columns: [{ key: 'jour', label: 'Jour' }, ...heatmap.hours.map((h) => ({ key: `h${h}`, label: `${h} h` }))], rows: heatmap.weekdays.map((d, i) => Object.fromEntries([['jour', d], ...heatmap.hours.map((h) => [`h${h}`, heatmap.matrix[i][h]])])) }}>
                    <Heatmap rows={heatmap.weekdays} cols={heatmap.hours} matrix={heatmap.matrix} />
                </ChartCard>
            </div>

            {/* ── Activité ── */}
            <h3 className="stats-section-title">Activité du service</h3>
            <div className="stats-grid">
                <ChartCard title="Courrier reçu" subtitle="Numérisé (Confort, Premium) ou notifié seulement" table={seriesTable(['Numérisés', 'Notifiés'], [monthly.scans, monthly.photos])}>
                    <BarChart labels={labels} stacked series={[{ name: 'Numérisés', values: monthly.scans }, { name: 'Notifiés seulement', values: monthly.photos, color: SERIES_COLORS[1] }]} />
                </ChartCard>
                <ChartCard title="Messagerie" subtitle="Messages envoyés par les clients et par l’équipe" table={seriesTable(['Clients', 'Équipe'], [monthly.clientMessages, monthly.adminMessages])}>
                    <BarChart labels={labels} series={[{ name: 'Clients', values: monthly.clientMessages }, { name: 'Équipe', values: monthly.adminMessages, color: SERIES_COLORS[2] }]} />
                </ChartCard>
                <ChartCard title="Réservations de salle" subtitle="Demandes de réservation par mois" table={seriesTable(['Réservations'], [monthly.bookings])}>
                    <BarChart labels={labels} series={[{ name: 'Réservations', values: monthly.bookings, color: SERIES_COLORS[3] }]} />
                </ChartCard>
                <ChartCard title="Emails automatiques" subtitle="Par catégorie (3 principales + autres)" table={seriesTable(monthly.emails.map((s) => s.name), monthly.emails.map((s) => s.values))}>
                    {monthly.emails.length ? <BarChart labels={labels} stacked series={monthly.emails.map((s, i) => ({ ...s, color: SERIES_COLORS[i % 4] }))} /> : <div className="viz-empty">Aucun email enregistré sur la période</div>}
                </ChartCard>
            </div>

            {/* ── Tableau mensuel ── */}
            <h3 className="stats-section-title">Tableau mensuel</h3>
            <section className="viz-card viz-card-wide" aria-label="Tableau mensuel">
                <DataTable columns={monthlyColumns} rows={csvRows} />
            </section>
        </div>
    );
}
