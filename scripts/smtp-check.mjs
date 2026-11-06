#!/usr/bin/env node
/**
 * Test SMTP local : configuration, connexion au serveur, et (option) envoi réel.
 *
 *   npm run test:smtp                       → vérifie la config + la connexion (aucun email envoyé)
 *   npm run test:smtp -- --send             → envoie aussi un email de test à SMTP_USER
 *   npm run test:smtp -- --send a@b.fr      → envoie l'email de test à a@b.fr
 *   npm run test:smtp -- --send --template  → envoie le vrai modèle « compte créé » du site
 *
 * Lit process.env puis .env.local / .env (comme les fonctions api/ en local).
 * N'affiche jamais le mot de passe. Code de sortie 0 = tout est OK, 1 = échec.
 */
import nodemailer from 'nodemailer';
import { readServerEnv } from '../api/_env.js';

const args = process.argv.slice(2);
const sendIdx = args.indexOf('--send');
const wantSend = sendIdx !== -1;
const explicitTo = wantSend && args[sendIdx + 1] && !args[sendIdx + 1].startsWith('--') ? args[sendIdx + 1] : null;
const useTemplate = args.includes('--template');

const results = [];
const record = (name, ok, detail = '') => {
    results.push({ name, ok, detail });
    console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const mask = (email) => (email ? email.replace(/^(.{2}).*(@.*)$/, '$1•••$2') : '');

async function main() {
    console.log('— Test SMTP (configuration locale) —\n');

    const host = readServerEnv('SMTP_HOST');
    const port = Number(readServerEnv('SMTP_PORT') || 465);
    const user = readServerEnv('SMTP_USER');
    const pass = readServerEnv('SMTP_PASS');
    const from = readServerEnv('SMTP_FROM') || user;

    record('SMTP_HOST défini', Boolean(host), host || 'manquant');
    record('SMTP_PORT valide', [465, 587, 25, 2525].includes(port), String(port));
    record('SMTP_USER défini', Boolean(user), user ? mask(user) : 'manquant');
    record('SMTP_PASS défini', Boolean(pass), pass ? `${pass.length} caractères` : 'manquant');
    if (pass && /\s/.test(pass)) record('SMTP_PASS sans espaces', false, 'retirez les espaces du mot de passe d’application');
    if (host === 'smtp.gmail.com' && pass && pass.replace(/\s/g, '').length !== 16) {
        record('Mot de passe d’application Gmail (16 caractères)', false, 'Gmail exige un mot de passe d’application, pas le mot de passe du compte');
    }
    if (host === 'smtp.gmail.com' && from && user && from.toLowerCase() !== user.toLowerCase()) {
        record('SMTP_FROM = SMTP_USER (Gmail)', false, 'Gmail remplace tout autre expéditeur par SMTP_USER');
    }

    if (!host || !user || !pass) {
        console.log('\nConfiguration incomplète : remplissez .env.local (voir .env.example).');
        return finish();
    }

    const transporter = nodemailer.createTransport({
        host, port, secure: port === 465, auth: { user, pass },
        connectionTimeout: 15000, greetingTimeout: 15000,
    });

    const t0 = Date.now();
    try {
        await transporter.verify();
        record('Connexion + authentification au serveur', true, `${host}:${port} en ${Date.now() - t0} ms`);
    } catch (error) {
        const hint = /535|Username and Password not accepted|BadCredentials/i.test(String(error?.message))
            ? ' (identifiants refusés : mot de passe d’application invalide ou révoqué)'
            : '';
        record('Connexion + authentification au serveur', false, `${error?.code || ''} ${error?.message || error}${hint}`.trim());
        return finish();
    }

    if (!wantSend) {
        console.log('\n(Aucun email envoyé. Ajoutez --send pour tester un envoi réel.)');
        return finish();
    }

    const to = explicitTo || user;
    try {
        if (useTemplate) {
            const { deliverEmail } = await import('../api/_email-core.js');
            const info = await deliverEmail({
                type: 'account_created', email: to, nom: 'Client Test (smtp-check)',
                plan: 'essentiel', frequence: 'mensuel', paymentToken: 'smtp-check',
            }, { baseUrl: 'http://localhost:5173' });
            record('Envoi du modèle « compte créé »', Boolean(info?.accepted?.length), `→ ${mask(to)}`);
        } else {
            const info = await transporter.sendMail({
                from: `"Domiciliation Pas Cher" <${from}>`, to,
                subject: `Test SMTP — ${new Date().toLocaleString('fr-FR')}`,
                text: 'Email de test envoyé par scripts/smtp-check.mjs. Vous pouvez le supprimer.',
            });
            record('Envoi d’un email de test', info.accepted.length > 0, `→ ${mask(to)} (${String(info.response).slice(0, 40)})`);
        }
    } catch (error) {
        record('Envoi d’un email de test', false, error?.message || String(error));
    }
    return finish();
}

function finish() {
    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n${failed ? `❌ ${failed} échec(s)` : '✅ SMTP opérationnel'}`);
    process.exit(failed ? 1 : 0);
}

main().catch((error) => {
    console.error('Erreur inattendue :', error);
    process.exit(1);
});
