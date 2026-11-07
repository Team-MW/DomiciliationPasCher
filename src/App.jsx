
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, useEffect } from 'react';
import { SignedIn, SignedOut, useUser } from '@clerk/clerk-react';
import Navbar from './components/Navbar/Navbar';
import { isAdminEmail } from './utils/adminEmail';
import { lazyWithRetry } from './utils/lazyWithRetry';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import Footer from './components/Footer/Footer';
import Home from './pages/Home/Home';
import ScrollToTop from './components/ScrollToTop/ScrollToTop';
import Landing from './pages/Landing/Landing';
import CookieConsent from './components/CookieConsent/CookieConsent';

import { useTranslation } from './i18n/LanguageContext';
import { DialogProvider } from './components/AppDialog/DialogProvider.jsx';

/* Pages chargées à la demande : l'accueil et /offre (pages d'arrivée Google Ads) restent dans le bundle
   principal ; les autres sont préchargées dès que le navigateur est libre (navigation instantanée). */
const loadTarifs = () => import('./pages/Tarifs/Tarifs');
const loadSouscription = () => import('./pages/Souscription/Souscription');
const loadVilles = () => import('./pages/Villes/Villes');
const loadServices = () => import('./pages/Services/Services');
const loadAbout = () => import('./pages/About/About');
const loadConnexion = () => import('./pages/Connexion/Connexion');
const loadInscription = () => import('./pages/Connexion/Inscription');
const loadRendezVous = () => import('./pages/RendezVous/RendezVous');
const Tarifs = lazyWithRetry(loadTarifs);
const Villes = lazyWithRetry(loadVilles);
const Services = lazyWithRetry(loadServices);
const About = lazyWithRetry(loadAbout);
const ConnexionPage = lazyWithRetry(loadConnexion);
const InscriptionPage = lazyWithRetry(loadInscription);
const RendezVous = lazyWithRetry(loadRendezVous);
const EspaceClient = lazyWithRetry(() => import('./pages/EspaceClient/EspaceClient'));
const Admin = lazyWithRetry(() => import('./pages/Admin/Admin'));
const Souscription = lazyWithRetry(loadSouscription);

/** Ordre de préchargement : parcours d'achat d'abord. */
export const PREFETCH_PAGES = [loadTarifs, loadSouscription, loadConnexion, loadVilles, loadServices, loadRendezVous, loadAbout, loadInscription];

function usePrefetchPages() {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    // Pas de préchargement en mode « économie de données » ou en 2G.
    const conn = navigator.connection;
    if (conn?.saveData || /2g/.test(conn?.effectiveType || '')) return undefined;
    let cancelled = false;
    const idle = window.requestIdleCallback || ((cb) => window.setTimeout(cb, 2000));
    const run = async () => {
      for (const load of PREFETCH_PAGES) {
        if (cancelled) return;
        try { await load(); } catch { /* hors ligne : la page se chargera au clic */ }
      }
    };
    const handle = idle(run, { timeout: 4000 });
    return () => {
      cancelled = true;
      (window.cancelIdleCallback || window.clearTimeout)(handle);
    };
  }, []);
}
const MentionsLegales = lazyWithRetry(() => import('./pages/MentionsLegales/MentionsLegales'));
const CGV = lazyWithRetry(() => import('./pages/CGV/CGV'));
const Confidentialite = lazyWithRetry(() => import('./pages/Confidentialite/Confidentialite'));
const FichesPratiques = lazyWithRetry(() => import('./pages/FichesPratiques/FichesPratiques'));
const FicheDetail = lazyWithRetry(() => import('./pages/FicheDetail/FicheDetail'));

/* Chargement d'une page : rien pendant 250 ms (pas de flash si c'est rapide), puis un indicateur discret. */
function LoadingFallback({ inline = false }) {
  const { tr } = useTranslation();
  return (
    <div className={`dpc-page-loading${inline ? ' is-inline' : ''}`} role="status" aria-live="polite">
      <span className="dpc-page-loading-spinner" aria-hidden="true" />
      <span className="sr-only">{tr.common.loading}</span>
    </div>
  );
}

/* Redirection interne uniquement (anti open-redirect). */
function safeAppRedirect(raw) {
  if (!raw || typeof raw !== 'string') return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}

/* Route protégée : redirige vers /connexion si non connecté */
export function ProtectedRoute({ children }) {
  const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true';

  if (isPreview) return children;

  const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const loginTo = `/connexion?redirect=${encodeURIComponent(next)}`;

  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut><Navigate to={loginTo} replace /></SignedOut>
    </>
  );
}

/* Route publique uniquement : redirige vers l'app si déjà connecté */
export function PublicOnlyRoute({ children }) {
  const { user, isLoaded } = useUser();
  
  if (isLoaded && user) {
    if (isAdminEmail(user.primaryEmailAddress?.emailAddress)) {
      return <Navigate to="/app/admin" replace />;
    }
    const redirect = safeAppRedirect(new URLSearchParams(window.location.search).get('redirect'));
    return <Navigate to={redirect || '/app/espace-client'} replace />;
  }

  return children;
}

/* Redirection qui conserve ?tab= et les flags Stripe (booking_success, etc.). */
export function RedirectKeepSearch({ to }) {
  const { search, hash } = useLocation();
  return <Navigate to={`${to}${search}${hash}`} replace />;
}
function PublicLayout({ children }) {
  return (
    <>
      <Navbar />
      {/* Suspense ici : la barre de navigation reste affichée pendant le chargement de la page. */}
      <Suspense fallback={<LoadingFallback inline />}>{children}</Suspense>
      <Footer />
    </>
  );
}

function App() {
  usePrefetchPages();
  return (
    <BrowserRouter>
      <DialogProvider>
      <ScrollToTop />
      <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Pages publiques (Vitrine) */}
          <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
          <Route path="/tarifs" element={<PublicLayout><Tarifs /></PublicLayout>} />
          <Route path="/villes" element={<PublicLayout><Villes /></PublicLayout>} />
          <Route path="/services" element={<PublicLayout><Services /></PublicLayout>} />
          <Route path="/a-propos" element={<PublicLayout><About /></PublicLayout>} />
          <Route path="/about" element={<Navigate to="/a-propos" replace />} />

          {/* Prise de rendez-vous (Calendly) */}
          <Route path="/rendez-vous" element={<PublicLayout><RendezVous /></PublicLayout>} />

          {/* Landing Page (Ads) */}
          <Route path="/offre" element={<Landing />} />

          {/* Connexion — publique uniquement */}
          <Route path="/connexion" element={<PublicOnlyRoute><ConnexionPage /></PublicOnlyRoute>} />
          <Route path="/inscription" element={<PublicOnlyRoute><InscriptionPage /></PublicOnlyRoute>} />

          {/* Espace client — protégé, préfixe /app/ */}
          <Route
            path="/app/espace-client"
            element={
              <ProtectedRoute>
                <EspaceClient />
              </ProtectedRoute>
            }
          />

          {/* Admin — protégé par email dans le composant, préfixe /app/ */}
          <Route path="/app/admin" element={<Admin />} />

          {/* Souscription — publique uniquement */}
          <Route path="/souscription" element={<PublicOnlyRoute><Souscription /></PublicOnlyRoute>} />

          {/* Mentions Légales */}
          <Route path="/mentions-legales" element={<PublicLayout><MentionsLegales /></PublicLayout>} />
          <Route path="/cgv" element={<PublicLayout><CGV /></PublicLayout>} />
          <Route path="/confidentialite" element={<PublicLayout><Confidentialite /></PublicLayout>} />

          {/* Fiches Pratiques */}
          <Route path="/fiches-pratiques" element={<PublicLayout><FichesPratiques /></PublicLayout>} />
          <Route path="/fiches-pratiques/:slug" element={<PublicLayout><FicheDetail /></PublicLayout>} />

          {/* Redirections legacy */}
          <Route path="/espace-client" element={<RedirectKeepSearch to="/app/espace-client" />} />
          <Route path="/admin" element={<RedirectKeepSearch to="/app/admin" />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
      <CookieConsent />
      </DialogProvider>
    </BrowserRouter>
  );
}

export default App;

