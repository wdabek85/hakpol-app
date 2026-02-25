-- HakPol — schemat bazy danych
-- Wklej w Supabase → SQL Editor → Run

-- Modele haków
create table models (
  id uuid primary key default gen_random_uuid(),
  nr_kat text not null unique,
  uwagi text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auta przypisane do modeli
create table auta (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references models(id) on delete cascade,
  nazwa text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Warianty wiązki (5 per auto)
create table warianty (
  id uuid primary key default gen_random_uuid(),
  auto_id uuid not null references auta(id) on delete cascade,
  wiazka text not null,
  ean text default '',
  cena text default '',
  oferty_sma text default '',
  oferty_zahakowani text default '',
  oferty_autohaki text default '',
  duplikat_id text default '',
  aktywny boolean default true
);

-- Bank EAN-ów od producenta
create table ean_bank (
  id uuid primary key default gen_random_uuid(),
  model text not null,
  ean text not null,
  created_at timestamptz default now(),
  unique(model, ean)
);

-- Indeksy dla wydajności
create index idx_auta_model on auta(model_id);
create index idx_warianty_auto on warianty(auto_id);
create index idx_warianty_ean on warianty(ean) where ean != '';
create index idx_ean_bank_model on ean_bank(model);
create index idx_ean_bank_ean on ean_bank(ean);
create index idx_models_nr_kat on models(nr_kat);

-- Trigger na updated_at
create or replace function update_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger models_updated
  before update on models
  for each row execute function update_timestamp();

-- Widok: pełna mapa ofert (model + auto + wariant w jednym)
create or replace view mapa_ofert as
select
  m.id as model_id,
  m.nr_kat,
  m.uwagi,
  a.id as auto_id,
  a.nazwa as auto_nazwa,
  w.id as wariant_id,
  w.wiazka,
  w.ean,
  w.cena,
  w.oferty_sma,
  w.oferty_zahakowani,
  w.oferty_autohaki,
  w.duplikat_id,
  w.aktywny
from models m
left join auta a on a.model_id = m.id
left join warianty w on w.auto_id = a.id
order by m.nr_kat, a.nazwa, 
  case w.wiazka
    when 'Brak' then 1
    when '7 PIN' then 2
    when '13 PIN' then 3
    when '7 PIN z modułem' then 4
    when '13 PIN z modułem' then 5
  end;

-- Widok: statystyki per model
create or replace view model_stats as
select
  m.id,
  m.nr_kat,
  m.uwagi,
  count(distinct a.id) as auta_count,
  count(w.id) filter (where w.aktywny) as warianty_active,
  count(w.id) filter (where w.aktywny and w.ean != '') as ean_filled,
  count(w.id) filter (where w.duplikat_id != '') as duplikaty_count
from models m
left join auta a on a.model_id = m.id
left join warianty w on w.auto_id = a.id
group by m.id, m.nr_kat, m.uwagi;

-- Wyłącz RLS dla prostoty (włącz jeśli potrzebujesz kontroli dostępu)
alter table models enable row level security;
alter table auta enable row level security;
alter table warianty enable row level security;
alter table ean_bank enable row level security;

-- Polityki: pełny dostęp dla anonowego klucza
create policy "allow all" on models for all using (true) with check (true);
create policy "allow all" on auta for all using (true) with check (true);
create policy "allow all" on warianty for all using (true) with check (true);
create policy "allow all" on ean_bank for all using (true) with check (true);
