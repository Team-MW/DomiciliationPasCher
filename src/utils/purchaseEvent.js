/**
 * Événement « purchase » poussé dans le dataLayer (Google Tag Manager → Google Ads / Analytics) sur la page
 * de confirmation de paiement, avec le montant réel et les données client (conversions améliorées).
 * Une seule fois par session de paiement, même si l'écran se recharge ou que l'effet React tourne deux fois.
 */
const PUSHED_KEY = '__dpcPurchasePushed';

export function buildPurchaseEvent(sessionId, order) {
    if (!order || !sessionId) return null;
    const value = Number(order.value);
    const userData = {};
    if (order.email) userData.email = String(order.email).trim().toLowerCase();
    if (order.phone_number) userData.phone_number = String(order.phone_number);
    return {
        event: 'purchase',
        value: Number.isFinite(value) ? value : 0,
        currency: String(order.currency || 'EUR').toUpperCase(),
        transaction_id: String(order.transaction_id || sessionId),
        ...(Object.keys(userData).length ? { user_data: userData } : {}),
    };
}

export function pushPurchaseEvent(sessionId, order, target = globalThis.window) {
    const payload = buildPurchaseEvent(sessionId, order);
    if (!payload || !target) return false;
    try {
        if (target[PUSHED_KEY] === sessionId) return false;
        target[PUSHED_KEY] = sessionId;
        target.dataLayer = target.dataLayer || [];
        target.dataLayer.push(payload);
        return true;
    } catch {
        return false;
    }
}
