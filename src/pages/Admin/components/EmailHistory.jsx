import React, { useMemo, useState } from 'react';
import { EMAIL_SOURCES, emailTypeInfo, emailSourceOf } from '../../../../shared/emailTypes.js';
import './EmailHistory.css';

/**
 * Historique complet des emails d'un client (table email_logs) : envois manuels, automatiques,
 * accusés, alertes équipe, et échecs avec leur raison. Préfixe CSS : eh-
 */

const FILTERS = [
    { id: 'all', label: 'Tous' },
    { id: 'auto', label: 'Automatiques' },
    { id: 'manuel', label: 'Manuels' },
    { id: 'client', label: 'Actions du client' },
    { id: 'interne', label: 'Alertes équipe' },
    { id: 'failed', label: 'Échecs' },
];

const CATEGORY_ICON = {
    Compte: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
    Paiement: 'M3 7h18v10H3zM3 11h18',
    Documents: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5',
    Courrier: 'M4 6h16v12H4zM4 7l8 6 8-6',
    Messagerie: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    Prospect: 'M12 2l3 6 6 .9-4.5 4.3 1 6.3L12 16.6 6.5 19.5l1-6.3L3 8.9 9 8z',
    Interne: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
    Autre: 'M4 6h16v12H4zM4 7l8 6 8-6',
};

const dayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const timeFormatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

function safeDate(value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

export default function EmailHistory({ logs, clientEmail, onRefresh }) {
    const [filter, setFilter] = useState('all');
    const [query, setQuery] = useState('');
    const [openId, setOpenId] = useState(null);

    const rows = useMemo(() => (logs || []).map((log) => ({
        ...log,
        info: emailTypeInfo(log.type),
        source: emailSourceOf(log),
        date: safeDate(log.sent_at),
        failed: log.status === 'failed' || log.status === 'error',
    })), [logs]);

    const counts = useMemo(() => ({
        all: rows.length,
        sent: rows.filter((r) => !r.failed).length,
        failed: rows.filter((r) => r.failed).length,
        auto: rows.filter((r) => r.source === 'auto').length,
        manuel: rows.filter((r) => r.source === 'manuel').length,
        client: rows.filter((r) => r.source === 'client').length,
        interne: rows.filter((r) => r.source === 'interne').length,
    }), [rows]);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return rows.filter((r) => {
            if (filter === 'failed' && !r.failed) return false;
            if (filter !== 'all' && filter !== 'failed' && r.source !== filter) return false;
            if (!q) return true;
            return [r.subject, r.info.label, r.to_email, r.body_text, r.error].some((v) => String(v || '').toLowerCase().includes(q));
        });
    }, [rows, filter, query]);

    const groups = useMemo(() => {
        const out = [];
        for (const r of visible) {
            const key = r.date ? `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, '0')}-${String(r.date.getDate()).padStart(2, '0')}` : 'inconnue'; // jour LOCAL (comme l'intitulé)
            const last = out[out.length - 1];
            if (last && last.key === key) last.items.push(r);
            else out.push({ key, label: r.date ? dayFormatter.format(r.date) : 'Date inconnue', items: [r] });
        }
        return out;
    }, [visible]);

    const lastSent = rows.find((r) => !r.failed);

    return (
        <section className="eh" id="admin-email-history" aria-labelledby="eh-title">
            <header className="eh-head">
                <div>
                    <h3 id="eh-title" className="eh-title">Historique des emails</h3>
                    <p className="eh-sub">
                        Tous les emails liés à {clientEmail ? <strong>{clientEmail}</strong> : 'ce client'} : automatiques, manuels, accusés et alertes équipe.
                        {lastSent?.date && <> Dernier envoi réussi : {dayFormatter.format(lastSent.date)} à {timeFormatter.format(lastSent.date)}.</>}
                    </p>
                </div>
                {onRefresh && (
                    <button type="button" className="eh-refresh" onClick={onRefresh} disabled={logs === null}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5" /></svg>
                        Actualiser
                    </button>
                )}
            </header>

            {logs === null ? (
                <div className="eh-skeleton" aria-busy="true" aria-label="Chargement de l’historique">
                    {[0, 1, 2].map((i) => <div key={i} className="eh-skeleton-row" />)}
                </div>
            ) : (
                <>
                    <div className="eh-stats">
                        <div className="eh-stat"><span className="eh-stat-value">{counts.all}</span><span className="eh-stat-label">emails au total</span></div>
                        <div className="eh-stat is-ok"><span className="eh-stat-value">{counts.sent}</span><span className="eh-stat-label">envoyés</span></div>
                        <div className={`eh-stat ${counts.failed ? 'is-ko' : ''}`}><span className="eh-stat-value">{counts.failed}</span><span className="eh-stat-label">en échec</span></div>
                        <div className="eh-stat"><span className="eh-stat-value">{counts.auto}</span><span className="eh-stat-label">automatiques</span></div>
                    </div>

                    <div className="eh-toolbar">
                        <div className="eh-filters" role="tablist" aria-label="Filtrer les emails">
                            {FILTERS.map((f) => {
                                const n = f.id === 'all' ? counts.all : counts[f.id];
                                return (
                                    <button
                                        key={f.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={filter === f.id}
                                        className={`eh-filter ${filter === f.id ? 'is-active' : ''} ${f.id === 'failed' && n ? 'is-danger' : ''}`}
                                        onClick={() => setFilter(f.id)}
                                    >
                                        {f.label}<span className="eh-filter-count">{n}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <label className="eh-search">
                            <span className="sr-only">Rechercher dans les emails</span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                            <input type="search" placeholder="Objet, contenu, destinataire…" value={query} onChange={(e) => setQuery(e.target.value)} />
                        </label>
                    </div>

                    {rows.length === 0 ? (
                        <div className="eh-empty">
                            <p className="eh-empty-title">Aucun email enregistré pour ce client</p>
                            <p className="eh-empty-hint">
                                Chaque email (envoyé ou en échec) apparaît ici dès son envoi. Un email tenté alors que le
                                serveur d’envoi n’était pas configuré n’était pas enregistré avant le 6 novembre 2026.
                            </p>
                        </div>
                    ) : visible.length === 0 ? (
                        <div className="eh-empty"><p className="eh-empty-title">Aucun email ne correspond à ce filtre</p></div>
                    ) : (
                        groups.map((g) => (
                            <div key={g.key} className="eh-day">
                                <p className="eh-day-label">{g.label}</p>
                                <ul className="eh-list">
                                    {g.items.map((r) => {
                                        const open = openId === r.id;
                                        const toTeam = r.source === 'interne';
                                        return (
                                            <li key={r.id} className={`eh-item ${r.failed ? 'is-failed' : ''} ${open ? 'is-open' : ''}`}>
                                                <button type="button" className="eh-row" aria-expanded={open} onClick={() => setOpenId(open ? null : r.id)}>
                                                    <span className={`eh-icon eh-cat-${r.info.category.toLowerCase()}`} aria-hidden="true">
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={CATEGORY_ICON[r.info.category] || CATEGORY_ICON.Autre} /></svg>
                                                    </span>
                                                    <span className="eh-main">
                                                        <span className="eh-label">{r.info.label}</span>
                                                        <span className="eh-subject">{r.subject || '(sans objet)'}</span>
                                                        <span className="eh-meta">
                                                            {r.date ? timeFormatter.format(r.date) : '—'} · {toTeam ? 'À l’équipe' : 'À'} {r.to_email}
                                                        </span>
                                                    </span>
                                                    <span className="eh-badges">
                                                        <span className={`eh-badge eh-src-${r.source}`}>{EMAIL_SOURCES[r.source]}</span>
                                                        <span className={`eh-badge ${r.failed ? 'is-ko' : 'is-ok'}`}>{r.failed ? 'Échec' : 'Envoyé'}</span>
                                                    </span>
                                                    <svg className="eh-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                                                </button>
                                                {open && (
                                                    <div className="eh-detail">
                                                        {r.failed && (
                                                            <p className="eh-error"><strong>Raison de l’échec :</strong> {r.error || 'inconnue'}</p>
                                                        )}
                                                        <dl className="eh-facts">
                                                            <div><dt>Date</dt><dd>{r.date ? r.date.toLocaleString('fr-FR') : '—'}</dd></div>
                                                            <div><dt>Destinataire</dt><dd>{r.to_email}</dd></div>
                                                            <div><dt>Catégorie</dt><dd>{r.info.category}</dd></div>
                                                            <div><dt>Origine</dt><dd>{EMAIL_SOURCES[r.source]}</dd></div>
                                                        </dl>
                                                        {r.body_text ? (
                                                            <pre className="eh-body">{r.body_text}</pre>
                                                        ) : (
                                                            <p className="eh-nobody">Contenu non archivé (email envoyé avant l’archivage du contenu, le 6 novembre 2026).</p>
                                                        )}
                                                    </div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))
                    )}
                </>
            )}
        </section>
    );
}
