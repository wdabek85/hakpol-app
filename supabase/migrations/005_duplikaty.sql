-- HakPol — tabela duplikatów ofert Allegro (strukturalna zamiana za warianty.duplikat_id)
-- Uruchom w Supabase → SQL Editor → Run

-- Tabela duplikatów
CREATE TABLE duplikaty (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wariant_id UUID NOT NULL REFERENCES warianty(id) ON DELETE CASCADE,
  konto TEXT NOT NULL CHECK (konto IN ('SMA_Imiola', 'Zahakowani_pl', 'Auto-haki_pl')),
  allegro_offer_id TEXT DEFAULT '',
  ean TEXT DEFAULT '',
  uwagi TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indeksy
CREATE INDEX idx_duplikaty_wariant ON duplikaty(wariant_id);
CREATE INDEX idx_duplikaty_offer ON duplikaty(allegro_offer_id);

-- RLS: tylko zalogowani (wzorzec z 004)
ALTER TABLE duplikaty ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select" ON duplikaty FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert" ON duplikaty FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update" ON duplikaty FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete" ON duplikaty FOR DELETE TO authenticated USING (true);

-- Migracja danych z warianty.duplikat_id
-- Format pola: "ID[EAN] \ ID[EAN]" lub "ID[EAN]" (pojedynczy)
DO $$
DECLARE
  rec RECORD;
  chunk TEXT;
  chunks TEXT[];
  offer_id TEXT;
  offer_ean TEXT;
BEGIN
  FOR rec IN
    SELECT id, duplikat_id
    FROM warianty
    WHERE duplikat_id IS NOT NULL AND TRIM(duplikat_id) != ''
  LOOP
    -- Split po separatorze " \ " (backslash otoczony spacjami)
    chunks := string_to_array(rec.duplikat_id, ' \ ');

    FOREACH chunk IN ARRAY chunks
    LOOP
      chunk := TRIM(chunk);
      IF chunk = '' THEN CONTINUE; END IF;

      -- Wyciagnij ID oferty (wszystko przed '[') i EAN (zawartosc '[]')
      IF chunk ~ '\[.*\]' THEN
        offer_id := TRIM(substring(chunk FROM '^([^\[]+)'));
        offer_ean := TRIM(substring(chunk FROM '\[([^\]]*)\]'));
      ELSE
        offer_id := TRIM(chunk);
        offer_ean := '';
      END IF;

      IF offer_id = '' THEN CONTINUE; END IF;

      INSERT INTO duplikaty (wariant_id, konto, allegro_offer_id, ean, uwagi)
      VALUES (rec.id, 'SMA_Imiola', offer_id, offer_ean, 'migracja z duplikat_id');
    END LOOP;
  END LOOP;
END;
$$;
