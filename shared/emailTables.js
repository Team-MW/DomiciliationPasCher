export const EMAIL_LOGS_DDL = `CREATE TABLE IF NOT EXISTS email_logs (
    id VARCHAR(64) PRIMARY KEY,
    to_email VARCHAR(512) NOT NULL,
    client_email VARCHAR(255),
    type VARCHAR(64),
    subject VARCHAR(512),
    status VARCHAR(16) NOT NULL,
    error TEXT,
    sent_at VARCHAR(64) NOT NULL,
    INDEX idx_email_logs_to (to_email(191)),
    INDEX idx_email_logs_client (client_email)
)`;

/** Tables créées avant l'ajout de client_email (email concerné, même si l'envoi part à l'admin). */
export const EMAIL_LOGS_ADD_CLIENT_COLUMN = 'ALTER TABLE email_logs ADD COLUMN client_email VARCHAR(255) NULL';

export const SOUSCRIPTION_LEADS_DDL = `CREATE TABLE IF NOT EXISTS souscription_leads (
    email VARCHAR(255) PRIMARY KEY,
    token VARCHAR(64) NOT NULL,
    first_name VARCHAR(255),
    plan VARCHAR(64),
    step INT DEFAULT 0,
    draft LONGTEXT,
    created_at VARCHAR(64) NOT NULL,
    updated_at VARCHAR(64),
    reminders_sent INT DEFAULT 0,
    last_reminder_at VARCHAR(64),
    completed_at VARCHAR(64),
    unsubscribed_at VARCHAR(64),
    UNIQUE KEY uniq_souscription_leads_token (token)
)`;

/** Relances d'inscription inachevée : 1 h, J+1, J+3 après la saisie de l'email. */
export const LEAD_REMINDER_OFFSETS_MS = [60 * 60 * 1000, 24 * 60 * 60 * 1000, 72 * 60 * 60 * 1000];
