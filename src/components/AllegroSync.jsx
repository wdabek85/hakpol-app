import { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '../store.jsx';
import { KONTA, KONTA_COLORS, KONTA_DB_FIELDS } from '../utils/constants.js';
import { read, utils } from 'xlsx';

const btn = { padding: '6px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 };

export default function AllegroSync({ initialKonto }) {
  const {
    models, allegroOferty, saving, duplikaty, duplikatyAllegroIds,
    loadAllegroOferty, upsertAllegroOferty, clearAllegroKonto,
  } = useStore();

  const [activeKonto, setActiveKonto] = useState(initialKonto || KONTA[0]);
  const [filter, setFilter] = useState('all'); // all | mapped | duplicate | unmapped
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const fileRef = useRef(null);

  // Update active konto if initialKonto changes
  useEffect(() => {
    if (initialKonto) setActiveKonto(initialKonto);
  }, [initialKonto]);

  // Load allegro data on mount and konto change
  useEffect(() => {
    loadAllegroOferty(activeKonto);
  }, [activeKonto, loadAllegroOferty]);

  // Build ofertaMap from catalog data + duplikaty table
  const ofertaMap = useMemo(() => {
    const map = {};
    // Wariant lookup for duplikaty (wariant_id → {model, auto, wiazka})
    const variantInfo = {};
    models.forEach(m => {
      m.auta?.forEach(a => {
        a.warianty?.forEach(w => {
          variantInfo[w.id] = { model: m.nr_kat, auto: a.nazwa, wiazka: w.wiazka || '' };
          // Map offers from variant fields
          const fields = [w.oferty_sma, w.oferty_zahakowani, w.oferty_autohaki];
          fields.forEach((pole) => {
            if (pole) {
              pole.split(',').map(s => s.trim()).filter(Boolean).forEach(id => {
                if (!map[id]) {
                  map[id] = { model: m.nr_kat, auto: a.nazwa, wiazka: w.wiazka || '', isDuplicate: false };
                }
              });
            }
          });
        });
      });
    });
    // Add duplikaty from the duplikaty table — these override as isDuplicate: true
    duplikaty.forEach(d => {
      const offerId = d.allegro_offer_id?.trim();
      if (!offerId) return;
      const info = variantInfo[d.wariant_id];
      if (info) {
        map[offerId] = { ...info, isDuplicate: true };
      }
    });
    return map;
  }, [models, duplikaty]);

  const oferty = allegroOferty[activeKonto] || [];

  // Enrich each oferta with match status
  const enriched = useMemo(() => {
    return oferty.map(o => {
      const match = ofertaMap[o.allegro_id];
      let status = 'unmapped';
      if (match && match.isDuplicate) status = 'duplicate';
      else if (match) status = 'mapped';
      return { ...o, match, status };
    });
  }, [oferty, ofertaMap]);

  // Stats
  const statsData = useMemo(() => {
    const total = enriched.length;
    const mapped = enriched.filter(o => o.status === 'mapped').length;
    const duplicate = enriched.filter(o => o.status === 'duplicate').length;
    const unmapped = enriched.filter(o => o.status === 'unmapped').length;
    return { total, mapped, duplicate, unmapped };
  }, [enriched]);

  // Filter + search
  const filtered = useMemo(() => {
    let list = enriched;
    if (filter !== 'all') list = list.filter(o => o.status === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.allegro_id?.includes(q) ||
        o.tytul?.toLowerCase().includes(q) ||
        o.nr_kat_allegro?.toLowerCase().includes(q) ||
        o.match?.model?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [enriched, filter, search]);

  // Sort
  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sortCol) {
      list.sort((a, b) => {
        let va = a[sortCol] ?? '';
        let vb = b[sortCol] ?? '';
        if (sortCol === 'cena' || sortCol === 'ilosc') {
          va = Number(va) || 0;
          vb = Number(vb) || 0;
        }
        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      // Default: unmapped first, then duplicate, then mapped
      const order = { unmapped: 0, duplicate: 1, mapped: 2 };
      list.sort((a, b) => order[a.status] - order[b.status]);
    }
    return list;
  }, [filtered, sortCol, sortDir]);

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  // Import .xlsm file
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg('');

    try {
      const buffer = await file.arrayBuffer();
      const wb = read(buffer, { type: 'array' });
      const sheet = wb.Sheets['Szablon'] || wb.Sheets[wb.SheetNames[0]];
      const rows = utils.sheet_to_json(sheet, { header: 1, defval: '' });

      // Data starts at row 5 (index 4), headers at row 4 (index 3)
      const dataRows = rows.slice(4);
      const parsed = [];

      for (const row of dataRows) {
        const allegroId = String(row[2] || '').trim();
        if (!allegroId || !/^\d+$/.test(allegroId)) continue;

        parsed.push({
          allegro_id: allegroId,
          tytul: String(row[21] || '').trim(),
          nr_kat_allegro: String(row[52] || '').trim(),
          wiazka_allegro: String(row[46] || '').trim(),
          cena: parseFloat(row[14]) || null,
          ilosc: parseInt(row[12]) || null,
          status_oferty: String(row[7] || '').trim(),
          link: String(row[3] || '').trim(),
          ostatnia_sync: new Date().toISOString(),
        });
      }

      if (parsed.length === 0) {
        setImportMsg('Nie znaleziono ofert w pliku. Sprawdź arkusz "Szablon".');
      } else {
        await upsertAllegroOferty(activeKonto, parsed);
        setImportMsg(`Zaimportowano ${parsed.length} ofert dla ${activeKonto.replace(/_/g, ' ')}`);
      }
    } catch (err) {
      console.error('Import error:', err);
      setImportMsg('Błąd importu: ' + err.message);
    }

    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClear = async () => {
    if (!confirm(`Usunąć WSZYSTKIE oferty z konta ${activeKonto.replace(/_/g, ' ')}?`)) return;
    await clearAllegroKonto(activeKonto);
    setImportMsg('Wyczyszczono oferty');
  };

  const rowBg = (status) => {
    if (status === 'mapped') return '#f0fff4';
    if (status === 'duplicate') return '#fff5f5';
    return 'white';
  };

  const sortIcon = (col) => {
    if (sortCol !== col) return ' ↕';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const thStyle = { padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#4a5568', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', borderBottom: '2px solid #e2e8f0' };
  const tdStyle = { padding: '6px 10px', fontSize: 12, borderBottom: '1px solid #f0f0f0' };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Sub-tabs per konto */}
      <div style={{ display: 'flex', gap: 0, padding: '12px 20px 0', background: '#f7fafc', borderBottom: '1px solid #e2e8f0' }}>
        {KONTA.map(k => {
          const active = activeKonto === k;
          const count = (allegroOferty[k] || []).length;
          return (
            <button key={k} onClick={() => setActiveKonto(k)} style={{
              padding: '8px 18px',
              border: 'none',
              borderBottom: active ? `3px solid ${KONTA_COLORS[k]}` : '3px solid transparent',
              background: active ? 'white' : 'transparent',
              color: active ? KONTA_COLORS[k] : '#718096',
              fontSize: 13,
              fontWeight: active ? 700 : 500,
              cursor: 'pointer',
              borderRadius: '6px 6px 0 0',
              transition: 'all 0.15s',
            }}>
              {k.replace(/_/g, ' ')}
              {count > 0 && <span style={{ marginLeft: 6, fontSize: 10, background: active ? KONTA_COLORS[k] : '#cbd5e0', color: 'white', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Toolbar: stats + import + filter */}
      <div style={{ padding: '12px 20px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        {/* Stats */}
        <div style={{ display: 'flex', gap: 10, fontSize: 12, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, color: '#2d3748' }}>Ofert: {statsData.total}</span>
          <span style={{ color: '#38a169' }}>✅ {statsData.mapped} ({statsData.total ? Math.round(statsData.mapped / statsData.total * 100) : 0}%)</span>
          <span style={{ color: '#e53e3e' }}>🔴 {statsData.duplicate}</span>
          <span style={{ color: '#718096' }}>⬜ {statsData.unmapped}</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Import */}
        <input type="file" accept=".xlsm,.xlsx,.xls" ref={fileRef} onChange={handleImport} style={{ display: 'none' }} />
        <button onClick={() => fileRef.current?.click()} disabled={importing || saving} style={{ ...btn, background: KONTA_COLORS[activeKonto], color: 'white', opacity: importing ? 0.6 : 1 }}>
          {importing ? '⏳ Importuję...' : '📤 Importuj .xlsm'}
        </button>
        {oferty.length > 0 && (
          <button onClick={handleClear} style={{ ...btn, background: '#e53e3e', color: 'white' }}>🗑 Wyczyść</button>
        )}

        {/* Filter */}
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 12 }}>
          <option value="all">Wszystkie</option>
          <option value="mapped">✅ Zmapowane</option>
          <option value="duplicate">🔴 Duplikaty</option>
          <option value="unmapped">⬜ Niezmapowane</option>
        </select>

        {/* Search */}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Szukaj..." style={{ padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, width: 160 }} />
      </div>

      {importMsg && (
        <div style={{ padding: '8px 20px', background: importMsg.includes('Błąd') ? '#fff5f5' : '#f0fff4', fontSize: 12, color: importMsg.includes('Błąd') ? '#c53030' : '#276749', borderBottom: '1px solid #e2e8f0' }}>
          {importMsg}
        </div>
      )}

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#a0aec0' }}>
            <p style={{ fontSize: 32 }}>📊</p>
            <p style={{ fontSize: 14, marginTop: 8 }}>
              {oferty.length === 0
                ? `Brak ofert dla ${activeKonto.replace(/_/g, ' ')}. Zaimportuj plik .xlsm z Allegro.`
                : 'Brak wyników dla wybranych filtrów.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f7fafc', zIndex: 1 }}>
              <tr>
                <th style={thStyle}>Status</th>
                <th style={thStyle} onClick={() => handleSort('allegro_id')}>ID oferty{sortIcon('allegro_id')}</th>
                <th style={{ ...thStyle, minWidth: 200 }} onClick={() => handleSort('tytul')}>Tytuł{sortIcon('tytul')}</th>
                <th style={thStyle} onClick={() => handleSort('nr_kat_allegro')}>Nr kat.{sortIcon('nr_kat_allegro')}</th>
                <th style={thStyle} onClick={() => handleSort('wiazka_allegro')}>Wiązka{sortIcon('wiazka_allegro')}</th>
                <th style={thStyle} onClick={() => handleSort('cena')}>Cena{sortIcon('cena')}</th>
                <th style={thStyle} onClick={() => handleSort('ilosc')}>Szt.{sortIcon('ilosc')}</th>
                <th style={{ ...thStyle, minWidth: 160 }}>Nasz wariant</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(o => (
                <tr key={o.id} style={{ background: rowBg(o.status), transition: 'background 0.1s' }}
                  onMouseEnter={e => { if (o.status === 'unmapped') e.currentTarget.style.background = '#f7fafc'; }}
                  onMouseLeave={e => e.currentTarget.style.background = rowBg(o.status)}>
                  <td style={tdStyle}>
                    {o.status === 'mapped' && <span title="Zmapowana">✅</span>}
                    {o.status === 'duplicate' && <span title="Duplikat">🔴</span>}
                    {o.status === 'unmapped' && <span title="Niezmapowana">⬜</span>}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11 }}>
                    {o.link ? <a href={o.link} target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce', textDecoration: 'none' }}>{o.allegro_id}</a> : o.allegro_id}
                  </td>
                  <td style={{ ...tdStyle, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={o.tytul}>{o.tytul}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{o.nr_kat_allegro}</td>
                  <td style={tdStyle}>{o.wiazka_allegro}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{o.cena ? `${Number(o.cena).toFixed(2)} zł` : ''}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{o.ilosc}</td>
                  <td style={{ ...tdStyle, fontSize: 11, color: o.status === 'duplicate' ? '#c53030' : '#276749' }}>
                    {o.match && (
                      <span>
                        {o.match.model} › {o.match.auto} › {o.match.wiazka}
                        {o.match.isDuplicate && <span style={{ marginLeft: 4, color: '#c53030', fontWeight: 700 }}>(DUPL)</span>}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
