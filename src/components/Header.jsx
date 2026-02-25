import { useStore } from '../store.jsx';
import { supabase } from '../supabase.js';
import { exportCSV, exportJSON } from '../utils/csvExport.js';

const smallBtn = { padding: '5px 10px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 };

export default function Header({ tab, setTab }) {
  const { models, eanBank, eanBankByModel, saving, stats } = useStore();

  const handleExportCSV = () => exportCSV(models, eanBankByModel);
  const handleExportJSON = () => exportJSON(models, eanBankByModel);
  const handleLogout = () => supabase.auth.signOut();

  const totalBankEans = eanBank.length;

  const tabs = [
    { id: 'dashboard', label: '🏠 Start' },
    { id: 'catalog', label: '📦 Katalog' },
    { id: 'eanbank', label: '📋 Bank EAN', badge: totalBankEans > 0 ? totalBankEans : null },
    { id: 'allegro', label: '📊 Allegro' },
  ];

  return (
    <div style={{ flexShrink: 0 }}>
      {/* Górny pasek: tytuł + akcje */}
      <div style={{
        background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
        color: 'white',
        padding: '8px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>🔧 HakPol</h1>
          <p style={{ fontSize: 11, opacity: 0.8, marginTop: 2, margin: 0 }}>
            {models.length} modeli ({stats.modelsWithAuta} z autami) · {stats.totalAuta} aut · {stats.totalVar} war. · EAN: {stats.filledEan}/{stats.totalVar}
            {stats.dupEanCount > 0 && <span style={{ color: '#fc8181' }}> · ⚠️ {stats.dupEanCount} dupl. EAN</span>}
            {stats.wrongModelEanList.length > 0 && <span style={{ color: '#fc8181' }}> · 🔴 {stats.wrongModelEanList.length} złych</span>}
            {stats.totalDuplikaty > 0 && <span style={{ color: '#fc8181' }}> · 🗑 {stats.totalDuplikaty} dupl.</span>}
            {stats.modelsWithUwagi > 0 && <span style={{ color: '#fbd38d' }}> · 📝 {stats.modelsWithUwagi} uwagi</span>}
            {saving && <span style={{ marginLeft: 8, color: '#fbd38d' }}>💾</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={handleExportCSV} style={{ ...smallBtn, background: '#38a169', color: 'white' }}>📥 CSV</button>
          <button onClick={handleExportJSON} style={{ ...smallBtn, background: '#2b6cb0', color: 'white' }}>💾 Backup</button>
          <button onClick={handleLogout} style={{ ...smallBtn, background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)' }}>🚪 Wyloguj</button>
        </div>
      </div>

      {/* Dolny pasek: nawigacja */}
      <div style={{
        background: '#1e3a5f',
        display: 'flex',
        padding: '0 20px',
        gap: 2,
      }}>
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderBottom: active ? '3px solid #63b3ed' : '3px solid transparent',
                background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: active ? 'white' : 'rgba(255,255,255,0.55)',
                fontSize: 14,
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
              {t.badge && (
                <span style={{
                  marginLeft: 6,
                  background: '#38a169',
                  color: 'white',
                  fontSize: 10,
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontWeight: 700,
                }}>{t.badge}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
