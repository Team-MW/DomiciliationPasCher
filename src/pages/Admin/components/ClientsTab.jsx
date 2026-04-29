import React from 'react';

export default function ClientsTab({ clients, searchQuery, onSelect, onUpdate, onCreateClick }) {
    const filtered = clients.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.company.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="clients-container">
            <div className="tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--admin-text-main)' }}>Suivi des Clients</h2>
                    <p style={{ color: 'var(--admin-text-sub)', fontSize: '14px', marginTop: '4px' }}>Gérez et suivez vos dossiers clients en temps réel.</p>
                </div>
                <div className="header-actions" style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-primary-sm" onClick={onCreateClick} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 16, height: 16 }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        Nouveau Client
                    </button>
                </div>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                            <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client / Entreprise</th>
                            <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Formule</th>
                            <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                            <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dossier</th>
                            <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Compte Clerk</th>
                            <th style={{ padding: '16px 20px', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(c => (
                            <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }} className="table-row-hover">
                                <td style={{ padding: '16px 20px', cursor: 'pointer' }} onClick={() => onSelect(c.id)}>
                                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#0F172A' }}>{c.company}</div>
                                    <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>{c.name}</div>
                                </td>
                                <td style={{ padding: '16px 20px' }}>
                                    <span style={{ padding: '4px 8px', borderRadius: '6px', background: '#EFF6FF', color: '#2563EB', fontWeight: '600', fontSize: '12px' }}>{c.plan}</span>
                                </td>
                                <td style={{ padding: '16px 20px', fontSize: '13px', color: '#64748B' }}>{c.since || 'Non définie'}</td>
                                <td style={{ padding: '16px 20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '60px', height: '6px', background: '#E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
                                            <div style={{ width: c.clerkId ? '100%' : '50%', height: '100%', background: '#0F172A', borderRadius: '10px' }}></div>
                                        </div>
                                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#0F172A' }}>{c.clerkId ? '100%' : '50%'}</span>
                                    </div>
                                </td>
                                <td style={{ padding: '16px 20px' }}>
                                    <span style={{ padding: '4px 10px', borderRadius: '9999px', background: c.clerkId ? '#ECFDF5' : '#F1F5F9', color: c.clerkId ? '#059669' : '#64748B', fontSize: '12px', fontWeight: '600' }}>
                                        {c.clerkId ? 'Lié' : 'Non lié'}
                                    </span>
                                </td>
                                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                    <button onClick={() => onSelect(c.id)} style={{ padding: '8px 14px', background: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', transition: 'opacity 0.2s' }}>
                                        Dossier
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
                                    Aucun client trouvé pour "{searchQuery}"
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
