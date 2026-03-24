import { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { adminDataService } from '../../../services/adminDataService';

export default function Meeting({ clientData, setActiveTab }) {
    const [bookings, setBookings] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (clientData?.id) {
            const fetchBookings = async () => {
                const b = await adminDataService.getClientBookings(clientData.id);
                setBookings(b);
            };
            fetchBookings();
        }
    }, [clientData]);

    const handleBooking = async () => {
        const type = document.getElementById('book-type').value;
        const date = document.getElementById('book-date').value;
        const duration = document.getElementById('book-duration').value;

        if (!date) return alert('Veuillez choisir une date');

        setIsSubmitting(true);
        try {
            await adminDataService.addBookingRequest(clientData.id, {
                type,
                date,
                duration,
                city: clientData.city
            });
            const b = await adminDataService.getClientBookings(clientData.id);
            setBookings(b);
            alert(`Votre demande de réservation à ${clientData.city || 'À définir'} a été envoyée ! Un administrateur reviendra vers vous.`);
            document.getElementById('book-date').value = '';
        } catch (error) {
            console.error("Booking error:", error);
            alert("Une erreur est survenue lors de la demande. Si la base de données vient d'être mise à jour, merci d'actualiser la page (F5). Détail: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="ec-tab-animate">
            <div className="ec-meeting-layout">
                <div className="ec-content-card">
                    <div className="ec-card-header">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <h2>Réserver une Salle ou un Bureau</h2>
                            <span className="ec-status-tag" style={{ background: '#EEF2FF', color: '#4F46E5', fontWeight: 600 }}>
                                📍 Centre {clientData.city}
                            </span>
                        </div>
                    </div>
                    <div className="ec-card-body" style={{ padding: '24px' }}>
                        <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '20px' }}>
                            Besoin d'un espace pour vos rendez-vous clients ou pour travailler au calme ?
                            Réservez dès maintenant un créneau dans nos locaux de {clientData.city}.
                        </p>
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
                            <button
                                className="ec-btn-primary"
                                style={{ width: '100%', marginTop: '20px' }}
                                onClick={handleBooking}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Envoi...' : 'Confirmer la demande de réservation'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="ec-content-card">
                    <div className="ec-card-header"><h2>Vos réservations</h2></div>
                    <div className="ec-activity-list">
                        {bookings.length === 0 ? (
                            <div className="ec-empty" style={{ padding: '40px' }}>Vous n'avez pas de réservation en cours.</div>
                        ) : bookings.map(b => (
                            <div key={b.id} className="ec-activity-item">
                                <div className="ec-activity-icon"><Icons.Calendar /></div>
                                <div className="ec-activity-body">
                                    <div className="ec-activity-title">{b.type}</div>
                                    <div className="ec-activity-meta">{b.date} · {b.duration}</div>
                                </div>
                                <span className={`ec-status-chip ${b.status === 'en_attente' ? 'unread' : ''}`}>{b.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
