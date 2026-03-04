import React from 'react';
import { Icons } from './Icons';
import { adminDataService } from '../../../services/adminDataService';

export default function Meeting({ clientData, setActiveTab }) {
    return (
        <div className="ec-tab-animate">
            <div className="ec-meeting-layout">
                <div className="ec-content-card">
                    <div className="ec-card-header">
                        <h2>Réserver une Salle ou un Bureau</h2>
                    </div>
                    <div className="ec-card-body" style={{ padding: '24px' }}>
                        <div className="ec-booking-form">
                            <div className="form-group">
                                <label>Type de location</label>
                                <select id="book-type">
                                    <option>Salle de réunion (6-8 pers)</option>
                                    <option>Bureau privé (1-2 pers)</option>
                                    <option>Espace Coworking</option>
                                </select>
                            </div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Date souhaitée</label>
                                    <input type="date" id="book-date" />
                                </div>
                                <div className="form-group">
                                    <label>Durée</label>
                                    <select id="book-duration">
                                        <option>Matinée (9h-12h)</option>
                                        <option>Après-midi (14h-18h)</option>
                                        <option>Journée complète</option>
                                    </select>
                                </div>
                            </div>
                            <button className="ec-btn-primary" style={{ width: '100%', marginTop: '20px' }} onClick={() => {
                                const type = document.getElementById('book-type').value;
                                const date = document.getElementById('book-date').value;
                                if (!date) return alert('Veuillez choisir une date');
                                adminDataService.addBookingRequest(clientData.id, { type, date, duration: document.getElementById('book-duration').value });
                                alert('Votre demande de réservation a été envoyée ! Un administrateur reviendra vers vous.');
                                setActiveTab('overview');
                            }}>Confirmer la demande de réservation</button>
                        </div>
                    </div>
                </div>

                <div className="ec-content-card">
                    <div className="ec-card-header"><h2>Vos réservations</h2></div>
                    <div className="ec-activity-list">
                        {adminDataService.getClientBookings(clientData.id).map(b => (
                            <div key={b.id} className="ec-activity-item">
                                <div className="ec-activity-icon"><Icons.Calendar /></div>
                                <div className="ec-activity-body">
                                    <div className="ec-activity-title">{b.type}</div>
                                    <div className="ec-activity-meta">{b.date} · {b.duration}</div>
                                </div>
                                <span className="ec-status-chip unread">{b.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
