import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Tarifs from './pages/Tarifs';
import Villes from './pages/Villes';
import Services from './pages/Services';
import About from './pages/About';
import ScrollToTop from './components/ScrollToTop';

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tarifs" element={<Tarifs />} />
        <Route path="/villes" element={<Villes />} />
        <Route path="/services" element={<Services />} />
        <Route path="/a-propos" element={<About />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

export default App;
