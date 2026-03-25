import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
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

/* Route protégée : redirige vers /connexion si non connecté (sauf si mode preview) */
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

/* Layout public (avec Navbar + Footer) */
function PublicLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Pages publiques avec Navbar + Footer */}
          <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
          <Route path="/tarifs" element={<PublicLayout><Tarifs /></PublicLayout>} />
          <Route path="/villes" element={<PublicLayout><Villes /></PublicLayout>} />
          <Route path="/services" element={<PublicLayout><Services /></PublicLayout>} />
          <Route path="/a-propos" element={<PublicLayout><About /></PublicLayout>} />
          <Route path="/about" element={<PublicLayout><About /></PublicLayout>} />

          {/* Page de connexion — pleine page, sans Navbar/Footer */}
          <Route path="/connexion" element={<ConnexionPage />} />

          {/* Espace client — protégé, sans Navbar/Footer (layout propre) */}
          <Route
            path="/espace-client"
            element={
              <ProtectedRoute>
                <EspaceClient />
              </ProtectedRoute>
            }
          />

          {/* ⚠️ Admin — URL directe uniquement, JAMAIS lié dans le site public */}
          <Route path="/admin" element={<Admin />} />

          {/* Souscription — formulaire multi-étapes pleine page */}
          <Route path="/souscription" element={<Souscription />} />

          {/* Mentions Légales */}
          <Route path="/mentions-legales" element={<PublicLayout><MentionsLegales /></PublicLayout>} />

          {/* Fiches Pratiques */}
          <Route path="/fiches-pratiques" element={<PublicLayout><FichesPratiques /></PublicLayout>} />
          <Route path="/fiches-pratiques/:slug" element={<PublicLayout><FicheDetail /></PublicLayout>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
