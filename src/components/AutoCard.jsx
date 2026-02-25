import { useState, useCallback, memo } from 'react';
import { useStore } from '../store.jsx';
import { KONTA, KONTA_COLORS, wiazkaColor, wiazkaIcon } from '../utils/constants.js';

const btn = { padding: '6px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 };
const th = { padding: '6px 10px', fontSize: 11, fontWeight: 600, color: '#4a5568', borderBottom: '1px solid #e2e8f0' };
const td = { padding: '5px 10px', borderBottom: '1px solid #f7fafc' };
const inp = { width: '100%', padding: '3px 6px', border: '1px solid #e2e8f0', borderRadius: 3, fontSize: 12, boxSizing: 'border-box' };

function AutoCard({ auto, model }) {
  const { updateAuto, deleteAuto, duplicateAuto, updateVariant, eanValidation, getEanBankOwners, getAvailableEans, assignNextEan, duplikatyByWariant, addDuplikat, updateDuplikat, deleteDuplikat } = useStore();
  const [expanded, setExpanded] = useState(true);

  const filledCount = (auto.warianty || []).filter(w => w.aktywny && w.ean).length;
  const activeCount = (auto.warianty || []).filter(w => w.aktywny).length;
  const dupCount = (auto.warianty || []).reduce((s, w) => s + (duplikatyByWariant.get(w.id)?.length || 0), 0);

  const handleNameChange = useCallback((e) => {
    updateAuto(auto.id, { nazwa: e.target.value });
  }, [auto.id, updateAuto]);

  const handleDelete = useCallback(() => {
    if (confirm('Usunąć to auto?')) deleteAuto(auto.id);
  }, [auto.id, deleteAuto]);

  const handleDuplicate = useCallback(() => {
    duplicateAuto(model.id, auto.id);
  }, [model.id, auto.id, duplicateAuto]);

  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 10, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '8px 12px', background: '#f7fafc', borderBottom: expanded ? '1px solid #e2e8f0' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }} onClick={() => setExpanded(!expanded)}>
          <span style={{ fontSize: 12, color: '#a0aec0', cursor: 'pointer' }}>{expanded ? '▼' : '▶'}</span>
          <span style={{ fontSize: 13 }}>🚗</span>
          <input value={auto.nazwa} onClick={e => e.stopPropagation()} onChange={handleNameChange}
            style={{ flex: 1, fontWeight: 700, fontSize: 13, color: '#2d3748', border: '1px solid transparent', borderRadius: 4, padding: '2px 6px', background: 'transparent' }}
            onFocus={e => { e.target.style.border = '1px solid #cbd5e0'; e.target.style.background = 'white'; }}
            onBlur={e => { e.target.style.border = '1px solid transparent'; e.target.style.background = 'transparent'; }} />
          <span style={{ fontSize: 11, color: '#a0aec0', whiteSpace: 'nowrap' }}>
            EAN: {filledCount}/{activeCount}
            {dupCount > 0 && <span style={{ color: '#e53e3e', fontWeight: 700 }}> · 🔴 {dupCount}</span>}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={handleDuplicate} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#a0aec0' }} title="Duplikuj">📋</button>
          <button onClick={handleDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#a0aec0' }} title="Usuń">✕</button>
        </div>
      </div>

      {/* Variants table */}
      {expanded && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#edf2f7' }}>
              <th style={th}>✓</th>
              <th style={{ ...th, textAlign: 'left' }}>Wiązka</th>
              <th style={{ ...th, textAlign: 'left' }}>EAN</th>
              <th style={{ ...th, textAlign: 'left', width: 80 }}>Cena PLN</th>
              {KONTA.map(k => <th key={k} style={{ ...th, textAlign: 'left' }}><span style={{ color: KONTA_COLORS[k] }}>●</span> {k.replace(/_/g, ' ')}</th>)}
              <th style={{ ...th, textAlign: 'center', width: 80 }}>Duplikaty</th>
            </tr>
          </thead>
          <tbody>
            {(auto.warianty || []).map(w => {
              const wDups = duplikatyByWariant.get(w.id) || [];
              return (
                <VariantWithDups key={w.id} w={w} model={model} auto={auto} wDups={wDups}
                  updateVariant={updateVariant} eanValidation={eanValidation}
                  getEanBankOwners={getEanBankOwners} getAvailableEans={getAvailableEans}
                  assignNextEan={assignNextEan} addDuplikat={addDuplikat}
                  updateDuplikat={updateDuplikat} deleteDuplikat={deleteDuplikat} />
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function VariantWithDups({ w, model, auto, wDups, updateVariant, eanValidation, getEanBankOwners, getAvailableEans, assignNextEan, addDuplikat, updateDuplikat, deleteDuplikat }) {
  return (
    <>
      <VariantRow w={w} model={model} auto={auto} wDups={wDups}
        updateVariant={updateVariant} eanValidation={eanValidation}
        getEanBankOwners={getEanBankOwners} getAvailableEans={getAvailableEans}
        assignNextEan={assignNextEan} addDuplikat={addDuplikat} />
      {wDups.map(d => (
        <DuplikatRow key={d.id} dup={d} updateDuplikat={updateDuplikat} deleteDuplikat={deleteDuplikat} />
      ))}
    </>
  );
}

const VariantRow = memo(function VariantRow({ w, model, auto, wDups, updateVariant, eanValidation, getEanBankOwners, getAvailableEans, assignNextEan, addDuplikat }) {
  const isDupEan = w.ean && w.aktywny && eanValidation.dupEans.has(w.ean.trim());
  const dupInfo = isDupEan ? eanValidation.eanCount[w.ean.trim()]?.filter(x => !(x.model === model.nr_kat && x.auto === auto.nazwa && x.wiazka === w.wiazka)) : [];

  const bankOwners = w.ean && w.aktywny ? getEanBankOwners(w.ean) : [];
  const wrongModel = bankOwners.length > 0 && !bankOwners.includes(model.nr_kat);
  const inOtherBank = bankOwners.filter(o => o !== model.nr_kat);
  const notInBank = w.ean && w.aktywny && bankOwners.length === 0;
  const hasError = isDupEan || wrongModel;
  const hasWarning = notInBank;

  let titleText = '';
  if (wrongModel) titleText = `🔴 NALEŻY DO: ${inOtherBank.join(', ')} — nie do ${model.nr_kat}!`;
  else if (isDupEan) titleText = `⚠️ Duplikat! Też w: ${dupInfo.map(d => d.model + ' → ' + d.auto + ' → ' + d.wiazka).join(', ')}`;
  else if (notInBank) titleText = '⚠️ EAN nie jest w banku';

  const availCount = getAvailableEans(model.nr_kat).length;
  const dupCount = wDups.length;

  const kontoFields = { SMA_Imiola: 'oferty_sma', Zahakowani_pl: 'oferty_zahakowani', 'Auto-haki_pl': 'oferty_autohaki' };

  return (
    <tr style={{ opacity: w.aktywny ? 1 : 0.35, background: w.aktywny ? 'white' : '#fafafa' }}>
      <td style={{ ...td, textAlign: 'center', width: 32 }}>
        <input type="checkbox" checked={w.aktywny} onChange={() => updateVariant(w.id, 'aktywny', !w.aktywny)} />
      </td>
      <td style={{ ...td, fontWeight: 600, color: wiazkaColor(w.wiazka), whiteSpace: 'nowrap' }}>
        {wiazkaIcon(w.wiazka)} {w.wiazka}
      </td>
      <td style={td}>
        <div style={{ display: 'flex', gap: 3, alignItems: 'stretch' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input value={w.ean || ''} disabled={!w.aktywny}
              onChange={e => updateVariant(w.id, 'ean', e.target.value)}
              placeholder="EAN" title={titleText}
              style={{ ...inp,
                background: hasError ? '#fff5f5' : hasWarning ? '#fffaf0' : w.ean ? '#f0fff4' : 'white',
                borderColor: hasError ? '#e53e3e' : hasWarning ? '#dd6b20' : '#e2e8f0',
                color: hasError ? '#c53030' : hasWarning ? '#c05621' : undefined,
                boxShadow: hasError ? '0 0 0 2px rgba(229,62,62,0.3)' : 'none' }} />
            {wrongModel && <span style={{ position: 'absolute', right: 4, top: 2, fontSize: 10 }}>🔴</span>}
            {isDupEan && !wrongModel && <span style={{ position: 'absolute', right: 4, top: 2, fontSize: 10 }}>⚠️</span>}
            {hasWarning && !hasError && <span style={{ position: 'absolute', right: 4, top: 2, fontSize: 10 }}>🟡</span>}
          </div>
          {wrongModel && (
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: 4, fontSize: 9, color: '#c53030', fontWeight: 700, whiteSpace: 'nowrap' }}>
              ≠ {inOtherBank.join(',')}
            </div>
          )}
          {w.aktywny && !w.ean && (
            <button onClick={() => assignNextEan(w.id, model.nr_kat)}
              title={availCount ? `Przypisz z banku (${availCount})` : 'Brak EAN w banku'}
              style={{ background: availCount ? '#ebf4ff' : '#f7fafc', border: '1px solid ' + (availCount ? '#3182ce' : '#e2e8f0'), borderRadius: 4, cursor: 'pointer', fontSize: 12, padding: '2px 6px', color: availCount ? '#3182ce' : '#cbd5e0', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
              +{availCount || 0}
            </button>
          )}
        </div>
      </td>
      <td style={td}>
        <input value={w.cena || ''} disabled={!w.aktywny}
          onChange={e => updateVariant(w.id, 'cena', e.target.value)}
          placeholder="0.00" style={inp} />
      </td>
      {KONTA.map(k => (
        <td key={k} style={td}>
          <input value={w[kontoFields[k]] || ''} disabled={!w.aktywny}
            onChange={e => updateVariant(w.id, kontoFields[k], e.target.value)}
            placeholder="ID"
            style={{ ...inp, fontSize: 11, color: w[kontoFields[k]] ? KONTA_COLORS[k] : '#a0aec0', borderColor: w[kontoFields[k]] ? KONTA_COLORS[k] + '66' : '#e2e8f0' }} />
        </td>
      ))}
      <td style={{ ...td, textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          {dupCount > 0 && <span style={{ background: '#fed7d7', color: '#c53030', padding: '1px 6px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>🔴 {dupCount}</span>}
          <button onClick={() => addDuplikat(w.id)} title="Dodaj duplikat"
            style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 4, cursor: 'pointer', fontSize: 13, padding: '1px 6px', color: '#718096', lineHeight: 1 }}>
            ➕
          </button>
        </div>
      </td>
    </tr>
  );
});

const dupInp = { padding: '4px 8px', border: '1px solid #feb2b2', borderRadius: 4, fontSize: 12, boxSizing: 'border-box', background: '#fff5f5', color: '#c53030' };
const dupLabel = { fontWeight: 600, color: '#c53030', fontSize: 11, whiteSpace: 'nowrap' };

// Total columns in variant table: checkbox + wiazka + ean + cena + 3 konta + duplikaty = 8
const DUP_COLSPAN = 4 + KONTA.length;

const DuplikatRow = memo(function DuplikatRow({ dup, updateDuplikat, deleteDuplikat }) {
  const handleChange = useCallback((field, value) => {
    updateDuplikat(dup.id, field, value);
  }, [dup.id, updateDuplikat]);

  const handleDelete = useCallback(() => {
    deleteDuplikat(dup.id);
  }, [dup.id, deleteDuplikat]);

  return (
    <tr>
      <td colSpan={DUP_COLSPAN} style={{ padding: 0, borderBottom: '1px solid #fee2e2' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 30px', background: '#fff5f5', borderLeft: '3px solid #e53e3e', fontSize: 12 }}>
          <span style={{ fontSize: 10 }}>🔴</span>
          <select value={dup.konto} onChange={e => handleChange('konto', e.target.value)}
            style={{ ...dupInp, width: 140, fontWeight: 600, color: KONTA_COLORS[dup.konto] || '#c53030', flexShrink: 0 }}>
            {KONTA.map(k => <option key={k} value={k}>{k.replace(/_/g, ' ')}</option>)}
          </select>
          <span style={dupLabel}>ID:</span>
          <input value={dup.allegro_offer_id || ''} onChange={e => handleChange('allegro_offer_id', e.target.value)}
            placeholder="ID oferty" style={{ ...dupInp, width: 160, flexShrink: 0 }} />
          <span style={dupLabel}>EAN:</span>
          <input value={dup.ean || ''} onChange={e => handleChange('ean', e.target.value)}
            placeholder="EAN" style={{ ...dupInp, width: 160, flexShrink: 0 }} />
          <span style={dupLabel}>Uwagi:</span>
          <input value={dup.uwagi || ''} onChange={e => handleChange('uwagi', e.target.value)}
            placeholder="Uwagi" style={{ ...dupInp, flex: 1, minWidth: 80 }} />
          <button onClick={handleDelete} title="Usuń duplikat"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#e53e3e', flexShrink: 0, padding: '2px 4px' }}>
            🗑️
          </button>
        </div>
      </td>
    </tr>
  );
});

export default memo(AutoCard);
