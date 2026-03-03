import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Tarifs from './pages/Tarifs';
import Villes from './pages/Villes';
import Services from './pages/Services';
import About from './pages/About';
import ConnexionPage from './pages/Connexion';
import EspaceClient from './pages/EspaceClient';
import Admin from './pages/Admin';
import Souscription from './pages/Souscription';
import ScrollToTop from './components/ScrollToTop';

/* Route protégée : redirige vers /connexion si non connecté */
function ProtectedRoute({ children }) {
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

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
