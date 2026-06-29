import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function SignatureModal({ clientData, onClose, onSigned }) {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [mode, setMode] = useState('draw'); // 'draw' | 'type'
    const [typedName, setTypedName] = useState('');
    const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

    const clientName = (() => {
        try {
            const extra = clientData?.extra_info
                ? (typeof clientData.extra_info === 'string' ? JSON.parse(clientData.extra_info) : clientData.extra_info)
                : {};
            return extra.prenom && extra.nom ? `${extra.prenom} ${extra.nom}` : (clientData?.name || '');
        } catch { return clientData?.name || ''; }
    })();

    // Init canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, [mode]);

    // Re-render typed signature on canvas
    useEffect(() => {
        if (mode !== 'type') return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (typedName) {
            ctx.font = "italic 36px 'Georgia', serif";
            ctx.fillStyle = '#1e3a8a';
            ctx.textBaseline = 'middle';
            ctx.fillText(typedName, 20, canvas.height / 2);
            setHasSignature(true);
        } else {
            setHasSignature(false);
        }
    }, [typedName, mode]);

    const getPos = (e, canvas) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        if (e.touches) {
            return {
                x: (e.touches[0].clientX - rect.left) * scaleX,
                y: (e.touches[0].clientY - rect.top) * scaleY,
            };
        }
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    };

    const startDraw = (e) => {
        if (mode !== 'draw') return;
        e.preventDefault();
        const canvas = canvasRef.current;
        const pos = getPos(e, canvas);
        setIsDrawing(true);
        setLastPos(pos);
    };

    const draw = (e) => {
        if (!isDrawing || mode !== 'draw') return;
        e.preventDefault();
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const pos = getPos(e, canvas);
        ctx.beginPath();
        ctx.moveTo(lastPos.x, lastPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        setLastPos(pos);
        setHasSignature(true);
    };

    const stopDraw = () => setIsDrawing(false);

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
        if (mode === 'type') setTypedName('');
    };

    const handleValidate = async () => {
        if (!hasSignature) return;
        setIsSaving(true);
        try {
            const canvas = canvasRef.current;
            const dataUrl = canvas.toDataURL('image/png');
            await onSigned(dataUrl);
        } catch (err) {
            console.error('Erreur signature:', err);
            alert('Erreur lors de la sauvegarde. Réessayez.');
        } finally {
            setIsSaving(false);
        }
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: 'white', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                
                {/* Header matching the site's design */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#3B82F6' }}>
                            ✍️
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>Signature Électronique</h2>
                            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748B' }}>Contrat — {clientData?.company || clientName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '20px', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>✕</button>
                </div>

                <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px', lineHeight: 1.5 }}>
                    En signant, vous acceptez le contrat de domiciliation et confirmez l'exactitude de votre dossier.
                </p>

                {/* Mode selector */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    {['draw', 'type'].map(m => (
                        <button key={m} onClick={() => { setMode(m); clearCanvas(); }} style={{
                            flex: 1, padding: '10px', borderRadius: '10px', cursor: 'pointer',
                            border: mode === m ? '1px solid #3B82F6' : '1px solid #E2E8F0',
                            background: mode === m ? '#EFF6FF' : '#F8FAFC',
                            color: mode === m ? '#1D4ED8' : '#64748B',
                            fontWeight: 600, fontSize: '13px', transition: 'all 0.2s'
                        }}>
                            {m === 'draw' ? 'Dessiner' : 'Taper au clavier'}
                        </button>
                    ))}
                </div>

                {/* Canvas zone */}
                <div style={{
                    border: '1px solid #CBD5E1', borderRadius: '12px', overflow: 'hidden',
                    background: '#FAFAFA', position: 'relative', marginBottom: '20px',
                    cursor: mode === 'draw' ? 'crosshair' : 'default', height: '160px'
                }}>
                    <canvas
                        ref={canvasRef}
                        width={500}
                        height={160}
                        style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
                        onMouseDown={startDraw}
                        onMouseMove={draw}
                        onMouseUp={stopDraw}
                        onMouseLeave={stopDraw}
                        onTouchStart={startDraw}
                        onTouchMove={draw}
                        onTouchEnd={stopDraw}
                    />
                    {!hasSignature && (
                        <div style={{
                            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', color: '#94A3B8', fontSize: '14px',
                            pointerEvents: 'none', userSelect: 'none'
                        }}>
                            {mode === 'draw' ? 'Dessinez votre signature ici' : 'Saisissez votre nom ci-dessous'}
                        </div>
                    )}
                </div>

                {/* Type input */}
                {mode === 'type' && (
                    <input
                        type="text"
                        value={typedName}
                        onChange={e => setTypedName(e.target.value)}
                        placeholder={clientName || 'Votre nom complet'}
                        style={{
                            width: '100%', padding: '12px 16px', borderRadius: '10px',
                            border: '1px solid #CBD5E1', fontSize: '15px', fontFamily: 'Georgia, serif',
                            fontStyle: 'italic', color: '#1E3A8A', boxSizing: 'border-box',
                            marginBottom: '20px', outline: 'none'
                        }}
                    />
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={clearCanvas} style={{
                        padding: '12px 20px', borderRadius: '10px', border: '1px solid #E2E8F0',
                        background: '#FFFFFF', color: '#64748B', fontWeight: 600, fontSize: '14px',
                        cursor: 'pointer', transition: 'background 0.2s'
                    }}>
                        Effacer
                    </button>
                    <button
                        onClick={handleValidate}
                        disabled={!hasSignature || isSaving}
                        style={{
                            flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                            background: hasSignature && !isSaving ? '#3B82F6' : '#94A3B8',
                            color: '#FFFFFF', fontWeight: 600, fontSize: '14px', cursor: hasSignature && !isSaving ? 'pointer' : 'not-allowed',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            transition: 'background 0.2s'
                        }}
                    >
                        {isSaving ? 'Validation...' : 'Valider la signature'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
