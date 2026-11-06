import nodemailer from 'nodemailer';
import { readServerEnv } from './_env.js';

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

export function getSmtpConfig() {
    const host = readServerEnv('SMTP_HOST');
    const port = readServerEnv('SMTP_PORT') || 465;
    const user = readServerEnv('SMTP_USER');
    const pass = readServerEnv('SMTP_PASS');
    const from = readServerEnv('SMTP_FROM') || user;

    if (!host || !user || !pass) return null;
    return { host, port: Number(port), user, pass, from };
}

/** Retourne un transporteur nodemailer, ou null si le SMTP n'est pas configuré.
 *  Configuration actuelle : Gmail (smtp.gmail.com:465, mot de passe d'application Google).
 *  SMTP_FROM doit être l'adresse Gmail elle-même : Gmail réécrit tout autre expéditeur.
 */
export function getTransporter() {
    const config = getSmtpConfig();
    if (!config) return null;
    return nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: { user: config.user, pass: config.pass },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
    });
}
