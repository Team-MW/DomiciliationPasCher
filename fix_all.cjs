const fs = require('fs');
const path = 'src/pages/Admin/components/DossierClient.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Sidebar extra info
const sidebarSearch = `<span style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{formatDateLong(client.since)}</span>
                            </div>
                        </div>`;
const sidebarReplace = `<span style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{formatDateLong(client.since)}</span>
                            </div>
                            
                            {/* --- NOUVELLES INFOS (extra_info) --- */}
                            {extra?.prenom && extra?.nom && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #E2E8F0' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>IDENTITÉ COMPLÈTE</span>
                                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{extra.prenom} {extra.nom}</span>
                                </div>
                            )}
                            {extra?.phone && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>TÉLÉPHONE</span>
                                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{extra.phone}</span>
                                </div>
                            )}
                            {extra?.address && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>ADRESSE PERSO.</span>
                                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{extra.address}</span>
                                </div>
                            )}
                            {extra?.siret && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>SIRET</span>
                                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{extra.siret}</span>
                                </div>
                            )}
                            {extra?.activite && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>ACTIVITÉ</span>
                                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{extra.activite}</span>
                                </div>
                            )}
                        </div>`;
content = content.replace(sidebarSearch, sidebarReplace);

// Fix bug in setClient logic
content = content.replace(/setClient\(prev => \({ \.\.\.prev, extra_info: JSON\.stringify\(updatedExtra\) }\)\);/, 'onUpdate();');


fs.writeFileSync(path, content);
