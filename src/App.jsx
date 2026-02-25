import { useState, useEffect } from 'react';
import { supabase } from './supabase.js';
import { StoreProvider, useStore } from './store.jsx';
import Header from './components/Header.jsx';
import Dashboard from './components/Dashboard.jsx';
import Catalog from './components/Catalog.jsx';
import EanBank from './components/EanBank.jsx';
import AllegroSync from './components/AllegroSync.jsx';
import Login from './components/Login.jsx';

function AppInner() {
  const [tab, setTab] = useState('dashboard');
  const [activeModel, setActiveModel] = useState(null);
  const [allegroKonto, setAllegroKonto] = useState(null);
  const { loading } = useStore();

  const goToModel = (modelId) => {
    setActiveModel(modelId);
    setTab('catalog');
  };

  const goToAllegro = (konto) => {
    setAllegroKonto(konto || null);
    setTab('allegro');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 32 }}>🔧</p>
          <p style={{ fontSize: 16, color: '#718096', marginTop: 8 }}>Ładowanie danych...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header tab={tab} setTab={setTab} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {tab === 'dashboard' && <Dashboard goToModel={goToModel} setTab={setTab} goToAllegro={goToAllegro} />}
        {tab === 'catalog' && <Catalog activeModel={activeModel} setActiveModel={setActiveModel} />}
        {tab === 'eanbank' && <EanBank />}
        {tab === 'allegro' && <AllegroSync initialKonto={allegroKonto} />}
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Loading state — checking session
  if (session === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 32 }}>🔧</p>
          <p style={{ fontSize: 16, color: '#718096', marginTop: 8 }}>Sprawdzanie sesji...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <StoreProvider>
      <AppInner />
    </StoreProvider>
  );
}
