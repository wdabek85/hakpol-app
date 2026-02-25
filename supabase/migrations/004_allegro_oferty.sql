-- HakPol — tabela ofert Allegro (import z .xlsm)
-- Uruchom w Supabase → SQL Editor → Run

CREATE TABLE allegro_oferty (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  konto TEXT NOT NULL CHECK (konto IN ('SMA_Imiola', 'Zahakowani_pl', 'Auto-haki_pl')),
  allegro_id TEXT NOT NULL,
  tytul TEXT,
  nr_kat_allegro TEXT,
  wiazka_allegro TEXT,
  cena NUMERIC(10,2),
  ilosc INTEGER,
  status_oferty TEXT,
  link TEXT,
  ostatnia_sync TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(konto, allegro_id)
);

CREATE INDEX idx_allegro_konto ON allegro_oferty(konto);
CREATE INDEX idx_allegro_id ON allegro_oferty(allegro_id);

ALTER TABLE allegro_oferty ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select" ON allegro_oferty FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert" ON allegro_oferty FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update" ON allegro_oferty FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete" ON allegro_oferty FOR DELETE TO authenticated USING (true);
