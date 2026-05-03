# nPisirsem Admin Web (Next.js + Firebase)

Bu klasör, Flutter mobil uygulamasını besleyen API katmanını ve admin panelini içerir.

## Özellikler

- Firebase Auth ile admin girişi
- Meal Type / Ingredient / Recipe CRUD
- JSON ve CSV toplu içe aktarma
- Public ingredient suggestion endpoint'i (auth yok)
- Tarif eşleşme algoritması (skor >= %85 filtre)

## Kurulum

```bash
cd admin-web
npm install
cp .env.example .env.local
npm run dev
```

## Environment

`.env.local` içinde doldur:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_STORAGE_BUCKET` (opsiyonel)
- `ADMIN_UID_ALLOWLIST` (opsiyonel, virgülle ayrılmış)

Not: `ADMIN_UID_ALLOWLIST` boşsa, admin endpointleri yalnızca Firebase custom claim (`admin: true` veya `role: "admin"`) olan kullanıcıları kabul eder.

## Firebase Koleksiyonları

- `meal_types`
- `ingredients`
- `recipes`
- `ingredient_suggestions`

## API Endpoint'leri

Public:

- `GET /api/public/bootstrap`
- `POST /api/public/recommendations`
- `POST /api/public/suggestions/ingredient`

Admin (Bearer Firebase ID token):

- `GET/POST /api/admin/meal-types`
- `GET/POST /api/admin/ingredients`
- `GET/POST /api/admin/recipes`
- `GET /api/admin/suggestions?status=pending|approved|rejected`
- `PATCH /api/admin/suggestions/:id`
- `POST /api/admin/import/json`
- `POST /api/admin/import/csv`

## Eşleşme Algoritması

`score = 100 * (0.45 * recall + 0.25 * precision + 0.30 * jaccard)`

- `recall = matched / recipeIngredients`
- `precision = matched / selectedIngredients`
- `jaccard = matched / union(selected, recipe)`

Varsayılan eşik: `85`

## Deployment

Vercel veya Render'a direkt deploy edilebilir.

- Build command: `npm run build`
- Start command: `npm run start`
- Runtime: Node.js 20+
