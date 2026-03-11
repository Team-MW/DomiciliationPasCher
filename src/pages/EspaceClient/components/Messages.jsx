import React, { useState, useEffect, useRef } from 'react';
import { adminDataService } from '../../../services/adminDataService';

export default function Messages({ clientData }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (clientData) {
            fetchMessages();
            const interval = setInterval(fetchMessages, 10000); // Poll every 10s
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
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || isLoading) return;

        setIsLoading(true);
        try {
            const msg = await adminDataService.addMessage(clientData.id, {
                content: newMessage,
                sender: 'client'
            });
            setMessages(prev => [...prev, msg]);
            setNewMessage('');
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="ec-tab-animate" style={{ height: 'calc(100vh - 200px)' }}>
            <div className="ec-content-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div className="ec-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>Messagerie Directe</h2>
                    <span className="ec-status-tag" style={{ background: '#F1F5F9', color: '#64748B', fontSize: '12px' }}>
                        Support en ligne
                    </span>
                </div>

                <div className="ec-card-body" ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: '#FAFAFA' }}>
                    {messages.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                            <div style={{ fontSize: '40px', marginBottom: '16px' }}>💬</div>
                            <p>Bienvenue dans votre messagerie sécurisée.</p>
                            <p style={{ fontSize: '13px' }}>Posez vos questions ici, notre équipe vous répondra dans les plus brefs délais.</p>
                        </div>
                    ) : (
                        messages.map(m => (
                            <div key={m.id} style={{
                                alignSelf: m.sender === 'client' ? 'flex-end' : 'flex-start',
                                maxWidth: '75%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: m.sender === 'client' ? 'flex-end' : 'flex-start'
                            }}>
                                <div style={{
                                    background: m.sender === 'client' ? 'var(--primary)' : 'white',
                                    color: m.sender === 'client' ? 'white' : '#1E293B',
                                    padding: '12px 18px',
                                    borderRadius: '18px',
                                    fontSize: '14px',
                                    lineHeight: '1.5',
                                    boxShadow: m.sender === 'client' ? '0 4px 12px rgba(37, 99, 235, 0.2)' : '0 2px 8px rgba(0,0,0,0.05)',
                                    borderBottomRightRadius: m.sender === 'client' ? '2px' : '18px',
                                    borderBottomLeftRadius: m.sender === 'client' ? '18px' : '2px',
                                    border: m.sender === 'client' ? 'none' : '1px solid #E2E8F0'
                                }}>
                                    {m.content}
                                </div>
                                <span style={{ fontSize: '10px', color: '#94A3B8', marginTop: '6px' }}>
                                    {m.sender === 'admin' ? 'Support DPC' : 'Vous'} • {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))
                    )}
                </div>

                <form onSubmit={handleSend} style={{ padding: '20px', background: 'white', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '12px' }}>
                    <input
                        type="text"
                        placeholder="Tapez votre message ici..."
                        style={{
                            flex: 1,
                            height: '48px',
                            padding: '0 20px',
                            borderRadius: '12px',
                            border: '1px solid #E2E8F0',
                            fontSize: '14px',
                            background: '#F8FAFC'
                        }}
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        className="btn-primary"
                        style={{ padding: '0 24px', whiteSpace: 'nowrap' }}
                        disabled={isLoading || !newMessage.trim()}
                    >
                        {isLoading ? '...' : 'Envoyer'}
                    </button>
                </form>
            </div>
        </div>
    );
}
