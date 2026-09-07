// Traductions de l'espace client, découpées par onglet.
//
// L'espace client représente à lui seul plusieurs milliers de chaînes : les regrouper dans
// fr.js / en.js / ru.js rendait ces fichiers ingérables. Chaque module ci-dessous porte les
// trois langues d'un onglet, côte à côte, ce qui rend une traduction manquante visible d'un
// coup d'œil.
//
// Pour ajouter un onglet : créer le module puis l'enregistrer dans `sections`.

import shell from './shell.js';
import sidebar from './sidebar.js';
import overview from './overview.js';
import mail from './mail.js';
import address from './address.js';
import docs from './docs.js';
import subscription from './subscription.js';
import invoices from './invoices.js';
import payment from './payment.js';
import proAccount from './proAccount.js';
import messages from './messages.js';
import meeting from './meeting.js';
import help from './help.js';
import settings from './settings.js';

const sections = {
    shell,
    sidebar,
    overview,
    mail,
    address,
    docs,
    subscription,
    invoices,
    payment,
    proAccount,
    messages,
    meeting,
    help,
    settings,
};

/**
 * Assemble les traductions de l'espace client pour une langue.
 * Le français sert de secours pour toute section pas encore traduite, afin qu'une clé
 * manquante affiche du texte lisible plutôt que son identifiant.
 */
export default function espaceClient(lang) {
    const out = {};
    for (const [key, section] of Object.entries(sections)) {
        out[key] = { ...section.fr, ...(section[lang] || {}) };
    }
    return out;
}

export { sections };
