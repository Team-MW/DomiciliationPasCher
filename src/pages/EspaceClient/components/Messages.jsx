import React, { useState, useEffect, useRef, useMemo } from 'react';
import { adminDataService } from '../../../services/adminDataService';
import { useTranslation } from '../../../i18n/LanguageContext';
import { Icons } from './Icons';

function sameCalendarDay(a, b) {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

function dayKey(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'unknown';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDayLabel(iso, t) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (sameCalendarDay(d, today)) return t('espaceClient.messages.today');
    if (sameCalendarDay(d, yesterday)) return t('espaceClient.messages.yesterday');
    return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatTime(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Messages({ clientData }) {
    const { t } = useTranslation();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (clientData) {
            fetchMessages();
            const interval = setInterval(fetchMessages, 10000);
            return () => clearInterval(interval);
        }
    }, [clientData]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchMessages = async () => {
        const msgs = await adminDataService.getMessages(clientData.id);
        setMessages(msgs);
        await adminDataService.markMessagesAsRead(clientData.id, 'client');
    };

    const handleSend = async (e) => {
        e.preventDefault();
        const content = newMessage.trim();
        if (!content || isLoading) return;

        setIsLoading(true);
        try {
            const msg = await adminDataService.addMessage(clientData.id, {
                content,
                sender: 'client',
            });
            setMessages((prev) => [...prev, msg]);
            setNewMessage('');

            import('../../../utils/emailService').then(({ sendClientNewMessageEmail }) => {
                sendClientNewMessageEmail(
                    clientData.email,
                    clientData.clientName || clientData.company || t('espaceClient.messages.clientFallback'),
                    content
                );
            }).catch((err) => console.error('Erreur chargement emailService:', err));
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const grouped = useMemo(() => {
        const days = [];
        for (const m of messages) {
            const key = dayKey(m.createdAt);
            const last = days[days.length - 1];
            if (!last || last.key !== key) {
                days.push({ key, label: formatDayLabel(m.createdAt, t), items: [m] });
            } else {
                last.items.push(m);
            }
        }
        return days;
    }, [messages, t]);

    return (
        <div className="ec-tab-animate ec-chat-page">
            <div className="ec-chat">
                <header className="ec-chat-header">
                    <div className="ec-chat-header-left">
                        <div className="ec-chat-avatar" aria-hidden="true">
                            <Icons.Chat style={{ width: 18, height: 18 }} />
                        </div>
                        <div>
                            <h2>{t('espaceClient.messages.title')}</h2>
                            <p className="ec-chat-header-sub">{t('espaceClient.messages.replyHint')}</p>
                        </div>
                    </div>
                    <span className="ec-chat-online">
                        <span className="ec-chat-online-dot" />
                        {t('espaceClient.messages.online')}
                    </span>
                </header>

                <div className="ec-chat-thread" ref={scrollRef}>
                    {messages.length === 0 ? (
                        <div className="ec-chat-empty">
                            <div className="ec-chat-empty-icon" aria-hidden="true">
                                <Icons.Chat style={{ width: 28, height: 28 }} />
                            </div>
                            <p className="ec-chat-empty-title">{t('espaceClient.messages.emptyTitle')}</p>
                            <p className="ec-chat-empty-hint">{t('espaceClient.messages.emptyHint')}</p>
                        </div>
                    ) : (
                        grouped.map((day) => (
                            <section key={day.key} className="ec-chat-day">
                                <div className="ec-chat-day-label">
                                    <span>{day.label}</span>
                                </div>
                                {day.items.map((m, i) => {
                                    const mine = m.sender === 'client';
                                    const prev = day.items[i - 1];
                                    const stacked = prev && prev.sender === m.sender;
                                    return (
                                        <div
                                            key={m.id}
                                            className={`ec-chat-row ${mine ? 'is-mine' : 'is-theirs'}${stacked ? ' is-stacked' : ''}`}
                                        >
                                            {!mine && (
                                                <div className={`ec-chat-row-avatar${stacked ? ' is-hidden' : ''}`} aria-hidden="true">
                                                    {stacked ? null : 'D'}
                                                </div>
                                            )}
                                            <div className="ec-chat-col">
                                                <div className="ec-chat-bubble">{m.content}</div>
                                                <span className="ec-chat-meta">
                                                    {mine ? t('espaceClient.messages.you') : t('espaceClient.messages.supportName')}
                                                    {' · '}
                                                    {formatTime(m.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </section>
                        ))
                    )}
                </div>

                <form className="ec-chat-composer" onSubmit={handleSend}>
                    <label className="ec-chat-input-wrap">
                        <span className="sr-only">{t('espaceClient.messages.placeholder')}</span>
                        <textarea
                            ref={inputRef}
                            rows={1}
                            placeholder={t('espaceClient.messages.placeholder')}
                            value={newMessage}
                            disabled={isLoading}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    e.currentTarget.form?.requestSubmit();
                                }
                            }}
                        />
                    </label>
                    <button
                        type="submit"
                        className="ec-chat-send"
                        disabled={isLoading || !newMessage.trim()}
                        aria-label={t('espaceClient.messages.send')}
                    >
                        {isLoading ? (
                            <span className="ec-chat-send-wait">{t('espaceClient.messages.sending')}</span>
                        ) : (
                            <>
                                <Icons.Send style={{ width: 16, height: 16 }} />
                                <span>{t('espaceClient.messages.send')}</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
