const fs = require('fs');
const path = 'src/pages/Admin/components/DossierClient.jsx';
let content = fs.readFileSync(path, 'utf8');

// Injecter les hooks
const states = `
    const [isStripeSearchOpen, setIsStripeSearchOpen] = useState(false);
    const [stripeSearchQuery, setStripeSearchQuery] = useState('');
    const [stripeSearchResults, setStripeSearchResults] = useState([]);
    const [isStripeSearching, setIsStripeSearching] = useState(false);
`;
if (!content.includes('isStripeSearchOpen')) {
    content = content.replace(/const \[isSavingDetails, setIsSavingDetails\] = useState\(false\);\n/, `const [isSavingDetails, setIsSavingDetails] = useState(false);\n${states}`);
}

// Injecter les fonctions
const fns = `
    const handleSearchStripeCustomers = async () => {
        if (!stripeSearchQuery.trim()) return;
        setIsStripeSearching(true);
        try {
            const res = await fetch(\`/api/stripe-customers?query=\${encodeURIComponent(stripeSearchQuery)}\`);
            if (res.ok) {
                const data = await res.json();
                setStripeSearchResults(data.customers || []);
            } else {
                showAlert("Erreur lors de la recherche Stripe");
            }
        } catch (e) {
            console.error(e);
            showAlert("Erreur réseau");
        } finally {
            setIsStripeSearching(false);
        }
    };

    const handleLinkStripeCustomer = async (customerId) => {
        try {
            await adminDataService.updateClientExtraInfo(client.id, { stripe_customer_id: customerId });
            showAlert("Client Stripe lié avec succès !");
            setIsStripeSearchOpen(false);
            onUpdate();
        } catch (e) {
            showAlert("Erreur lors de la liaison");
        }
    };
`;
if (!content.includes('handleSearchStripeCustomers')) {
    content = content.replace('const handleSaveDetails = async () => {', fns + '\n    const handleSaveDetails = async () => {');
}

// Injecter l'UI dans case 'facturation'
const searchStr = `<div className="card-header" style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '16px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>Historique de facturation ({client.name})</h2>
                            {extra?.stripe_customer_id && (
                                <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: '#F1F5F9', borderRadius: '6px', fontSize: '12px', color: '#475569', border: '1px solid #E2E8F0' }}>
                                    <span style={{ fontWeight: 600 }}>ID Stripe:</span>
                                    <code style={{ fontFamily: 'monospace', color: '#0F172A' }}>{extra.stripe_customer_id}</code>
                                </div>
                            )}
                        </div>`;

const newHeader = `<div className="card-header" style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>Historique de facturation ({client.name})</h2>
                                {extra?.stripe_customer_id ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ padding: '4px 10px', background: '#F1F5F9', borderRadius: '6px', fontSize: '12px', color: '#475569', border: '1px solid #E2E8F0' }}>
                                            <span style={{ fontWeight: 600 }}>ID Stripe:</span>
                                            <code style={{ fontFamily: 'monospace', color: '#0F172A', marginLeft: '4px' }}>{extra.stripe_customer_id}</code>
                                        </div>
                                        <button 
                                            onClick={() => setIsStripeSearchOpen(!isStripeSearchOpen)}
                                            style={{ padding: '4px 8px', fontSize: '11px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }}
                                        >
                                            Modifier
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => setIsStripeSearchOpen(!isStripeSearchOpen)}
                                        style={{ padding: '6px 12px', fontSize: '12px', background: '#6366F1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                                    >
                                        🔗 Lier un compte Stripe
                                    </button>
                                )}
                            </div>
                            
                            {isStripeSearchOpen && (
                                <div style={{ marginTop: '16px', padding: '16px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                    <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#334155' }}>Rechercher un client Stripe</h4>
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                        <input 
                                            type="text" 
                                            placeholder="Nom ou Email" 
                                            value={stripeSearchQuery}
                                            onChange={e => setStripeSearchQuery(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleSearchStripeCustomers()}
                                            style={{ flex: 1, padding: '8px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px' }}
                                        />
                                        <button 
                                            onClick={handleSearchStripeCustomers}
                                            disabled={isStripeSearching}
                                            style={{ padding: '8px 16px', background: '#0F172A', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                                        >
                                            {isStripeSearching ? 'Recherche...' : 'Rechercher'}
                                        </button>
                                    </div>
                                    {stripeSearchResults.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {stripeSearchResults.map(sc => (
                                                <div key={sc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '6px' }}>
                                                    <div>
                                                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{sc.name || 'Sans nom'}</div>
                                                        <div style={{ fontSize: '11px', color: '#64748B' }}>{sc.email || 'Sans email'} • {sc.id}</div>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleLinkStripeCustomer(sc.id)}
                                                        style={{ padding: '6px 12px', fontSize: '11px', background: '#10B981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
                                                    >
                                                        Sélectionner
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '12px', color: '#64748B', textAlign: 'center', padding: '10px' }}>
                                            Aucun résultat
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>`;

content = content.replace(searchStr, newHeader);
fs.writeFileSync(path, content);
