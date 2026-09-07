import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function formatAddressValue(feature, searchType) {
    const p = feature?.properties || {};
    if (searchType === 'municipality') {
        return [p.postcode, p.city || p.name].filter(Boolean).join(' ');
    }
    return p.label || '';
}

export function formatSuggestionLabel(feature, searchType) {
    const p = feature?.properties || {};
    if (searchType === 'municipality') {
        return [p.postcode, p.city || p.name].filter(Boolean).join(' ');
    }
    return p.label || '';
}

/**
 * Autocomplétion d'adresse via l'API Adresse (data.gouv.fr), comme sur la souscription.
 * searchType="municipality" limite la recherche aux communes (code postal + ville).
 */
export default function AddressAutocomplete({
    value,
    onChange,
    onSelect,
    placeholder,
    inputStyle,
    noResultsLabel = 'Aucune adresse trouvée',
    searchType,
    minChars = 3,
}) {
    const [suggestions, setSuggestions] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [coords, setCoords] = useState(null);
    const skipNextFetch = useRef(false);
    const timer = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => () => clearTimeout(timer.current), []);

    const updateCoords = () => {
        const el = inputRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        setCoords({ top: r.bottom + 6, left: r.left, width: r.width });
    };

    useEffect(() => {
        if (!isOpen) return;
        updateCoords();
        const onReposition = () => updateCoords();
        window.addEventListener('scroll', onReposition, true);
        window.addEventListener('resize', onReposition);
        return () => {
            window.removeEventListener('scroll', onReposition, true);
            window.removeEventListener('resize', onReposition);
        };
    }, [isOpen, suggestions]);

    const fetchAddresses = (query) => {
        onChange(query);
        if (skipNextFetch.current) {
            skipNextFetch.current = false;
            return;
        }
        clearTimeout(timer.current);
        if (!query || query.trim().length < minChars) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }
        timer.current = setTimeout(async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    q: query.trim(),
                    limit: '6',
                });
                if (searchType) params.set('type', searchType);
                const res = await fetch(`https://api-adresse.data.gouv.fr/search/?${params.toString()}`);
                const data = await res.json();
                setSuggestions(data.features || []);
                setIsOpen(true);
            } catch (e) {
                console.error(e);
                setSuggestions([]);
            } finally {
                setLoading(false);
            }
        }, 250);
    };

    const handleSelect = (feature) => {
        const next = formatAddressValue(feature, searchType);
        skipNextFetch.current = true;
        onChange(next);
        onSelect?.(feature);
        setSuggestions([]);
        setIsOpen(false);
    };

    const dropdown = isOpen && (suggestions.length > 0 || loading) && coords && typeof document !== 'undefined'
        ? createPortal(
            <ul
                role="listbox"
                style={{
                    position: 'fixed',
                    top: coords.top,
                    left: coords.left,
                    width: coords.width,
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    zIndex: 100010,
                    boxShadow: '0 10px 24px rgba(15, 23, 42, 0.12)',
                    maxHeight: '240px',
                    overflowY: 'auto',
                    boxSizing: 'border-box',
                }}
            >
                {loading && suggestions.length === 0 && (
                    <li style={{ padding: '12px 14px', fontSize: '14px', color: '#94a3b8' }}>…</li>
                )}
                {suggestions.map((s) => (
                    <li
                        key={s.properties.id}
                        role="option"
                        onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
                        style={{ padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '14px', color: '#0f172a' }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                        {formatSuggestionLabel(s, searchType)}
                    </li>
                ))}
                {!loading && suggestions.length === 0 && (
                    <li style={{ padding: '12px 14px', fontSize: '14px', color: '#94a3b8' }}>{noResultsLabel}</li>
                )}
            </ul>,
            document.body
        )
        : null;

    return (
        <div style={{ position: 'relative' }}>
            <input
                ref={inputRef}
                type="text"
                autoComplete="off"
                value={value}
                onChange={(e) => fetchAddresses(e.target.value)}
                onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                placeholder={placeholder}
                style={inputStyle}
            />
            {dropdown}
        </div>
    );
}
