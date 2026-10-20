import { useState, useEffect, useRef } from 'react';
import { Icons } from './Icons';
import { adminDataService } from '../../../services/adminDataService';
import { handleCheckout } from '../../../utils/stripe';
import { useTranslation } from '../../../i18n/LanguageContext';
import {
    MEETING_TYPES,
    MEETING_DURATIONS,
    meetingPriceHt,
    formatMeetingPrice,
    localIsoDate,
} from '../../../utils/meetingPrices';

export default function Meeting({ clientData }) {
    const { t } = useTranslation();
    const [bookings, setBookings] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [form, setForm] = useState({
        type: MEETING_TYPES.room,
        date: '',
        duration: MEETING_DURATIONS.morning,
    });
    const returnHandled = useRef(false);

    useEffect(() => {
        if (!clientData?.id) return;

        const fetchBookings = async () => {
            const b = await adminDataService.getClientBookings(clientData.id);
            setBookings(b);
        };
        fetchBookings();

        const urlParams = new URLSearchParams(window.location.search);

        const cleanMeetingUrl = () => {
            window.history.replaceState({}, document.title, window.location.pathname + '?tab=meeting');
        };

        if (urlParams.get('booking_success') === 'true') {
            if (returnHandled.current) return;
            returnHandled.current = true;
            const sessionId = urlParams.get('session_id');
            const storedBooking = sessionStorage.getItem('pendingBooking');

            (async () => {
                try {
                    if (!sessionId) {
                        setErrorMsg(t('espaceClient.meeting.payError'));
                        return;
                    }
                    const paidKey = `dpc_paid_booking_${sessionId}`;
                    if (localStorage.getItem(paidKey)) {
                        sessionStorage.removeItem('pendingBooking');
                        return;
                    }
                    const res = await fetch(`/api/verify-session?session_id=${encodeURIComponent(sessionId)}`);
                    const data = await res.json();
                    if (!data?.success) {
                        setErrorMsg(t('espaceClient.meeting.payError'));
                        return;
                    }
                    if (data.metadata?.type && data.metadata.type !== 'meeting_booking') {
                        setErrorMsg(t('espaceClient.meeting.payError'));
                        return;
                    }
                    let parsedBooking = null;
                    if (storedBooking) {
                        try { parsedBooking = JSON.parse(storedBooking); } catch { parsedBooking = null; }
                    }
                    if (!parsedBooking?.date && data.metadata?.date) {
                        parsedBooking = {
                            type: data.metadata.meeting_type,
                            date: data.metadata.date,
                            duration: data.metadata.duration,
                            city: data.metadata.city || clientData.city,
                        };
                    }
                    if (!parsedBooking?.city && clientData.city) {
                        parsedBooking = { ...parsedBooking, city: clientData.city };
                    }
                    if (!parsedBooking?.date) {
                        setErrorMsg(t('espaceClient.meeting.payError'));
                        return;
                    }
                    sessionStorage.removeItem('pendingBooking');
                    await adminDataService.addBookingRequest(clientData.id, parsedBooking);
                    localStorage.setItem(paidKey, '1');
                    const b = await adminDataService.getClientBookings(clientData.id);
                    setBookings(b);
                    setShowSuccess(true);
                } catch (e) {
                    console.error('Erreur restauration réservation', e);
                    setErrorMsg(t('espaceClient.meeting.payError'));
                } finally {
                    sessionStorage.removeItem('pendingBooking');
                    cleanMeetingUrl();
                }
            })();
        } else if (urlParams.get('booking_cancel') === 'true') {
            setErrorMsg(t('espaceClient.meeting.cancelled'));
            sessionStorage.removeItem('pendingBooking');
            cleanMeetingUrl();
        }
    }, [clientData]);

    const handleBooking = async () => {
        const { type, date, duration } = form;
        setShowSuccess(false);
        setErrorMsg('');

        if (!date) return setErrorMsg(t('espaceClient.meeting.needDate'));

        const price = meetingPriceHt(type, duration);

        setIsSubmitting(true);
        try {
            const cache = { type, date, duration, city: clientData.city || 'À définir' };
            sessionStorage.setItem('pendingBooking', JSON.stringify(cache));
            const successUrl = `${window.location.origin}/app/espace-client?tab=meeting&booking_success=true`;
            const cancelUrl = `${window.location.origin}/app/espace-client?tab=meeting&booking_cancel=true`;

            await handleCheckout(
                'salle',
                price,
                `Réservation ${type} (${duration})`,
                'one_time',
                successUrl,
                cancelUrl,
                clientData.email,
                clientData.name,
                {
                    client_id: String(clientData.id),
                    type: 'meeting_booking',
                    meeting_type: type,
                    date,
                    duration,
                    city: clientData.city || '',
                }
            );
        } catch (error) {
            console.error("Booking payment error:", error);
            setErrorMsg(error.message || t('espaceClient.meeting.payError'));
            setIsSubmitting(false);
        }
    };

    const displayPrice = formatMeetingPrice(meetingPriceHt(form.type, form.duration));

    return (
        <div className="ec-tab-animate">
            <div className="ec-meeting-layout">
                <div className="ec-content-card">
                    <div className="ec-card-header">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <h2>{t('espaceClient.meeting.title')}</h2>
                            <span className="ec-status-tag" style={{ background: '#EEF2FF', color: '#4F46E5', fontWeight: 600 }}>
                                {t('espaceClient.meeting.centre').replace('{city}', clientData.city || 'Toulouse')}
                            </span>
                        </div>
                    </div>
                    <div className="ec-card-body" style={{ padding: '24px' }}>
                        <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '20px' }}>
                            {t('espaceClient.meeting.intro').replace('{city}', clientData.city || 'Toulouse')}
                        </p>

                        {showSuccess && (
                            <div style={{ background: '#ECFDF5', border: '1px solid #10B981', color: '#047857', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: '#10B981', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</div>
                                <div>
                                    <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>{t('espaceClient.meeting.successTitle')}</strong>
                                    <span style={{ fontSize: '13px' }}>{t('espaceClient.meeting.successHint')}</span>
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
                                <label htmlFor="book-type">{t('espaceClient.meeting.typeLabel')}</label>
                                <select
                                    id="book-type"
                                    className="ec-input"
                                    value={form.type}
                                    onChange={(e) => {
                                        const type = e.target.value;
                                        setForm((f) => ({
                                            ...f,
                                            type,
                                            duration: type === MEETING_TYPES.cowork && f.duration === MEETING_DURATIONS.hour ? MEETING_DURATIONS.morning : f.duration,
                                        }));
                                    }}
                                >
                                    <option value={MEETING_TYPES.room}>{t('espaceClient.meeting.typeRoom')}</option>
                                    <option value={MEETING_TYPES.office}>{t('espaceClient.meeting.typeOffice')}</option>
                                    <option value={MEETING_TYPES.cowork}>{t('espaceClient.meeting.typeCowork')}</option>
                                </select>
                            </div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label htmlFor="book-date">{t('espaceClient.meeting.dateLabel')}</label>
                                    <input
                                        type="date"
                                        id="book-date"
                                        className="ec-input"
                                        min={localIsoDate()}
                                        value={form.date}
                                        onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="book-duration">{t('espaceClient.meeting.durationLabel')}</label>
                                    <select
                                        id="book-duration"
                                        className="ec-input"
                                        value={form.duration}
                                        onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                                    >
                                        {form.type !== MEETING_TYPES.cowork && (
                                            <option value={MEETING_DURATIONS.hour}>{t('espaceClient.meeting.hour')}</option>
                                        )}
                                        <option value={MEETING_DURATIONS.morning}>{t('espaceClient.meeting.morning')}</option>
                                        <option value={MEETING_DURATIONS.afternoon}>{t('espaceClient.meeting.afternoon')}</option>
                                        <option value={MEETING_DURATIONS.fullday}>{t('espaceClient.meeting.fullday')}</option>
                                    </select>
                                </div>
                            </div>
                            <button
                                className="ec-btn-primary"
                                style={{ width: '100%', marginTop: '20px' }}
                                onClick={handleBooking}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? t('espaceClient.meeting.connecting') : t('espaceClient.meeting.pay').replace('{price}', displayPrice)}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="ec-content-card">
                    <div className="ec-card-header"><h2>{t('espaceClient.meeting.yourBookings')}</h2></div>
                    <div className="ec-activity-list">
                        {bookings.length === 0 ? (
                            <div className="ec-empty" style={{ padding: '40px' }}>{t('espaceClient.meeting.empty')}</div>
                        ) : bookings.map(b => (
                            <div key={b.id} className="ec-activity-item">
                                <div className="ec-activity-icon"><Icons.Calendar /></div>
                                <div className="ec-activity-body">
                                    <div className="ec-activity-title">{b.type}</div>
                                    <div className="ec-activity-meta">{b.date} · {b.duration}</div>
                                </div>
                                <span className={`ec-status-chip ${b.status === 'en_attente' ? 'unread' : ''}`}>
                                    {t(`espaceClient.meeting.statusLabel.${b.status === 'confirmée' || b.status === 'confirmee' ? 'confirmed' : b.status === 'refusée' || b.status === 'refusee' ? 'refused' : 'pending'}`)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
}
