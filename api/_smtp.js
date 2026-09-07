import nodemailer from 'nodemailer';
import fs from 'fs';

// Destinataires de toutes les notifications internes (nouveau client, nouveau message,
// demande de consultation, impayés). Surchargeable via ADMIN_EMAIL, séparés par des virgules.
const DEFAULT_ADMIN_EMAILS = [
    'contact@domiciliation-pas-cher.com',
    'mwcrea.agency@gmail.com',
];

export const ADMIN_EMAILS = (process.env.ADMIN_EMAIL
    ? process.env.ADMIN_EMAIL.split(',')
    : DEFAULT_ADMIN_EMAILS
).map(e => e.trim()).filter(Boolean);

// nodemailer accepte une liste séparée par des virgules dans le champ `to`.
export const ADMIN_EMAIL = ADMIN_EMAILS.join(', ');

// En local, les handlers sont importés par le plugin Vite qui ne charge pas .env.local.
const readEnvFile = () => {
    try {
        if (!fs.existsSync('.env.local')) return null;
        return fs.readFileSync('.env.local', 'utf-8');
    } catch {
        return null;
    }
};

export function getSmtpConfig() {
    let host = process.env.SMTP_HOST;
    let port = process.env.SMTP_PORT || 465;
    let user = process.env.SMTP_USER;
    let pass = process.env.SMTP_PASS;
    let from = process.env.SMTP_FROM || user;

    if (!user) {
        const content = readEnvFile();
        if (content) {
            const getEnv = (key) => {
                const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
                return match ? match[1].trim().replace(/^['"](.*)['"]$/, '$1') : null;
            };
            host = getEnv('SMTP_HOST') || host;
            port = getEnv('SMTP_PORT') || port;
            user = getEnv('SMTP_USER') || user;
            pass = getEnv('SMTP_PASS') || pass;
            from = getEnv('SMTP_FROM') || getEnv('SMTP_USER') || from;
        }
    }

    if (!host || !user || !pass) return null;
    return { host, port: Number(port), user, pass, from };
}

/** Retourne un transporteur nodemailer, ou null si le SMTP n'est pas configuré. */
export function getTransporter() {
    const config = getSmtpConfig();
    if (!config) return null;
    return nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: { user: config.user, pass: config.pass },
    });
}
