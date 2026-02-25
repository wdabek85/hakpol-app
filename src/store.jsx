import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from './supabase.js';
import { WIAZKI, KONTA_DB_FIELDS } from './utils/constants.js';
import { formatNrKat } from './utils/csvExport.js';

const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);

export function StoreProvider({ children }) {
  const [models, setModels] = useState([]);
  const [eanBank, setEanBank] = useState([]); // [{id, model, ean}]
  const [duplikaty, setDuplikaty] = useState([]);
  const [allegroOferty, setAllegroOferty] = useState({ SMA_Imiola: [], Zahakowani_pl: [], 'Auto-haki_pl': [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);
  const dupSaveTimer = useRef(null);

  // ─── LOAD ALL DATA ───
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      // Load models with auta and warianty
      const { data: mData } = await supabase
        .from('models')
        .select(`
          id, nr_kat, uwagi, created_at,
          auta (
            id, nazwa, sort_order,
            warianty (
              id, wiazka, ean, cena,
              oferty_sma, oferty_zahakowani, oferty_autohaki,
              duplikat_id, aktywny
            )
          )
        `)
        .order('nr_kat');

      // Load ean bank
      const { data: eData } = await supabase
        .from('ean_bank')
        .select('id, model, ean')
        .order('model, ean');

      // Load duplikaty
      const { data: dData } = await supabase
        .from('duplikaty')
        .select('*')
        .order('created_at');

      setModels(mData || []);
      setEanBank(eData || []);
      setDuplikaty(dData || []);
    } catch (e) {
      console.error('Load failed:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ─── REAL-TIME SUBSCRIPTIONS ───
  useEffect(() => {
    const channel = supabase
      .channel('hakpol-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'models' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auta' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'warianty' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ean_bank' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duplikaty' }, () => loadAll())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadAll]);

  // ─── MODEL CRUD ───
  const addModel = useCallback(async (nrKat) => {
    const v = formatNrKat(nrKat);
    if (!v) return null;
    if (models.some(m => m.nr_kat === v)) return { error: `Model ${v} już istnieje!` };

    setSaving(true);
    const { data, error } = await supabase
      .from('models')
      .insert({ nr_kat: v })
      .select()
      .single();
    if (!error) {
      await loadAll();
    }
    setSaving(false);
    return data;
  }, [models, loadAll]);

  const updateModel = useCallback(async (id, updates) => {
    setSaving(true);
    await supabase.from('models').update(updates).eq('id', id);
    setModels(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    setSaving(false);
  }, []);

  const deleteModel = useCallback(async (id) => {
    setSaving(true);
    await supabase.from('models').delete().eq('id', id);
    setModels(prev => prev.filter(m => m.id !== id));
    setSaving(false);
  }, []);

  // ─── AUTO CRUD ───
  const addAuto = useCallback(async (modelId, nazwa) => {
    if (!nazwa.trim()) return;
    setSaving(true);

    // Insert auto
    const { data: autoData, error } = await supabase
      .from('auta')
      .insert({ model_id: modelId, nazwa: nazwa.trim() })
      .select()
      .single();

    if (error || !autoData) { setSaving(false); return; }

    // Insert 5 warianty
    const warianty = WIAZKI.map(w => ({
      auto_id: autoData.id,
      wiazka: w,
      ean: '',
      cena: '',
      aktywny: true,
    }));
    await supabase.from('warianty').insert(warianty);
    await loadAll();
    setSaving(false);
  }, [loadAll]);

  const updateAuto = useCallback(async (id, updates) => {
    setSaving(true);
    await supabase.from('auta').update(updates).eq('id', id);
    // Optimistic update
    setModels(prev => prev.map(m => ({
      ...m,
      auta: m.auta.map(a => a.id === id ? { ...a, ...updates } : a)
    })));
    setSaving(false);
  }, []);

  const deleteAuto = useCallback(async (id) => {
    setSaving(true);
    await supabase.from('auta').delete().eq('id', id);
    await loadAll();
    setSaving(false);
  }, [loadAll]);

  const duplicateAuto = useCallback(async (modelId, autoId) => {
    const model = models.find(m => m.id === modelId);
    if (!model) return;
    const src = model.auta.find(a => a.id === autoId);
    if (!src) return;

    setSaving(true);
    const { data: newAuto } = await supabase
      .from('auta')
      .insert({ model_id: modelId, nazwa: src.nazwa + ' (kopia)' })
      .select()
      .single();

    if (newAuto) {
      const warianty = src.warianty.map(w => ({
        auto_id: newAuto.id,
        wiazka: w.wiazka,
        ean: '',
        cena: w.cena,
        aktywny: w.aktywny,
      }));
      await supabase.from('warianty').insert(warianty);
    }
    await loadAll();
    setSaving(false);
  }, [models, loadAll]);

  // ─── WARIANT UPDATE (debounced) ───
  const updateVariant = useCallback(async (variantId, field, value) => {
    // Optimistic update
    setModels(prev => prev.map(m => ({
      ...m,
      auta: m.auta.map(a => ({
        ...a,
        warianty: a.warianty.map(w => w.id === variantId ? { ...w, [field]: value } : w)
      }))
    })));

    // Debounced DB save
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await supabase.from('warianty').update({ [field]: value }).eq('id', variantId);
      setSaving(false);
    }, 500);
  }, []);

  // ─── DUPLIKATY CRUD ───
  const addDuplikat = useCallback(async (wariantId) => {
    setSaving(true);
    const { data, error } = await supabase
      .from('duplikaty')
      .insert({ wariant_id: wariantId, konto: 'SMA_Imiola', allegro_offer_id: '', ean: '', uwagi: '' })
      .select()
      .single();
    if (!error && data) {
      setDuplikaty(prev => [...prev, data]);
    }
    setSaving(false);
    return data;
  }, []);

  const updateDuplikat = useCallback((id, field, value) => {
    // Optimistic update
    setDuplikaty(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));

    // Debounced DB save
    if (dupSaveTimer.current) clearTimeout(dupSaveTimer.current);
    dupSaveTimer.current = setTimeout(async () => {
      setSaving(true);
      await supabase.from('duplikaty').update({ [field]: value }).eq('id', id);
      setSaving(false);
    }, 500);
  }, []);

  const deleteDuplikat = useCallback(async (id) => {
    setSaving(true);
    await supabase.from('duplikaty').delete().eq('id', id);
    setDuplikaty(prev => prev.filter(d => d.id !== id));
    setSaving(false);
  }, []);

  // ─── DUPLIKATY COMPUTED HELPERS ───
  const duplikatyByWariant = useMemo(() => {
    const map = new Map();
    duplikaty.forEach(d => {
      if (!map.has(d.wariant_id)) map.set(d.wariant_id, []);
      map.get(d.wariant_id).push(d);
    });
    return map;
  }, [duplikaty]);

  const duplikatyAllegroIds = useMemo(() => {
    const set = new Set();
    duplikaty.forEach(d => {
      if (d.allegro_offer_id && d.allegro_offer_id.trim()) {
        set.add(d.allegro_offer_id.trim());
      }
    });
    return set;
  }, [duplikaty]);

  // ─── EAN BANK ───
  const eanBankByModel = useMemo(() => {
    const map = {};
    eanBank.forEach(e => {
      if (!map[e.model]) map[e.model] = [];
      map[e.model].push(e.ean);
    });
    return map;
  }, [eanBank]);

  const addEansToBank = useCallback(async (model, eanText) => {
    const v = formatNrKat(model);
    if (!v) return { error: 'Wpisz numer modelu!' };

    const newEans = eanText.split(/[\n\r,;]+/).map(e => e.trim()).filter(e => /^\d{8,14}$/.test(e));
    if (!newEans.length) return { error: 'Nie znaleziono poprawnych EAN-ów (8-14 cyfr)' };

    // Cross-model conflict detection
    const conflicts = [];
    const variantConflicts = [];

    newEans.forEach(ean => {
      // Check bank
      eanBank.forEach(row => {
        if (row.model !== v && row.ean === ean) {
          conflicts.push({ ean, model: row.model });
        }
      });
      // Check used variants under other models
      models.forEach(m => {
        if (m.nr_kat === v) return;
        m.auta?.forEach(a => a.warianty?.forEach(w => {
          if (w.ean === ean && w.aktywny) {
            variantConflicts.push({ ean, model: m.nr_kat, auto: a.nazwa, wiazka: w.wiazka });
          }
        }));
      });
    });

    // Filter already existing
    const existing = new Set((eanBankByModel[v] || []));
    const toInsert = newEans.filter(e => !existing.has(e));

    if (toInsert.length > 0) {
      setSaving(true);
      await supabase.from('ean_bank').insert(toInsert.map(ean => ({ model: v, ean })));

      // Auto-create model if not exists
      const isNew = !models.some(m => m.nr_kat === v);
      if (isNew) {
        await supabase.from('models').insert({ nr_kat: v, uwagi: '🆕 Nowy model — dodany automatycznie z banku EAN' });
      }

      await loadAll();
      setSaving(false);
    }

    return { added: toInsert.length, conflicts, variantConflicts, isNew: !models.some(m => m.nr_kat === v) };
  }, [eanBank, eanBankByModel, models, loadAll]);

  const removeEanFromBank = useCallback(async (model, ean) => {
    setSaving(true);
    await supabase.from('ean_bank').delete().eq('model', model).eq('ean', ean);
    setEanBank(prev => prev.filter(e => !(e.model === model && e.ean === ean)));
    setSaving(false);
  }, []);

  const clearBankForModel = useCallback(async (model) => {
    setSaving(true);
    await supabase.from('ean_bank').delete().eq('model', model);
    setEanBank(prev => prev.filter(e => e.model !== model));
    setSaving(false);
  }, []);

  // ─── EAN VALIDATION (memoized) ───
  const eanValidation = useMemo(() => {
    // Duplicate EAN detection
    const eanCount = {};
    models.forEach(m => m.auta?.forEach(a => a.warianty?.forEach(w => {
      if (w.ean && w.aktywny) {
        const e = w.ean.trim();
        if (!eanCount[e]) eanCount[e] = [];
        eanCount[e].push({ model: m.nr_kat, auto: a.nazwa, wiazka: w.wiazka });
      }
    })));
    const dupEans = new Set(Object.keys(eanCount).filter(e => eanCount[e].length > 1));

    // Used EANs set
    const usedEans = new Set();
    models.forEach(m => m.auta?.forEach(a => a.warianty?.forEach(w => {
      if (w.ean && w.aktywny) usedEans.add(w.ean.trim());
    })));

    // Bank conflicts (same EAN in multiple models)
    const bankConflicts = {};
    const bankModels = {};
    eanBank.forEach(e => {
      if (!bankModels[e.ean]) bankModels[e.ean] = new Set();
      bankModels[e.ean].add(e.model);
    });
    Object.entries(bankModels).forEach(([ean, ms]) => {
      if (ms.size > 1) bankConflicts[ean] = [...ms];
    });

    return { eanCount, dupEans, usedEans, bankConflicts, bankModels };
  }, [models, eanBank]);

  // Helper: find bank owners for an EAN
  const getEanBankOwners = useCallback((ean) => {
    if (!ean) return [];
    const e = ean.trim();
    return [...(eanValidation.bankModels[e] || [])];
  }, [eanValidation]);

  // Helper: available EANs for a model
  const getAvailableEans = useCallback((nrKat) => {
    const bankEans = eanBankByModel[nrKat] || [];
    return bankEans.filter(e => !eanValidation.usedEans.has(e));
  }, [eanBankByModel, eanValidation]);

  // Auto-assign next EAN
  const assignNextEan = useCallback(async (variantId, modelNrKat) => {
    const available = getAvailableEans(modelNrKat);
    if (!available.length) return false;
    await updateVariant(variantId, 'ean', available[0]);
    return true;
  }, [getAvailableEans, updateVariant]);

  // ─── ALLEGRO OFERTY ───
  const loadAllegroOferty = useCallback(async (konto) => {
    const { data } = await supabase
      .from('allegro_oferty')
      .select('*')
      .eq('konto', konto)
      .order('allegro_id');
    setAllegroOferty(prev => ({ ...prev, [konto]: data || [] }));
    return data || [];
  }, []);

  const loadAllAllegroOferty = useCallback(async () => {
    const { data } = await supabase
      .from('allegro_oferty')
      .select('*')
      .order('konto, allegro_id');
    const grouped = { SMA_Imiola: [], Zahakowani_pl: [], 'Auto-haki_pl': [] };
    (data || []).forEach(o => {
      if (grouped[o.konto]) grouped[o.konto].push(o);
    });
    setAllegroOferty(grouped);
  }, []);

  const upsertAllegroOferty = useCallback(async (konto, oferty) => {
    setSaving(true);
    // Batch upsert in chunks of 500
    for (let i = 0; i < oferty.length; i += 500) {
      const chunk = oferty.slice(i, i + 500).map(o => ({ ...o, konto }));
      await supabase.from('allegro_oferty').upsert(chunk, { onConflict: 'konto,allegro_id' });
    }
    await loadAllegroOferty(konto);
    setSaving(false);
  }, [loadAllegroOferty]);

  const clearAllegroKonto = useCallback(async (konto) => {
    setSaving(true);
    await supabase.from('allegro_oferty').delete().eq('konto', konto);
    setAllegroOferty(prev => ({ ...prev, [konto]: [] }));
    setSaving(false);
  }, []);

  // ─── COMPUTED STATS ───
  const stats = useMemo(() => {
    const totalAuta = models.reduce((s, m) => s + (m.auta?.length || 0), 0);
    const totalVar = models.reduce((s, m) => s + (m.auta || []).reduce((s2, a) => s2 + (a.warianty || []).filter(w => w.aktywny).length, 0), 0);
    const filledEan = models.reduce((s, m) => s + (m.auta || []).reduce((s2, a) => s2 + (a.warianty || []).filter(w => w.aktywny && w.ean).length, 0), 0);
    const modelsWithAuta = models.filter(m => m.auta?.length > 0).length;
    const modelsWithUwagi = models.filter(m => m.uwagi).length;
    const totalDuplikaty = duplikaty.length;
    const totalBankEans = eanBank.length;
    const totalBankConflicts = Object.keys(eanValidation.bankConflicts).length;

    // Wrong model EANs
    const wrongModelEanList = [];
    models.forEach(m => m.auta?.forEach(a => a.warianty?.forEach(w => {
      if (!w.ean || !w.aktywny) return;
      const owners = getEanBankOwners(w.ean);
      if (owners.length > 0 && !owners.includes(m.nr_kat)) {
        wrongModelEanList.push({ ean: w.ean.trim(), usedIn: m.nr_kat, auto: a.nazwa, wiazka: w.wiazka, belongsTo: owners });
      }
    })));

    return {
      totalAuta, totalVar, filledEan, modelsWithAuta, modelsWithUwagi,
      totalDuplikaty, totalBankEans, totalBankConflicts, wrongModelEanList,
      dupEanCount: eanValidation.dupEans.size,
    };
  }, [models, eanBank, duplikaty, eanValidation, getEanBankOwners]);

  const value = {
    models, eanBank, eanBankByModel, duplikaty, duplikatyByWariant, duplikatyAllegroIds,
    allegroOferty, loading, saving, stats, eanValidation,
    addModel, updateModel, deleteModel,
    addAuto, updateAuto, deleteAuto, duplicateAuto,
    updateVariant,
    addDuplikat, updateDuplikat, deleteDuplikat,
    addEansToBank, removeEanFromBank, clearBankForModel,
    getEanBankOwners, getAvailableEans, assignNextEan,
    loadAllegroOferty, loadAllAllegroOferty, upsertAllegroOferty, clearAllegroKonto,
    loadAll,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
