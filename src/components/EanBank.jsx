import { useState, useMemo, memo } from 'react';
import { useStore } from '../store.jsx';

const btn = { padding: '6px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 };

function EanBank() {
  const { models, eanBank, eanBankByModel, eanValidation, addEansToBank, removeEanFromBank, clearBankForModel } = useStore();
  const [model, setModel] = useState('');
  const [paste, setPaste] = useState('');

  const handleAdd = async () => {
    if (!model.trim()) { alert('Wpisz numer modelu!'); return; }
    const result = await addEansToBank(model, paste);
    if (result?.error) { alert(result.error); return; }

    let msg = `Dodano ${result.added} nowych EAN-ów`;
    if (result.isNew) msg += '\n\n🆕 Model utworzony automatycznie w katalogu!';

    if (result.conflicts?.length > 0 || result.variantConflicts?.length > 0) {
      msg += '\n\n⚠️ KONFLIKTY:';
      result.conflicts?.forEach(c => { msg += `\n  📋 ${c.ean} → już w banku ${c.model}`; });
      result.variantConflicts?.forEach(c => { msg += `\n  📦 ${c.ean} → użyty w ${c.model} → ${c.auto} → ${c.wiazka}`; });
    }

    alert(msg);
    setPaste('');
    setModel('');
  };

  const usedEans = eanValidation.usedEans;
  const bankConflicts = eanValidation.bankConflicts;
  const bankModels = Object.keys(eanBankByModel).sort();

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 20 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ fontSize: 20, color: '#1a365d', marginBottom: 16 }}>📋 Bank EAN-ów od producenta</h2>

        {/* Paste area */}
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, color: '#2d3748', marginBottom: 10 }}>Wklej EAN-y</h3>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
            <div style={{ flex: '0 0 180px' }}>
              <label style={{ fontSize: 12, color: '#718096', display: 'block', marginBottom: 4 }}>Model haka (nowy lub istniejący):</label>
              <input list="model-list" value={model} onChange={e => setModel(e.target.value)}
                placeholder="Np. W/018 lub C/055"
                style={{ width: '100%', padding: 8, border: '1px solid #cbd5e0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
              <datalist id="model-list">
                {models.map(m => <option key={m.id} value={m.nr_kat} />)}
              </datalist>
              <p style={{ fontSize: 10, color: '#a0aec0', marginTop: 3 }}>💡 Nowy nr → model utworzy się automatycznie</p>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: '#718096', display: 'block', marginBottom: 4 }}>EAN-y (jeden na linię):</label>
              <textarea value={paste} onChange={e => setPaste(e.target.value)}
                placeholder={"5900000601274\n5900000601281\n5900000601298\n..."}
                rows={5}
                style={{ width: '100%', padding: 8, border: '1px solid #cbd5e0', borderRadius: 6, fontSize: 13, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
          </div>
          <button onClick={handleAdd} style={{ ...btn, background: '#3182ce', color: 'white' }}>➕ Dodaj do banku</button>
        </div>

        {/* Bank per model */}
        {bankModels.map(mod => {
          const allEans = eanBankByModel[mod] || [];
          const usedInModel = allEans.filter(e => usedEans.has(e));
          const available = allEans.filter(e => !usedEans.has(e));

          // Conflicts
          const conflictMap = {};
          allEans.forEach(ean => {
            if (bankConflicts[ean]) {
              conflictMap[ean] = bankConflicts[ean].filter(m => m !== mod);
            }
          });
          const conflictCount = Object.keys(conflictMap).length;

          return (
            <div key={mod} style={{ background: 'white', border: conflictCount ? '1px solid #feb2b2' : '1px solid #e2e8f0', borderRadius: 8, marginBottom: 10, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', background: conflictCount ? '#fff5f5' : '#f7fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#1a365d' }}>📦 {mod}</span>
                  <span style={{ fontSize: 12, color: '#718096', marginLeft: 10 }}>
                    {allEans.length} łącznie · <span style={{ color: '#38a169' }}>{available.length} wolnych</span> · <span style={{ color: '#a0aec0' }}>{usedInModel.length} użytych</span>
                    {conflictCount > 0 && <span style={{ color: '#e53e3e', fontWeight: 700 }}> · ⚠️ {conflictCount} konfliktów!</span>}
                  </span>
                </div>
                <button onClick={() => { if (confirm(`Usunąć wszystkie EAN-y z ${mod}?`)) clearBankForModel(mod); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#a0aec0' }}>🗑</button>
              </div>
              <div style={{ padding: '8px 14px', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {allEans.map(ean => {
                  const isUsed = usedEans.has(ean);
                  const hasConflict = conflictMap[ean];
                  return (
                    <div key={ean} title={hasConflict ? `⚠️ Też w: ${hasConflict.join(', ')}` : ''}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 8px', borderRadius: 4, fontSize: 11, fontFamily: 'monospace',
                        background: hasConflict ? '#fff5f5' : isUsed ? '#f0fff4' : '#fffaf0',
                        border: '1px solid ' + (hasConflict ? '#e53e3e' : isUsed ? '#c6f6d5' : '#feebc8'),
                        color: hasConflict ? '#c53030' : isUsed ? '#38a169' : '#c05621',
                        boxShadow: hasConflict ? '0 0 0 2px rgba(229,62,62,0.2)' : 'none',
                      }}>
                      {hasConflict ? '🔴' : isUsed ? '✅' : '🟡'} {ean}
                      {hasConflict && <span style={{ fontSize: 9, fontWeight: 700 }}>({hasConflict.join(',')})</span>}
                      {!isUsed && (
                        <button onClick={() => removeEanFromBank(mod, ean)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: '#e53e3e', padding: 0, marginLeft: 2 }}>✕</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {bankModels.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#a0aec0', background: 'white', borderRadius: 8, border: '1px dashed #cbd5e0' }}>
            <p style={{ fontSize: 32 }}>📋</p>
            <p style={{ fontSize: 14, marginTop: 8 }}>Bank EAN-ów jest pusty</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Wybierz model, wklej EAN-y od producenta, kliknij "+N" w katalogu.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(EanBank);
