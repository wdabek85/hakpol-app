import { useStore } from '../store.jsx';
import { supabase } from '../supabase.js';
import { exportCSV, exportJSON } from '../utils/csvExport.js';

const btn = { padding: '6px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 };

export default function Header({ tab, setTab }) {
  const { models, eanBank, eanBankByModel, saving, stats } = useStore();

  const handleExportCSV = () => exportCSV(models, eanBankByModel);
  const handleExportJSON = () => exportJSON(models, eanBankByModel);
  const handleLogout = () => supabase.auth.signOut();

  const totalBankEans = eanBank.length;

  return (
    <div style={{ background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)', color: 'white', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>🔧 HakPol — Mapa Ofert Allegro</h1>
        <p style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
          {models.length} modeli ({stats.modelsWithAuta} z autami) · {stats.totalAuta} aut · {stats.totalVar} wariantów · EAN: {stats.filledEan}/{stats.totalVar}
          {stats.dupEanCount > 0 && <span style={{ color: '#fc8181' }}> · ⚠️ {stats.dupEanCount} zdupl. EAN</span>}
          {stats.wrongModelEanList.length > 0 && <span style={{ color: '#fc8181' }}> · 🔴 {stats.wrongModelEanList.length} złych EAN</span>}
          {stats.totalDuplikaty > 0 && <span style={{ color: '#fc8181' }}> · 🗑 {stats.totalDuplikaty} dupl.</span>}
          {stats.modelsWithUwagi > 0 && <span style={{ color: '#fbd38d' }}> · 📝 {stats.modelsWithUwagi} z uwagami</span>}
          {saving && <span style={{ marginLeft: 8, color: '#fbd38d' }}>💾</span>}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.15)', borderRadius: 6, marginRight: 8 }}>
          {[
            { id: 'dashboard', label: '🏠 Start' },
            { id: 'catalog', label: '📦 Katalog' },
            { id: 'eanbank', label: '📋 Bank EAN' },
          ].map((t, i, arr) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ ...btn,
                background: tab === t.id ? 'white' : 'transparent',
                color: tab === t.id ? '#1a365d' : 'rgba(255,255,255,0.8)',
                borderRadius: i === 0 ? '6px 0 0 6px' : i === arr.length - 1 ? '0 6px 6px 0' : 0,
                position: 'relative',
              }}>
              {t.label}
              {t.id === 'eanbank' && totalBankEans > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -4, background: '#38a169', color: 'white', fontSize: 9, padding: '1px 5px', borderRadius: 10, fontWeight: 700 }}>{totalBankEans}</span>
              )}
            </button>
          ))}
        </div>
        <button onClick={handleExportCSV} style={{ ...btn, background: '#38a169', color: 'white' }}>📥 CSV</button>
        <button onClick={handleExportJSON} style={{ ...btn, background: '#2b6cb0', color: 'white' }}>💾 Backup</button>
        <button onClick={handleLogout} style={{ ...btn, background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)' }}>🚪 Wyloguj</button>
      </div>
    </div>
  );
}
