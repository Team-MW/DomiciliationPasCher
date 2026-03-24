import { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { adminDataService } from '../../../services/adminDataService';
import { handleCheckout } from '../../../utils/stripe';

export default function Meeting({ clientData, setActiveTab }) {
    const [bookings, setBookings] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [bookingCache, setBookingCache] = useState(null);

    // Au chargement, on vérifie si l'utilisateur revient d'un paiement Stripe réussi
    useEffect(() => {
        if (clientData?.id) {
            const fetchBookings = async () => {
                const b = await adminDataService.getClientBookings(clientData.id);
                setBookings(b);
            };
            fetchBookings();

            // Interception du webhook/redirection Stripe
            const urlParams = new URLSearchParams(window.location.search);
            
            if (urlParams.get('booking_success') === 'true') {
                const storedBooking = sessionStorage.getItem('pendingBooking');
                if (storedBooking) {
                    try {
                        const parsedBooking = JSON.parse(storedBooking);
                        adminDataService.addBookingRequest(clientData.id, parsedBooking).then(async () => {
                            const b = await adminDataService.getClientBookings(clientData.id);
                            setBookings(b);
                            setShowSuccess(true);
                        });
                        sessionStorage.removeItem('pendingBooking');
                        window.history.replaceState({}, document.title, window.location.pathname + '?tab=meeting');
                    } catch (e) {
                        console.error('Erreur restauration réservation', e);
                    }
                }
            } else if (urlParams.get('booking_cancel') === 'true') {
                setErrorMsg('Le paiement a été annulé ou refusé. Votre réservation n\'a pas pu aboutir.');
                sessionStorage.removeItem('pendingBooking');
                window.history.replaceState({}, document.title, window.location.pathname + '?tab=meeting');
            }
        }
    }, [clientData]);

    const handleBooking = async () => {
        const type = document.getElementById('book-type').value;
        const date = document.getElementById('book-date').value;
        const duration = document.getElementById('book-duration').value;

        setShowSuccess(false);
        setErrorMsg('');

        if (!date) return setErrorMsg('Veuillez choisir une date de réservation.');

        // On redirige IMMÉDIATEMENT vers Stripe (cash)
        const cache = { type, date, duration, city: clientData.city };
        setBookingCache(cache);
        
        setIsSubmitting(true);
        try {
            sessionStorage.setItem('pendingBooking', JSON.stringify(cache));
            const successUrl = `${window.location.origin}/espace-client?tab=meeting&booking_success=true`;
            const cancelUrl = `${window.location.origin}/espace-client?tab=meeting&booking_cancel=true`;
            
            await handleCheckout('salle', 40, `Réservation ${type}`, 'one_time', successUrl, cancelUrl);
            // La page va être redirigée vers Stripe ici.
        } catch (error) {
            console.error("Booking payment error:", error);
            setErrorMsg(error.message || "Erreur de connexion au système de paiement.");
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
                        
                        {showSuccess && (
                            <div style={{ background: '#ECFDF5', border: '1px solid #10B981', color: '#047857', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: '#10B981', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</div>
                                <div>
                                    <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Demande envoyée !</strong>
                                    <span style={{ fontSize: '13px' }}>Votre réservation a bien été transmise à notre équipe. Vous recevrez une notification dès sa validation !</span>
                                </div>
                            </div>
                        )}

                        {errorMsg && (
                            <div style={{ background: '#FEF2F2', border: '1px solid #EF4444', color: '#B91C1C', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', fontWeight: 500 }}>
                                ⚠️ {errorMsg}
                            </div>
                        )}
                        <div className="ec-booking-form">
                            <div className="form-group">
                                <label>Type de location</label>
                                <select id="book-type" className="ec-input">
                                    <option>Salle de réunion (6-8 pers)</option>
                                    <option>Bureau privé (1-2 pers)</option>
                                    <option>Espace Coworking</option>
                                </select>
                            </div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Date souhaitée</label>
                                    <input type="date" id="book-date" className="ec-input" />
                                </div>
                                <div className="form-group">
                                    <label>Durée</label>
                                    <select id="book-duration" className="ec-input">
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
                                {isSubmitting ? 'Connexion à Stripe...' : 'Payer (40,00 €) et Réserver'}
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
