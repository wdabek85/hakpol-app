import { useStore } from '../store.jsx';
import { KONTA, KONTA_COLORS } from '../utils/constants.js';

const btn = { padding: '6px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 };

export default function Dashboard({ goToModel, setTab }) {
  const { models, eanBankByModel, stats, eanValidation, getAvailableEans } = useStore();

  const emptyModels = models.filter(m => !m.auta?.length);
  const modelsWithDupEan = models.filter(m => m.auta?.some(a => a.warianty?.some(w => w.ean && w.aktywny && eanValidation.dupEans.has(w.ean.trim()))));
  const modelsWithDupOferty = models.filter(m => m.auta?.some(a => a.warianty?.some(w => w.duplikat_id)));
  const newModels = models.filter(m => m.uwagi?.includes('🆕'));
  const modelsWithUwagiList = models.filter(m => m.uwagi && !m.uwagi.includes('🆕'));
  const missingEanModels = models.filter(m => m.auta?.length > 0 && m.auta.some(a => a.warianty?.some(w => w.aktywny && !w.ean)));
  const bankModelsWithFree = Object.keys(eanBankByModel).filter(k => getAvailableEans(k).length > 0).sort();

  const allOk = modelsWithDupEan.length === 0 && modelsWithDupOferty.length === 0 &&
    Object.keys(eanValidation.bankConflicts).length === 0 && stats.wrongModelEanList.length === 0 &&
    missingEanModels.length === 0 && modelsWithUwagiList.length === 0 && newModels.length === 0;

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 20 }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <h2 style={{ fontSize: 20, color: '#1a365d', marginBottom: 16 }}>🏠 Panel główny</h2>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Modeli', value: models.length, icon: '📦', color: '#3182ce' },
            { label: 'Z autami', value: stats.modelsWithAuta, icon: '🚗', color: '#38a169' },
            { label: 'Pustych', value: emptyModels.length, icon: '⬜', color: emptyModels.length ? '#e53e3e' : '#38a169' },
            { label: 'Wariantów', value: stats.totalVar, icon: '🔌', color: '#6b46c1' },
            { label: 'EAN %', value: stats.totalVar ? Math.round(stats.filledEan / stats.totalVar * 100) + '%' : '—', icon: '📊', color: '#d69e2e' },
            { label: 'Bank EAN', value: stats.totalBankEans, icon: '📋', color: '#3182ce' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#718096' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Alerts */}
        <AlertSection title="🆕 Nowe modele z banku EAN" items={newModels} color="#2b6cb0" bg="#ebf4ff" border="#bee3f8"
          desc="Automatycznie utworzone po wklejeniu EAN-ów. Dodaj auta!"
          renderItem={m => `${m.nr_kat} (${(eanBankByModel[m.nr_kat] || []).length} EAN)`}
          goToModel={goToModel} />

        <AlertSection title={`🔴 EAN-y pod ZŁYM modelem (${stats.wrongModelEanList.length})`}
          show={stats.wrongModelEanList.length > 0} color="#c53030" bg="#fff5f5" border="#e53e3e" borderWidth={2}
          desc="EAN-y przypisane do ofert jednego modelu, ale w banku producenta należą do innego!">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {stats.wrongModelEanList.map((x, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'white', borderRadius: 4, border: '1px solid #feb2b2', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#c53030', fontSize: 12 }}>{x.ean}</span>
                <span style={{ fontSize: 11, color: '#718096' }}>użyty w</span>
                <button onClick={() => goToModel(models.find(m => m.nr_kat === x.usedIn)?.id)}
                  style={{ ...btn, background: '#fed7d7', color: '#c53030', fontSize: 11, padding: '2px 8px' }}>
                  ✗ {x.usedIn} → {x.auto} → {x.wiazka}
                </button>
                <span style={{ fontSize: 11, color: '#718096' }}>ale należy do</span>
                {x.belongsTo.map(b => (
                  <span key={b} style={{ background: '#c6f6d5', color: '#276749', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>✓ {b}</span>
                ))}
              </div>
            ))}
          </div>
        </AlertSection>

        <AlertSection title={`⚠️ Zduplikowane EAN-y (${stats.dupEanCount})`} items={modelsWithDupEan} color="#c53030" bg="#fff5f5" border="#feb2b2"
          desc="Te same EAN-y użyte w różnych wariantach — do naprawy!" btnBg="#e53e3e" goToModel={goToModel} />

        <AlertSection title={`🗑 Duplikaty ofert (${stats.totalDuplikaty})`} items={modelsWithDupOferty} color="#c53030" bg="#fff5f5" border="#feb2b2"
          btnBg="#c53030" goToModel={goToModel} />

        {Object.keys(eanValidation.bankConflicts).length > 0 && (
          <div style={{ background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: 8, padding: 14, marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, color: '#c53030', marginBottom: 8 }}>🔴 EAN-y w banku wielu modeli ({Object.keys(eanValidation.bankConflicts).length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {Object.entries(eanValidation.bankConflicts).map(([ean, ms]) => (
                <div key={ean} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', background: 'white', borderRadius: 4, border: '1px solid #feb2b2' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#c53030', fontSize: 12 }}>{ean}</span>
                  <span style={{ fontSize: 11, color: '#718096' }}>→</span>
                  {ms.map(m => (
                    <button key={m} onClick={() => setTab('eanbank')}
                      style={{ ...btn, background: '#fed7d7', color: '#c53030', fontSize: 11, padding: '2px 8px' }}>{m}</button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        <AlertSection title={`📝 Brakujące EAN-y (${missingEanModels.length})`} items={missingEanModels} color="#c05621" bg="#fffaf0" border="#feebc8"
          desc="Mają auta ale nie wszystkie warianty mają EAN."
          renderItem={m => {
            const missing = m.auta.reduce((s, a) => s + (a.warianty || []).filter(w => w.aktywny && !w.ean).length, 0);
            const bankFree = getAvailableEans(m.nr_kat).length;
            return { label: `${m.nr_kat} (-${missing}${bankFree ? ` / +${bankFree}` : ''})`, bg: bankFree >= missing ? '#38a169' : '#dd6b20' };
          }}
          goToModel={goToModel} />

        <AlertSection title={`📝 Uwagi (${modelsWithUwagiList.length})`} show={modelsWithUwagiList.length > 0} color="#b7791f" bg="#fffaf0" border="#feebc8">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {modelsWithUwagiList.map(m => (
              <div key={m.id} onClick={() => goToModel(m.id)}
                style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer', padding: '6px 10px', background: '#fffef5', borderRadius: 6, border: '1px solid #feebc8' }}>
                <span style={{ fontWeight: 700, color: '#c05621', fontSize: 13, minWidth: 50 }}>{m.nr_kat}</span>
                <span style={{ fontSize: 12, color: '#744210' }}>{m.uwagi}</span>
              </div>
            ))}
          </div>
        </AlertSection>

        {emptyModels.length > 0 && (
          <div style={{ background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, color: '#718096', marginBottom: 8 }}>⬜ Modele bez aut ({emptyModels.length})</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {emptyModels.map(m => (
                <button key={m.id} onClick={() => goToModel(m.id)}
                  style={{ ...btn, background: '#edf2f7', color: '#4a5568', fontSize: 11, padding: '4px 8px' }}>{m.nr_kat}</button>
              ))}
            </div>
          </div>
        )}

        {bankModelsWithFree.length > 0 && (
          <div style={{ background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: 8, padding: 14, marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, color: '#276749', marginBottom: 8 }}>📋 Wolne EAN-y w banku</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {bankModelsWithFree.map(k => (
                <span key={k} style={{ fontSize: 12, background: '#c6f6d5', padding: '3px 8px', borderRadius: 4, color: '#276749' }}>
                  {k}: <b>{getAvailableEans(k).length}</b> wolnych
                </span>
              ))}
            </div>
          </div>
        )}

        {allOk && (
          <div style={{ textAlign: 'center', padding: 40, background: '#f0fff4', borderRadius: 8, border: '1px solid #c6f6d5' }}>
            <p style={{ fontSize: 32 }}>✅</p>
            <p style={{ fontSize: 16, color: '#276749', fontWeight: 600, marginTop: 8 }}>Wszystko w porządku!</p>
          </div>
        )}

        {/* Per-account stats */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginTop: 12 }}>
          <h3 style={{ fontSize: 14, color: '#2d3748', marginBottom: 10 }}>📊 Oferty per konto</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {KONTA.map(k => {
              const field = k === 'SMA_Imiola' ? 'oferty_sma' : k === 'Zahakowani_pl' ? 'oferty_zahakowani' : 'oferty_autohaki';
              const cnt = models.reduce((s, m) => s + (m.auta || []).reduce((s2, a) => s2 + (a.warianty || []).filter(w => w.aktywny && w[field]).length, 0), 0);
              return (
                <div key={k} style={{ padding: '10px 14px', background: '#f7fafc', borderRadius: 6, borderLeft: `4px solid ${KONTA_COLORS[k]}` }}>
                  <div style={{ fontSize: 11, color: '#718096' }}>{k.replace(/_/g, ' ')}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: KONTA_COLORS[k] }}>{cnt}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Generic alert section component
function AlertSection({ title, items, show, color, bg, border, borderWidth, desc, renderItem, btnBg, goToModel, children }) {
  const visible = show !== undefined ? show : items?.length > 0;
  if (!visible) return null;

  return (
    <div style={{ background: bg, border: `${borderWidth || 1}px solid ${border}`, borderRadius: 8, padding: 14, marginBottom: 12 }}>
      <h3 style={{ fontSize: 14, color, marginBottom: 8 }}>{title}</h3>
      {desc && <p style={{ fontSize: 12, color: '#4a5568', marginBottom: 8 }}>{desc}</p>}
      {children || (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {items?.map(m => {
            const r = renderItem ? renderItem(m) : null;
            const label = typeof r === 'string' ? r : r?.label || m.nr_kat;
            const itemBg = r?.bg || btnBg || color;
            return (
              <button key={m.id} onClick={() => goToModel(m.id)}
                style={{ padding: '4px 10px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: itemBg, color: 'white' }}>
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
