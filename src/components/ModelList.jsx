import { useState, useCallback, useMemo, memo } from 'react';
import { useStore } from '../store.jsx';

const btn = { padding: '5px 10px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 };

function ModelList({ activeModel, setActiveModel }) {
  const { models, eanValidation, addModel, getEanBankOwners } = useStore();
  const [search, setSearch] = useState('');
  const [newModelInput, setNewModelInput] = useState('');

  const handleAddModel = useCallback(async () => {
    if (!newModelInput.trim()) return;
    const result = await addModel(newModelInput);
    if (result?.error) { alert(result.error); return; }
    if (result?.id) setActiveModel(result.id);
    setNewModelInput('');
  }, [newModelInput, addModel, setActiveModel]);

  const q = search.toLowerCase();
  const filtered = useMemo(() =>
    models.filter(m =>
      m.nr_kat.toLowerCase().includes(q) ||
      m.auta?.some(a => a.nazwa.toLowerCase().includes(q))
    ), [models, q]);

  const grouped = useMemo(() => {
    const items = [];
    let lastLetter = '';
    filtered.forEach(m => {
      const letter = m.nr_kat.split('/')[0] || m.nr_kat[0] || '';
      if (letter !== lastLetter) {
        items.push({ type: 'header', letter });
        lastLetter = letter;
      }
      items.push({ type: 'model', model: m });
    });
    return items;
  }, [filtered]);

  return (
    <div style={{ width: 280, flexShrink: 0, background: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Szukaj modelu lub auta..."
          style={{ width: '100%', padding: '7px 10px', border: '1px solid #cbd5e0', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
      </div>
      <div style={{ padding: '6px 10px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 4 }}>
        <input value={newModelInput} onChange={e => setNewModelInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddModel()}
          placeholder="Nowy (np. C/050)"
          style={{ flex: 1, padding: '5px 8px', border: '1px solid #cbd5e0', borderRadius: 4, fontSize: 12, boxSizing: 'border-box' }} />
        <button onClick={handleAddModel} style={{ ...btn, background: '#3182ce', color: 'white' }}>+</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {grouped.map((item, i) => {
          if (item.type === 'header') {
            return (
              <div key={'h-' + item.letter} style={{ padding: '6px 12px', background: '#edf2f7', fontWeight: 700, fontSize: 12, color: '#2d3748', borderBottom: '1px solid #e2e8f0' }}>
                ── {item.letter} ──
              </div>
            );
          }
          const m = item.model;
          const isActive = activeModel === m.id;
          const nA = m.auta?.length || 0;
          const nF = (m.auta || []).reduce((s, a) => s + (a.warianty || []).filter(w => w.aktywny && w.ean).length, 0);
          const nT = (m.auta || []).reduce((s, a) => s + (a.warianty || []).filter(w => w.aktywny).length, 0);
          const pct = nT ? Math.round(nF / nT * 100) : 0;
          const hasDupEan = m.auta?.some(a => a.warianty?.some(w => w.ean && w.aktywny && eanValidation.dupEans.has(w.ean.trim())));
          const hasWrongModelEan = m.auta?.some(a => a.warianty?.some(w => {
            if (!w.ean || !w.aktywny) return false;
            const owners = getEanBankOwners(w.ean);
            return owners.length > 0 && !owners.includes(m.nr_kat);
          }));
          const hasIssue = m.uwagi || hasDupEan || hasWrongModelEan;
          return (
            <div key={m.id} onClick={() => setActiveModel(m.id)}
              style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f7fafc',
                background: isActive ? '#ebf4ff' : hasIssue ? '#fff5f5' : 'transparent',
                borderLeft: isActive ? '3px solid #3182ce' : hasIssue ? '3px solid #e53e3e' : '3px solid transparent' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: hasIssue ? '#c53030' : '#1a365d' }}>{m.nr_kat}</span>
                <span style={{ fontSize: 10, color: nA ? '#38a169' : '#cbd5e0' }}>{nA ? `${nA} aut` : '—'}</span>
              </div>
              {nA > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <div style={{ flex: 1, height: 3, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#38a169' : '#ecc94b' }} />
                  </div>
                  <span style={{ fontSize: 9, color: '#718096' }}>{pct}%</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(ModelList);