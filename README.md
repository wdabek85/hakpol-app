# 🔧 HakPol — Mapa Ofert Allegro

Aplikacja do zarządzania katalogiem haków holowniczych, mapowania modeli na auta, walidacji EAN-ów i śledzenia ofert na 3 kontach Allegro.

## ⚡ Szybki start

### 1. Supabase (baza danych — za darmo)

1. Wejdź na [supabase.com](https://supabase.com) → **Start your project** (załóż konto przez GitHub)
2. Kliknij **New Project**, nazwij "hakpol", wybierz region **eu-central-1**, ustaw hasło
3. Poczekaj ~2 min aż projekt się utworzy
4. Idź do **SQL Editor** (ikona w menu po lewej)
5. Wklej zawartość pliku `supabase/migrations/001_initial.sql` → kliknij **Run**
6. Idź do **Settings → API** → skopiuj:
   - **Project URL** (np. `https://xxxxx.supabase.co`)
   - **anon public** key (długi ciąg znaków)

### 2. Aplikacja

```bash
# Zainstaluj Node.js 18+ jeśli nie masz: https://nodejs.org

# Sklonuj / rozpakuj projekt
cd hakpol-app

# Zainstaluj zależności
npm install

# Skopiuj plik konfiguracji
cp .env.example .env

# Wklej swoje dane z Supabase do .env
# VITE_SUPABASE_URL=https://xxxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhb...

# Uruchom
npm run dev
```

Otwórz http://localhost:5173

### 3. Deploy (udostępnienie klientowi)

**Vercel (najprostszy):**
```bash
npm i -g vercel
vercel
# Podaj zmienne środowiskowe gdy zapyta
```

**Netlify:**
```bash
npm run build
# Wrzuć folder `dist/` na netlify.com/drop
# Dodaj zmienne w Settings → Environment variables
```

## 🏗 Struktura

```
src/
├── main.jsx              # Entry point
├── App.jsx               # Router zakładek
├── supabase.js           # Klient Supabase
├── store.js              # Stan globalny (Context)
├── components/
│   ├── Header.jsx        # Nagłówek + nawigacja
│   ├── Dashboard.jsx     # 🏠 Panel główny
│   ├── Catalog.jsx       # 📦 Katalog (lista + detail)
│   ├── ModelList.jsx     # Lista modeli (sidebar)
│   ├── ModelDetail.jsx   # Szczegóły modelu
│   ├── AutoCard.jsx      # Karta auta z wariantami
│   ├── VariantRow.jsx    # Wiersz wariantu (EAN, cena, konta)
│   └── EanBank.jsx       # 📋 Bank EAN
├── hooks/
│   ├── useModels.js      # CRUD modeli/aut/wariantów
│   ├── useEanBank.js     # CRUD banku EAN
│   └── useEanValidation.js # Walidacja EAN (duplikaty, zły model)
├── utils/
│   ├── constants.js      # WIAZKI, KONTA, kolory
│   ├── csvExport.js      # Eksport CSV
│   └── formatters.js     # Formatowanie nr katalogowego
```

## 📊 Baza danych (Supabase)

- **models** — modele haków (nr_kat, uwagi)
- **auta** — auta przypisane do modeli
- **warianty** — warianty wiązki (EAN, cena, oferty per konto, duplikaty)
- **ean_bank** — bank EAN-ów od producenta

Dane synchronizują się w real-time między wszystkimi użytkownikami.

## 🔐 Bezpieczeństwo

Supabase Row Level Security (RLS) jest wyłączony dla prostoty.
Jeśli chcesz ograniczyć dostęp, włącz RLS i dodaj polityki w Supabase Dashboard.
