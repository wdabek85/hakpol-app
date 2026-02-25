import { useState, useRef, useCallback, memo } from 'react';
import { useStore } from '../store.jsx';
import { WIAZKI, KONTA, KONTA_COLORS } from '../utils/constants.js';
import AutoCard from './AutoCard.jsx';

const btn = { padding: '6px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 };

function ModelDetail({ activeModel }) {
  const { models, updateModel, deleteModel, addAuto, eanBankByModel, getAvailableEans } = useStore();
  const [newAutoInput, setNewAutoInput] = useState('');
  const autoInputRef = useRef(null);

  const model = models.find(m => m.id === activeModel);

  const handleAddAuto = useCallback(async () => {
    if (!newAutoInput.trim() || !model) return;
    await addAuto(model.id, newAutoInput);
    setNewAutoInput('');
    setTimeout(() => autoInputRef.current?.focus(), 50);
  }, [newAutoInput, model, addAuto]);

  const handleDeleteModel = useCallback(async () => {
    if (!confirm('Na pewno usunąć ten model i wszystkie jego auta?')) return;
    await deleteModel(model.id);
  }, [model, deleteModel]);

  const handleUwagiChange = useCallback(async (e) => {
    await updateModel(model.id, { uwagi: e.target.value });
  }, [model, updateModel]);

  if (!model) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0aec0' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 48 }}>👈</p>
          <p style={{ fontSize: 16 }}>Wybierz model z listy</p>
          <div style={{ marginTop: 40, background: 'white', borderRadius: 8, padding: 20, maxWidth: 500, textAlign: 'left', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: 14, color: '#2d3748', marginBottom: 10 }}>💡 Jak korzystać:</h3>
            <ol style={{ fontSize: 13, color: '#4a5568', lineHeight: 1.8, paddingLeft: 20 }}>
              <li>Wklej <b>EAN-y od producenta</b> w "📋 Bank EAN"</li>
              <li>Wybierz <b>model haka</b> z listy (np. C/029)</li>
              <li>Dodaj <b>auta</b> które pasują</li>
              <li>Kliknij <b>+N</b> przy EAN żeby auto-przypisać z banku</li>
              <li>Eksportuj do <b>CSV</b> gdy gotowe</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  const totalActiveVariants = (model.auta || []).reduce((s, a) => s + (a.warianty || []).filter(w => w.aktywny).length, 0);
  const bankTotal = (eanBankByModel[model.nr_kat] || []).length;
  const bankFree = getAvailableEans(model.nr_kat).length;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ fontSize: 22, color: '#1a365d' }}>
          📦 {model.nr_kat}
          <span style={{ fontSize: 13, fontWeight: 400, color: '#718096', marginLeft: 10 }}>
            {model.auta?.length || 0} aut · {totalActiveVariants} wariantów
          </span>
        </h2>
        <button onClick={handleDeleteModel} style={{ ...btn, background: '#fed7d7', color: '#c53030', fontSize: 11 }}>🗑 Usuń</button>
      </div>

      {/* Uwagi */}
      <div style={{ background: model.uwagi ? '#fffbeb' : 'white', border: model.uwagi ? '1px solid #f6e05e' : '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: model.uwagi ? '#b7791f' : '#a0aec0' }}>📝 Uwagi / TODO:</span>
          {model.uwagi && <span style={{ fontSize: 10, background: '#fefcbf', color: '#975a16', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>!</span>}
        </div>
        <textarea value={model.uwagi || ''} onChange={handleUwagiChange}
          placeholder="Np. usunąć duplikaty 7 PIN, poprawić EAN-y..."
          rows={model.uwagi && model.uwagi.split('\n').length > 2 ? 4 : 2}
          style={{ width: '100%', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', background: model.uwagi ? '#fffef5' : 'white' }} />
      </div>

      {/* Add auto */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: '#4a5568', whiteSpace: 'nowrap' }}>➕ Auto:</span>
        <input ref={autoInputRef} value={newAutoInput} onChange={e => setNewAutoInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddAuto()}
          placeholder="Np. Citroen Berlingo II L1 2008-2018"
          style={{ flex: 1, padding: '7px 10px', border: '1px solid #cbd5e0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
        <button onClick={handleAddAuto} style={{ ...btn, background: '#3182ce', color: 'white' }}>Dodaj</button>
      </div>

      {(!model.auta || model.auta.length === 0) && (
        <div style={{ textAlign: 'center', padding: 30, color: '#a0aec0', background: 'white', borderRadius: 8, border: '1px dashed #cbd5e0' }}>
          <p>Dodaj pierwsze auto powyżej.</p>
        </div>
      )}

      {/* Auta */}
      {model.auta?.map(auto => (
        <AutoCard key={auto.id} auto={auto} model={model} />
      ))}

      {/* Summary */}
      {model.auta?.length > 0 && (
        <div style={{ marginTop: 14, padding: '10px 14px', background: '#ebf4ff', borderRadius: 8, fontSize: 12, color: '#2d3748' }}>
          <div>
            <b>📊 {model.nr_kat}:</b> {model.auta.length} aut · <b>{totalActiveVariants} ofert</b>
            {bankTotal > 0 && <span> | 📋 Bank: <b style={{ color: '#38a169' }}>{bankFree} wolnych</b> / {bankTotal}</span>}
          </div>
          <div style={{ marginTop: 6, display: 'flex', gap: 14 }}>
            {KONTA.map(k => {
              const field = k === 'SMA_Imiola' ? 'oferty_sma' : k === 'Zahakowani_pl' ? 'oferty_zahakowani' : 'oferty_autohaki';
              const cnt = (model.auta || []).reduce((s, a) => s + (a.warianty || []).filter(w => w.aktywny && w[field]).length, 0);
              return <span key={k} style={{ color: KONTA_COLORS[k] }}>● {k.replace(/_/g, ' ')}: <b>{cnt}</b></span>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ModelDetail);
