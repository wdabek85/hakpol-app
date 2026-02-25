-- HakPol — zamiana polityk RLS z "allow all" na "tylko zalogowani"
-- URUCHOM DOPIERO PO potwierdzeniu, że logowanie działa poprawnie!

-- Usuń stare polityki "allow all"
drop policy if exists "allow all" on models;
drop policy if exists "allow all" on auta;
drop policy if exists "allow all" on warianty;
drop policy if exists "allow all" on ean_bank;

-- Nowe polityki: dostęp tylko dla zalogowanych użytkowników
create policy "authenticated select" on models for select using (auth.role() = 'authenticated');
create policy "authenticated insert" on models for insert with check (auth.role() = 'authenticated');
create policy "authenticated update" on models for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated delete" on models for delete using (auth.role() = 'authenticated');

create policy "authenticated select" on auta for select using (auth.role() = 'authenticated');
create policy "authenticated insert" on auta for insert with check (auth.role() = 'authenticated');
create policy "authenticated update" on auta for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated delete" on auta for delete using (auth.role() = 'authenticated');

create policy "authenticated select" on warianty for select using (auth.role() = 'authenticated');
create policy "authenticated insert" on warianty for insert with check (auth.role() = 'authenticated');
create policy "authenticated update" on warianty for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated delete" on warianty for delete using (auth.role() = 'authenticated');

create policy "authenticated select" on ean_bank for select using (auth.role() = 'authenticated');
create policy "authenticated insert" on ean_bank for insert with check (auth.role() = 'authenticated');
create policy "authenticated update" on ean_bank for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated delete" on ean_bank for delete using (auth.role() = 'authenticated');
