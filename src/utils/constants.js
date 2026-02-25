export const WIAZKI = ['Brak', '7 PIN', '13 PIN', '7 PIN z modułem', '13 PIN z modułem'];

export const KONTA = ['SMA_Imiola', 'Zahakowani_pl', 'Auto-haki_pl'];

export const KONTA_COLORS = {
  SMA_Imiola: '#3182ce',
  Zahakowani_pl: '#38a169',
  'Auto-haki_pl': '#d69e2e',
};

export const KONTA_DB_FIELDS = {
  SMA_Imiola: 'oferty_sma',
  Zahakowani_pl: 'oferty_zahakowani',
  'Auto-haki_pl': 'oferty_autohaki',
};

export function wiazkaColor(w) {
  if (w === 'Brak') return '#718096';
  if (w.includes('modułem')) return '#805ad5';
  if (w.includes('13')) return '#dd6b20';
  return '#3182ce';
}

export function wiazkaIcon(w) {
  if (w === 'Brak') return '⬜';
  if (w.includes('modułem')) return '🟣';
  if (w.includes('13')) return '🟠';
  return '🔵';
}
