import React, { useRef, useState, useEffect } from 'react';

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
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
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
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
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
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
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

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px'
        }}>
            <div style={{
                background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '560px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.3)', overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
                    padding: '24px 28px', color: 'white'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                <span style={{ fontSize: '22px' }}>✍️</span>
                                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>Signature Électronique</h2>
                            </div>
                            <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                                Contrat de domiciliation — {clientData?.company || clientName}
                            </p>
                        </div>
                        <button onClick={onClose} style={{
                            background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '10px',
                            color: 'white', cursor: 'pointer', padding: '8px 10px', fontSize: '16px'
                        }}>✕</button>
                    </div>
                </div>

                <div style={{ padding: '24px 28px' }}>
                    {/* Info banner */}
                    <div style={{
                        background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px',
                        padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#1e40af',
                        display: 'flex', gap: '10px', alignItems: 'flex-start'
                    }}>
                        <span style={{ fontSize: '16px', flexShrink: 0 }}>ℹ️</span>
                        <span>En signant, vous acceptez le contrat de domiciliation commerciale et confirmez l'exactitude des informations de votre dossier.</span>
                    </div>

                    {/* Mode selector */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        {['draw', 'type'].map(m => (
                            <button key={m} onClick={() => { setMode(m); clearCanvas(); }} style={{
                                flex: 1, padding: '9px', borderRadius: '10px', cursor: 'pointer',
                                border: mode === m ? '2px solid #1e40af' : '2px solid #e2e8f0',
                                background: mode === m ? '#eff6ff' : '#f8fafc',
                                color: mode === m ? '#1e40af' : '#64748b',
                                fontWeight: 600, fontSize: '13px', transition: 'all 0.2s'
                            }}>
                                {m === 'draw' ? '✏️ Dessiner' : '⌨️ Taper mon nom'}
                            </button>
                        ))}
                    </div>

                    {/* Canvas zone */}
                    <div style={{
                        border: '2px dashed #cbd5e1', borderRadius: '14px', overflow: 'hidden',
                        background: '#fafafa', position: 'relative', marginBottom: '12px',
                        cursor: mode === 'draw' ? 'crosshair' : 'default'
                    }}>
                        <canvas
                            ref={canvasRef}
                            width={500}
                            height={150}
                            style={{ width: '100%', height: '150px', display: 'block', touchAction: 'none' }}
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
                                justifyContent: 'center', color: '#94a3b8', fontSize: '14px',
                                pointerEvents: 'none', userSelect: 'none'
                            }}>
                                {mode === 'draw' ? '↑ Dessinez votre signature ici' : '↓ Saisissez votre nom ci-dessous'}
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
                                border: '2px solid #e2e8f0', fontSize: '16px', fontFamily: 'Georgia, serif',
                                fontStyle: 'italic', color: '#1e3a8a', boxSizing: 'border-box',
                                marginBottom: '12px', outline: 'none'
                            }}
                        />
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                        <button onClick={clearCanvas} style={{
                            padding: '11px 18px', borderRadius: '10px', border: '1.5px solid #e2e8f0',
                            background: 'white', color: '#64748b', fontWeight: 600, fontSize: '13px',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                        }}>
                            🗑️ Effacer
                        </button>
                        <button
                            onClick={handleValidate}
                            disabled={!hasSignature || isSaving}
                            style={{
                                flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                                background: hasSignature && !isSaving
                                    ? 'linear-gradient(135deg, #1e40af, #0f172a)'
                                    : '#e2e8f0',
                                color: hasSignature && !isSaving ? 'white' : '#94a3b8',
                                fontWeight: 700, fontSize: '14px', cursor: hasSignature && !isSaving ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                transition: 'all 0.2s'
                            }}
                        >
                            {isSaving ? (
                                <>
                                    <span style={{
                                        width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)',
                                        borderTopColor: 'white', borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite', display: 'inline-block'
                                    }} />
                                    Signature en cours...
                                </>
                            ) : (
                                <>✅ Valider ma signature</>
                            )}
                        </button>
                    </div>

                    {/* Legal */}
                    <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginTop: '14px', marginBottom: 0, lineHeight: 1.5 }}>
                        🔒 Signature horodatée et enregistrée avec votre adresse e-mail · Valeur juridique en accord avec le règlement eIDAS
                    </p>
                </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
