import React from 'react';
import { Icons } from './Icons';
import { adminDataService } from '../../../services/adminDataService';

export default function MailTab({ mail, clients, onUpdate }) {
    return (
        <div className="tab-container">
            <div className="tab-header">
                <h1>Centre de Courrier</h1>
                <button className="btn-primary-sm">Nouveau Scan</button>
            </div>

            <div className="mail-grid">
                {mail.map(m => (
                    <div key={m.id} className={`mail-card-v2 ${m.status === 'non lu' ? 'is-unread' : ''}`}>
                        <div className="mail-icon-v2"><Icons.Mail /></div>
                        <div className="mail-body-v2">
                            <div className="mail-company">{m.company}</div>
                            <div className="mail-from">Exp: {m.from}</div>
                            <div className="mail-meta">{m.type} · {m.date}</div>
                            <div className="mail-actions-v2">
                                <button className="btn-primary-sm" onClick={() => { adminDataService.markMailAsRead(m.id); onUpdate(); }}>
                                    {m.status === 'non lu' ? 'Marquer Lu' : 'Visualiser'}
                                </button>
                                <button className="btn-secondary-sm">Transférer</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
