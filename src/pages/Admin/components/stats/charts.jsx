/**
 * Graphiques SVG légers pour l'onglet admin « Statistiques » (aucune dépendance).
 * Règles suivies : barres fines (≤ 24 px) à bout arrondi, lignes 2 px, écarts de 2 px entre segments,
 * grille discrète, légende dès 2 séries, étiquettes directes rares, infobulle au survol, vue tableau.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

export const SERIES_COLORS = ['var(--viz-1)', 'var(--viz-2)', 'var(--viz-3)', 'var(--viz-4)'];

export const fmtNumber = (n, digits = 0) => (n === null || n === undefined || Number.isNaN(Number(n))
    ? '—'
    : Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: digits }));

export const fmtValue = (n, unit = '') => {
    if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
    const digits = Number.isInteger(Number(n)) ? 0 : 2;
    return `${fmtNumber(n, digits)}${unit === '%' ? ' %' : unit ? ` ${unit}` : ''}`;
};

/** Graduation « propre » : 1, 2, 5 × 10^k au-dessus du max. */
function niceMax(max) {
    if (!(max > 0)) return 4;
    const pow = 10 ** Math.floor(Math.log10(max));
    const n = max / pow;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    const top = step * pow;
    return top === max ? top * 1.25 : top;
}

function useWidth(ref, fallback = 600) {
    const [width, setWidth] = useState(fallback);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        const apply = () => setWidth(Math.max(240, Math.round(el.getBoundingClientRect().width || fallback)));
        if (typeof ResizeObserver !== 'function') {
            const id = requestAnimationFrame(apply);
            return () => cancelAnimationFrame(id);
        }
        const ro = new ResizeObserver(apply); // livre une première mesure dès l'observation
        ro.observe(el);
        return () => ro.disconnect();
    }, [ref, fallback]);
    return width;
}

function roundedTop(x, y, w, h, r) {
    if (h <= 0 || w <= 0) return '';
    const rr = Math.min(r, w / 2, h);
    return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

function Tooltip({ state, children }) {
    if (!state) return null;
    return (
        <div className="viz-tooltip" style={{ left: state.x, top: state.y }} role="status">
            {children}
        </div>
    );
}

export function Legend({ items, shape = 'rect' }) {
    if (!items || items.length < 2) return null;
    return (
        <ul className="viz-legend" aria-label="Légende">
            {items.map((it) => (
                <li key={it.name}>
                    <span className={`viz-legend-key ${shape}`} style={{ background: it.color }} aria-hidden="true" />
                    <span>{it.name}</span>
                </li>
            ))}
        </ul>
    );
}

/** Carte de graphique : titre, sous-titre, bascule « Tableau », zone de rendu. */
export function ChartCard({ title, subtitle, table, children, wide = false, actions = null }) {
    const [showTable, setShowTable] = useState(false);
    return (
        <section className={`viz-card${wide ? ' viz-card-wide' : ''}`} aria-label={title}>
            <header className="viz-card-head">
                <div>
                    <h3>{title}</h3>
                    {subtitle && <p>{subtitle}</p>}
                </div>
                <div className="viz-card-actions">
                    {actions}
                    {table && (
                        <button type="button" className={`viz-toggle${showTable ? ' on' : ''}`} onClick={() => setShowTable((v) => !v)} aria-pressed={showTable}>
                            {showTable ? 'Graphique' : 'Tableau'}
                        </button>
                    )}
                </div>
            </header>
            {showTable && table ? <DataTable columns={table.columns} rows={table.rows} /> : children}
        </section>
    );
}

export function DataTable({ columns, rows }) {
    return (
        <div className="viz-table-wrap">
            <table className="viz-table">
                <thead><tr>{columns.map((c) => <th key={c.key} scope="col">{c.label}</th>)}</tr></thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i}>{columns.map((c) => <td key={c.key} className={typeof r[c.key] === 'number' ? 'num' : ''}>{typeof r[c.key] === 'number' ? fmtValue(r[c.key], c.unit) : (r[c.key] ?? '—')}</td>)}</tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** Indicateur chiffré. */
export function StatTile({ label, value, unit = '', delta = null, hint = '', tone, hero = false }) {
    const up = typeof delta === 'number' && delta > 0;
    const down = typeof delta === 'number' && delta < 0;
    return (
        <div className={`viz-tile${hero ? ' hero' : ''}${tone ? ` tone-${tone}` : ''}`}>
            <div className="viz-tile-label">{label}</div>
            <div className="viz-tile-value">{fmtValue(value, unit)}</div>
            {(typeof delta === 'number' || hint) && (
                <div className="viz-tile-foot">
                    {typeof delta === 'number' && <span className={`viz-delta ${up ? 'up' : down ? 'down' : 'flat'}`}>{up ? '▲' : down ? '▼' : '='} {Math.abs(delta)} %</span>}
                    {hint && <span className="viz-tile-hint">{hint}</span>}
                </div>
            )}
        </div>
    );
}

/** Colonnes (groupées ou empilées). series: [{ name, values[], color }]. */
export function BarChart({ labels, series, stacked = false, unit = '', height = 220, labelLast = true }) {
    const ref = useRef(null);
    const width = useWidth(ref);
    const [hover, setHover] = useState(null);
    const pad = { l: 44, r: 12, t: 18, b: 28 };
    const innerW = width - pad.l - pad.r;
    const innerH = height - pad.t - pad.b;
    const n = labels.length;
    const totals = labels.map((_, i) => (stacked ? series.reduce((s, sr) => s + (sr.values[i] || 0), 0) : Math.max(...series.map((sr) => sr.values[i] || 0))));
    const yMax = niceMax(Math.max(...totals, 0));
    const band = n ? innerW / n : innerW;
    const gap = 2;
    const perBar = stacked ? 1 : series.length;
    const barW = Math.min(24, Math.max(4, (band * 0.7 - gap * (perBar - 1)) / perBar));
    const groupW = barW * perBar + gap * (perBar - 1);
    const y = (v) => pad.t + innerH - (v / yMax) * innerH;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => yMax * f);
    const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(innerW / 58))));
    const colors = series.map((s, i) => s.color || SERIES_COLORS[i % SERIES_COLORS.length]);

    return (
        <div className="viz-plot" ref={ref} onMouseLeave={() => setHover(null)}>
            <svg width={width} height={height} role="img" aria-label={`${series.map((s) => s.name).join(', ')} par mois`}>
                {ticks.map((t) => (
                    <g key={t}>
                        <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} className="viz-grid" />
                        <text x={pad.l - 6} y={y(t) + 4} className="viz-tick" textAnchor="end">{fmtNumber(t)}</text>
                    </g>
                ))}
                {labels.map((lab, i) => {
                    const x0 = pad.l + i * band + (band - groupW) / 2;
                    let acc = 0;
                    return (
                        <g key={lab}>
                            {hover?.index === i && <rect x={pad.l + i * band} y={pad.t} width={band} height={innerH} className="viz-band-hover" />}
                            {series.map((sr, k) => {
                                const v = sr.values[i] || 0;
                                if (stacked) {
                                    const top = y(acc + v);
                                    const bottom = y(acc) - (acc > 0 ? gap : 0);
                                    acc += v;
                                    const h = Math.max(0, bottom - top);
                                    const isTop = k === series.length - 1 || series.slice(k + 1).every((s2) => !(s2.values[i] > 0));
                                    return <path key={sr.name} d={isTop ? roundedTop(x0, top, barW, h, 4) : `M${x0},${top} h${barW} v${h} h${-barW} Z`} fill={colors[k]} opacity={hover && hover.index !== i ? 0.55 : 1} />;
                                }
                                const bx = x0 + k * (barW + gap);
                                return <path key={sr.name} d={roundedTop(bx, y(v), barW, innerH + pad.t - y(v), 4)} fill={colors[k]} opacity={hover && hover.index !== i ? 0.55 : 1} />;
                            })}
                            {labelLast && i === n - 1 && totals[i] > 0 && (
                                <text x={x0 + groupW / 2} y={y(totals[i]) - 6} className="viz-direct" textAnchor="middle">{fmtValue(totals[i], unit)}</text>
                            )}
                            {i % every === 0 && <text x={pad.l + i * band + band / 2} y={height - 8} className="viz-tick" textAnchor="middle">{lab}</text>}
                            <rect
                                x={pad.l + i * band} y={pad.t} width={band} height={innerH} fill="transparent"
                                onMouseMove={(e) => { const r = ref.current.getBoundingClientRect(); setHover({ index: i, x: e.clientX - r.left, y: e.clientY - r.top }); }}
                                onFocus={() => setHover({ index: i, x: pad.l + i * band + band / 2, y: pad.t })}
                                tabIndex={0}
                                aria-label={`${lab} : ${series.map((sr) => `${sr.name} ${fmtValue(sr.values[i] || 0, unit)}`).join(', ')}`}
                            />
                        </g>
                    );
                })}
            </svg>
            <Tooltip state={hover}>
                {hover && (
                    <>
                        <div className="viz-tooltip-title">{labels[hover.index]}</div>
                        {series.map((sr, k) => (
                            <div key={sr.name} className="viz-tooltip-row">
                                <span className="viz-tooltip-key" style={{ background: colors[k] }} aria-hidden="true" />
                                <strong>{fmtValue(sr.values[hover.index] || 0, unit)}</strong>
                                <span>{sr.name}</span>
                            </div>
                        ))}
                        {stacked && series.length > 1 && <div className="viz-tooltip-total">Total {fmtValue(totals[hover.index], unit)}</div>}
                    </>
                )}
            </Tooltip>
            <Legend items={series.map((s, i) => ({ name: s.name, color: colors[i] }))} />
        </div>
    );
}

/** Courbes. series: [{ name, values[], color }] ; les valeurs null sont ignorées. */
export function LineChart({ labels, series, unit = '', height = 220, area = true }) {
    const ref = useRef(null);
    const width = useWidth(ref);
    const [hover, setHover] = useState(null);
    const pad = { l: 44, r: 40, t: 18, b: 28 };
    const innerW = width - pad.l - pad.r;
    const innerH = height - pad.t - pad.b;
    const n = labels.length;
    const all = series.flatMap((s) => s.values.filter((v) => v !== null && v !== undefined));
    const yMax = niceMax(Math.max(...all, 0));
    const x = (i) => pad.l + (n > 1 ? (i * innerW) / (n - 1) : innerW / 2);
    const y = (v) => pad.t + innerH - (v / yMax) * innerH;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => yMax * f);
    const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(innerW / 58))));
    const colors = series.map((s, i) => s.color || SERIES_COLORS[i % SERIES_COLORS.length]);
    const paths = useMemo(() => series.map((s) => {
        // Une valeur manquante (null) interrompt le tracé ; la suivante repart d'un « M ».
        let d = '';
        let pen = false;
        s.values.forEach((v, i) => {
            if (v === null || v === undefined) { pen = false; return; }
            d += `${pen ? 'L' : 'M'}${x(i)},${y(v)} `;
            pen = true;
        });
        return d.trim();
    }), [series, width, height, yMax]); // eslint-disable-line react-hooks/exhaustive-deps

    const onMove = (e) => {
        const r = ref.current.getBoundingClientRect();
        const px = e.clientX - r.left;
        let best = 0;
        let bestD = Infinity;
        for (let i = 0; i < n; i += 1) { const d = Math.abs(x(i) - px); if (d < bestD) { bestD = d; best = i; } }
        setHover({ index: best, x: px, y: e.clientY - r.top });
    };

    return (
        <div className="viz-plot" ref={ref} onMouseLeave={() => setHover(null)}>
            <svg width={width} height={height} role="img" aria-label={`${series.map((s) => s.name).join(', ')} dans le temps`} onMouseMove={onMove}>
                {ticks.map((t) => (
                    <g key={t}>
                        <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} className="viz-grid" />
                        <text x={pad.l - 6} y={y(t) + 4} className="viz-tick" textAnchor="end">{fmtNumber(t)}</text>
                    </g>
                ))}
                {labels.map((lab, i) => (i % every === 0 ? <text key={lab} x={x(i)} y={height - 8} className="viz-tick" textAnchor="middle">{lab}</text> : null))}
                {hover && <line x1={x(hover.index)} x2={x(hover.index)} y1={pad.t} y2={pad.t + innerH} className="viz-crosshair" />}
                {series.map((s, k) => {
                    const last = [...s.values].map((v, i) => [v, i]).filter(([v]) => v !== null && v !== undefined).pop();
                    return (
                        <g key={s.name}>
                            {area && series.length === 1 && last && (
                                <path d={`${paths[k]} L${x(last[1])},${y(0)} L${x(s.values.findIndex((v) => v !== null && v !== undefined))},${y(0)} Z`} fill={colors[k]} opacity="0.1" />
                            )}
                            <path d={paths[k]} fill="none" stroke={colors[k]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                            {last && (
                                <>
                                    <circle cx={x(last[1])} cy={y(last[0])} r="4" fill={colors[k]} stroke="var(--viz-surface)" strokeWidth="2" />
                                    {series.length <= 4 && <text x={x(last[1]) + 8} y={y(last[0]) + 4} className="viz-direct">{fmtValue(last[0], unit)}</text>}
                                </>
                            )}
                            {hover && s.values[hover.index] !== null && s.values[hover.index] !== undefined && (
                                <circle cx={x(hover.index)} cy={y(s.values[hover.index])} r="4" fill={colors[k]} stroke="var(--viz-surface)" strokeWidth="2" />
                            )}
                        </g>
                    );
                })}
            </svg>
            <Tooltip state={hover}>
                {hover && (
                    <>
                        <div className="viz-tooltip-title">{labels[hover.index]}</div>
                        {series.map((s, k) => (
                            <div key={s.name} className="viz-tooltip-row">
                                <span className="viz-tooltip-key line" style={{ background: colors[k] }} aria-hidden="true" />
                                <strong>{fmtValue(s.values[hover.index], unit)}</strong>
                                <span>{s.name}</span>
                            </div>
                        ))}
                    </>
                )}
            </Tooltip>
            <Legend items={series.map((s, i) => ({ name: s.name, color: colors[i] }))} shape="line" />
        </div>
    );
}

/** Un tout découpé en parts (barre segmentée haute, 28 px). */
export function SegmentedBar({ parts, unit = '' }) {
    const [hover, setHover] = useState(null);
    const ref = useRef(null);
    const total = parts.reduce((s, p) => s + (p.value || 0), 0);
    const colors = parts.map((p, i) => p.color || SERIES_COLORS[i % SERIES_COLORS.length]);
    return (
        <div className="viz-plot" ref={ref} onMouseLeave={() => setHover(null)}>
            <div className="viz-segmented" role="img" aria-label={parts.map((p) => `${p.name} : ${fmtValue(p.value, unit)}${total ? ` (${Math.round((p.value / total) * 100)} %)` : ''}`).join(', ')}>
                {total === 0 && <div className="viz-empty">Aucune donnée</div>}
                {parts.map((p, i) => {
                    if (!(p.value > 0)) return null;
                    const share = p.value / total;
                    return (
                        <div
                            key={p.name}
                            className="viz-segment"
                            style={{ flexGrow: share, background: colors[i], opacity: hover !== null && hover.i !== i ? 0.55 : 1 }}
                            onMouseMove={(e) => { const r = ref.current.getBoundingClientRect(); setHover({ i, x: e.clientX - r.left, y: e.clientY - r.top }); }}
                            tabIndex={0}
                            onFocus={() => setHover({ i, x: 20, y: 0 })}
                            aria-label={`${p.name} : ${fmtValue(p.value, unit)}, ${Math.round(share * 100)} %`}
                        >
                            {share >= 0.12 && <span>{Math.round(share * 100)} %</span>}
                        </div>
                    );
                })}
            </div>
            <Tooltip state={hover}>
                {hover !== null && (
                    <div className="viz-tooltip-row">
                        <span className="viz-tooltip-key" style={{ background: colors[hover.i] }} aria-hidden="true" />
                        <strong>{fmtValue(parts[hover.i].value, unit)}</strong>
                        <span>{parts[hover.i].name} · {total ? Math.round((parts[hover.i].value / total) * 100) : 0} %</span>
                    </div>
                )}
            </Tooltip>
            <Legend items={parts.map((p, i) => ({ name: `${p.name} (${fmtValue(p.value, unit)})`, color: colors[i] }))} />
        </div>
    );
}

/** Barres horizontales (classement, entonnoir). items: [{ name, value, hint }]. */
export function HBarChart({ items, unit = '', color = SERIES_COLORS[0] }) {
    const max = Math.max(...items.map((i) => i.value || 0), 1);
    return (
        <ul className="viz-hbars" aria-label="Classement">
            {items.map((it) => (
                <li key={it.name} className="viz-hbar-row" title={`${it.name} : ${fmtValue(it.value, unit)}${it.hint ? ` · ${it.hint}` : ''}`}>
                    <span className="viz-hbar-label">{it.name}</span>
                    <span className="viz-hbar-track">
                        <span className="viz-hbar-fill" style={{ width: `${Math.max(it.value > 0 ? 2 : 0, ((it.value || 0) / max) * 100)}%`, background: color }} />
                    </span>
                    <span className="viz-hbar-value">{fmtValue(it.value, unit)}{it.hint && <em> {it.hint}</em>}</span>
                </li>
            ))}
        </ul>
    );
}

/** Carte de chaleur jour × heure (une seule teinte, clair → foncé). */
export function Heatmap({ rows, cols, matrix, unitLabel = 'inscription(s)' }) {
    const ref = useRef(null);
    const [hover, setHover] = useState(null);
    const max = Math.max(1, ...matrix.flat());
    const steps = ['var(--viz-seq-0)', 'var(--viz-seq-1)', 'var(--viz-seq-2)', 'var(--viz-seq-3)', 'var(--viz-seq-4)'];
    const colorOf = (v) => (v <= 0 ? steps[0] : steps[Math.min(4, 1 + Math.floor(((v - 1) / max) * 4))]);
    return (
        <div className="viz-plot" ref={ref} onMouseLeave={() => setHover(null)}>
            <div className="viz-heat" role="img" aria-label="Répartition par jour et heure">
                <div className="viz-heat-corner" />
                {cols.map((c) => <div key={c} className="viz-heat-col">{c % 3 === 0 ? `${c} h` : ''}</div>)}
                {rows.map((r, ri) => (
                    <React.Fragment key={r}>
                        <div className="viz-heat-row">{r}</div>
                        {cols.map((c, ci) => (
                            <div
                                key={c}
                                className="viz-heat-cell"
                                style={{ background: colorOf(matrix[ri][ci]), outline: hover && hover.ri === ri && hover.ci === ci ? '2px solid var(--viz-text)' : 'none' }}
                                onMouseMove={(e) => { const b = ref.current.getBoundingClientRect(); setHover({ ri, ci, x: e.clientX - b.left, y: e.clientY - b.top }); }}
                                tabIndex={0}
                                onFocus={() => setHover({ ri, ci, x: 40, y: 0 })}
                                aria-label={`${r} ${c} h : ${matrix[ri][ci]} ${unitLabel}`}
                            />
                        ))}
                    </React.Fragment>
                ))}
            </div>
            <div className="viz-heat-legend"><span>Peu</span>{steps.map((s) => <i key={s} style={{ background: s }} />)}<span>Beaucoup</span></div>
            <Tooltip state={hover}>
                {hover && <div className="viz-tooltip-row"><strong>{matrix[hover.ri][hover.ci]}</strong><span>{rows[hover.ri]} · {cols[hover.ci]} h · {unitLabel}</span></div>}
            </Tooltip>
        </div>
    );
}

/** Déclenche un téléchargement de texte (CSV). */
export function downloadText(filename, text, type = 'text/csv;charset=utf-8') {
    const blob = new Blob(['﻿', text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function useAutoRefresh(callback, everyMs) {
    useEffect(() => {
        if (!everyMs) return undefined;
        const id = setInterval(callback, everyMs);
        return () => clearInterval(id);
    }, [callback, everyMs]);
}
