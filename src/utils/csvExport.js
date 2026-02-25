// Format nr katalogowy: C050 → C/050
export function formatNrKat(v) {
  let s = v.trim().toUpperCase();
  if (/^[A-Z]\d{2,3}$/.test(s)) s = s[0] + '/' + s.slice(1);
  return s;
}

// CSV export
import { KONTA, KONTA_DB_FIELDS } from './constants.js';

export function exportCSV(models, eanBank) {
  const headers = ['Model haka', 'Auto', 'Wiązka', 'EAN', 'Cena PLN', ...KONTA, 'Duplikat do usunięcia', 'Aktywny', 'Uwagi do modelu'];
  const rows = [headers.join(';')];

  models.forEach(m => {
    if (!m.auta || m.auta.length === 0) {
      rows.push([m.nr_kat, '', '', '', '', ...KONTA.map(() => ''), '', '', m.uwagi || ''].join(';'));
      return;
    }
    m.auta.forEach((a, i) => {
      (a.warianty || []).forEach(w => {
        rows.push([
          m.nr_kat,
          a.nazwa,
          w.wiazka,
          w.ean || '',
          w.cena || '',
          ...KONTA.map(k => w[KONTA_DB_FIELDS[k]] || ''),
          w.duplikat_id || '',
          w.aktywny ? 'tak' : 'nie',
          i === 0 ? (m.uwagi || '') : '',
        ].join(';'));
      });
    });
  });

  const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mapa_ofert_hakpol.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJSON(models, eanBank) {
  const blob = new Blob([JSON.stringify({ models, eanBank }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'hakpol_backup_' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}
