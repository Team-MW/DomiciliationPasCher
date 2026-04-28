import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { SignedIn, SignedOut, useUser } from '@clerk/clerk-react';
import Navbar from './components/Navbar/Navbar';
import Footer from './components/Footer/Footer';
import Home from './pages/Home/Home';
import Tarifs from './pages/Tarifs/Tarifs';
import Villes from './pages/Villes/Villes';
import Services from './pages/Services/Services';
import About from './pages/About/About';
import ConnexionPage from './pages/Connexion/Connexion';
import ScrollToTop from './components/ScrollToTop/ScrollToTop';

/* Lazy loading pour les grosses pages */
const EspaceClient = lazy(() => import('./pages/EspaceClient/EspaceClient'));
const Admin = lazy(() => import('./pages/Admin/Admin'));
const Souscription = lazy(() => import('./pages/Souscription/Souscription'));
const MentionsLegales = lazy(() => import('./pages/MentionsLegales/MentionsLegales'));
const FichesPratiques = lazy(() => import('./pages/FichesPratiques/FichesPratiques'));
const FicheDetail = lazy(() => import('./pages/FicheDetail/FicheDetail'));

/* Loading fallback */
const PageLoader = () => (
  <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFF', color: '#1A56DB', fontWeight: 700 }}>
    Chargement...
  </div>
);

/* Route protégée : redirige vers /connexion si non connecté */
function ProtectedRoute({ children }) {
  const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true';

  if (isPreview) return children;

  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut><Navigate to="/connexion" replace /></SignedOut>
    </>
  );
}

/* Route publique uniquement : redirige vers l'app si déjà connecté */
function PublicOnlyRoute({ children }) {
  const { user, isLoaded } = useUser();
  
  if (isLoaded && user) {
    const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'mwcrea.agency@gmail.com';
    if (user.primaryEmailAddress?.emailAddress === ADMIN_EMAIL) {
      return <Navigate to="/app/admin" replace />;
    }
    return <Navigate to="/app/espace-client" replace />;
  }

  return children;
}

/* Layout public (avec Navbar + Footer) */
function PublicLayout({ children }) {
  return (
    <PublicOnlyRoute>
      <Navbar />
      {children}
      <Footer />
    </PublicOnlyRoute>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Pages publiques (Vitrine) */}
          <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
          <Route path="/tarifs" element={<PublicLayout><Tarifs /></PublicLayout>} />
          <Route path="/villes" element={<PublicLayout><Villes /></PublicLayout>} />
          <Route path="/services" element={<PublicLayout><Services /></PublicLayout>} />
          <Route path="/a-propos" element={<PublicLayout><About /></PublicLayout>} />
          <Route path="/about" element={<PublicLayout><About /></PublicLayout>} />

          {/* Connexion — publique uniquement */}
          <Route path="/connexion" element={<PublicOnlyRoute><ConnexionPage /></PublicOnlyRoute>} />

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

          {/* Fiches Pratiques */}
          <Route path="/fiches-pratiques" element={<PublicLayout><FichesPratiques /></PublicLayout>} />
          <Route path="/fiches-pratiques/:slug" element={<PublicLayout><FicheDetail /></PublicLayout>} />

          {/* Redirections legacy */}
          <Route path="/espace-client" element={<Navigate to="/app/espace-client" replace />} />
          <Route path="/admin" element={<Navigate to="/app/admin" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;

