'use client';

import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';

import { firebaseAuth } from '@/lib/firebase-client';

type SuggestionRow = {
  id: string;
  name: string;
  normalizedName: string;
  categoryHint?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  moderationNote?: string | null;
};

type MealTypeRow = { id: string; name: string; order: number; isActive: boolean };
type IngredientRow = { id: string; displayName: string; category: string; isActive: boolean };
type RecipeRow = { id: string; title: string; mealTypeIds: string[]; ingredientIds: string[] };

function splitMultiValue(input: string): string[] {
  return input
    .split(/[\n,;|]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AdminPage() {
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');

  const [status, setStatus] = useState('Hazır.');
  const [loading, setLoading] = useState(false);

  const [mealTypes, setMealTypes] = useState<MealTypeRow[]>([]);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);

  const [mealTypeForm, setMealTypeForm] = useState({
    id: '',
    name: '',
    order: '0',
    isActive: true
  });

  const [ingredientForm, setIngredientForm] = useState({
    id: '',
    displayName: '',
    category: 'Diğer',
    emoji: '🍽️',
    aliases: '',
    isActive: true
  });

  const [recipeForm, setRecipeForm] = useState({
    id: '',
    title: '',
    description: '',
    mealTypeIds: '',
    ingredients: '',
    steps: '',
    imageUrl: '',
    sourceUrl: '',
    youtubeUrl: '',
    cookingTime: '',
    difficulty: '',
    isActive: true
  });

  const [jsonPayload, setJsonPayload] = useState('');
  const [csvPayload, setCsvPayload] = useState('');
  const [csvTarget, setCsvTarget] = useState<'mealTypes' | 'ingredients' | 'recipes'>('recipes');

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        setToken('');
        setStatus('Admin giriş bekleniyor.');
        return;
      }

      const idToken = await user.getIdToken();
      setToken(idToken);
      setStatus(`Giriş başarılı: ${user.email ?? user.uid}`);
    });

    return () => unsub();
  }, []);

  const canCallAdmin = useMemo(() => token.length > 10, [token]);

  useEffect(() => {
    if (!canCallAdmin) return;
    refreshAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canCallAdmin]);

  async function apiFetch(path: string, options: RequestInit = {}, requiresAuth = true) {
    const headers = new Headers(options.headers ?? {});
    headers.set('Content-Type', 'application/json');

    if (requiresAuth) {
      if (!token) throw new Error('Admin token yok. Önce giriş yapın.');
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(path, {
      ...options,
      headers
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(body?.message ?? `Request failed: ${response.status}`);
    }

    return body;
  }

  async function refreshAdminData() {
    if (!canCallAdmin) return;

    setLoading(true);
    try {
      const [mealRes, ingRes, recipeRes, sugRes] = await Promise.all([
        apiFetch('/api/admin/meal-types'),
        apiFetch('/api/admin/ingredients'),
        apiFetch('/api/admin/recipes'),
        apiFetch('/api/admin/suggestions?status=pending')
      ]);

      setMealTypes(mealRes.items ?? []);
      setIngredients(ingRes.items ?? []);
      setRecipes(recipeRes.items ?? []);
      setSuggestions(sugRes.items ?? []);
      setStatus('Admin verileri yenilendi.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Yenileme hatası');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(firebaseAuth, userEmail.trim(), password);
      setPassword('');
      setStatus('Giriş başarılı.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await signOut(firebaseAuth);
    setToken('');
    setMealTypes([]);
    setIngredients([]);
    setRecipes([]);
    setSuggestions([]);
    setStatus('Çıkış yapıldı.');
  }

  async function saveMealType(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await apiFetch('/api/admin/meal-types', {
        method: 'POST',
        body: JSON.stringify({
          id: mealTypeForm.id || undefined,
          name: mealTypeForm.name,
          order: Number(mealTypeForm.order || 0),
          isActive: mealTypeForm.isActive
        })
      });
      setMealTypeForm({ id: '', name: '', order: '0', isActive: true });
      await refreshAdminData();
      setStatus('Meal type kaydedildi.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Meal type kaydedilemedi');
    } finally {
      setLoading(false);
    }
  }

  async function saveIngredient(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await apiFetch('/api/admin/ingredients', {
        method: 'POST',
        body: JSON.stringify({
          id: ingredientForm.id || undefined,
          displayName: ingredientForm.displayName,
          category: ingredientForm.category,
          emoji: ingredientForm.emoji,
          aliases: splitMultiValue(ingredientForm.aliases),
          isActive: ingredientForm.isActive
        })
      });
      setIngredientForm({
        id: '',
        displayName: '',
        category: 'Diğer',
        emoji: '🍽️',
        aliases: '',
        isActive: true
      });
      await refreshAdminData();
      setStatus('Ingredient kaydedildi.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Ingredient kaydedilemedi');
    } finally {
      setLoading(false);
    }
  }

  async function saveRecipe(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await apiFetch('/api/admin/recipes', {
        method: 'POST',
        body: JSON.stringify({
          id: recipeForm.id || undefined,
          title: recipeForm.title,
          description: recipeForm.description,
          mealTypeIds: splitMultiValue(recipeForm.mealTypeIds),
          ingredients: splitMultiValue(recipeForm.ingredients),
          steps: splitMultiValue(recipeForm.steps),
          imageUrl: recipeForm.imageUrl,
          sourceUrl: recipeForm.sourceUrl,
          youtubeUrl: recipeForm.youtubeUrl,
          cookingTime: recipeForm.cookingTime,
          difficulty: recipeForm.difficulty,
          isActive: recipeForm.isActive
        })
      });

      setRecipeForm({
        id: '',
        title: '',
        description: '',
        mealTypeIds: '',
        ingredients: '',
        steps: '',
        imageUrl: '',
        sourceUrl: '',
        youtubeUrl: '',
        cookingTime: '',
        difficulty: '',
        isActive: true
      });
      await refreshAdminData();
      setStatus('Recipe kaydedildi.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Recipe kaydedilemedi');
    } finally {
      setLoading(false);
    }
  }

  async function importJson() {
    setLoading(true);
    try {
      const parsed = JSON.parse(jsonPayload);
      const response = await apiFetch('/api/admin/import/json', {
        method: 'POST',
        body: JSON.stringify(parsed)
      });
      await refreshAdminData();
      setStatus(`JSON import tamam: ${JSON.stringify(response.imported)}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'JSON import hatası');
    } finally {
      setLoading(false);
    }
  }

  async function importCsv() {
    setLoading(true);
    try {
      const response = await apiFetch('/api/admin/import/csv', {
        method: 'POST',
        body: JSON.stringify({ target: csvTarget, csv: csvPayload })
      });
      await refreshAdminData();
      setStatus(`CSV import tamam: ${response.imported} kayıt`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'CSV import hatası');
    } finally {
      setLoading(false);
    }
  }

  async function decideSuggestion(id: string, statusValue: 'approved' | 'rejected') {
    setLoading(true);
    try {
      await apiFetch(`/api/admin/suggestions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: statusValue })
      });
      await refreshAdminData();
      setStatus(`Suggestion ${statusValue} olarak güncellendi.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Suggestion güncellenemedi');
    } finally {
      setLoading(false);
    }
  }

  async function loadJsonFromFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setJsonPayload(content);
  }

  async function loadCsvFromFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setCsvPayload(content);
  }

  return (
    <main className="container">
      <header className="header">
        <section className="hero">
          <h1>Admin Panel</h1>
          <p>
            Firebase Auth ile giriş yap. Meal Type, Ingredient ve Recipe verilerini yönet,
            CSV/JSON toplu yükle ve kullanıcı önerilerini onayla.
          </p>
          <div className="row">
            <button onClick={refreshAdminData} disabled={!canCallAdmin || loading}>
              Veriyi Yenile
            </button>
            <button onClick={handleLogout} className="secondary" disabled={!canCallAdmin || loading}>
              Çıkış
            </button>
          </div>
          <div className="status">{status}</div>
        </section>
      </header>

      {!canCallAdmin && (
        <section className="card">
          <h2>Admin Girişi</h2>
          <form onSubmit={handleLogin}>
            <div className="field">
              <label>E-posta</label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Şifre</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={loading}>
              Giriş Yap
            </button>
          </form>
        </section>
      )}

      {canCallAdmin && (
        <>
          <section className="grid">
            <form className="card" onSubmit={saveMealType}>
              <h2>Meal Type Ekle</h2>
              <div className="field">
                <label>ID (opsiyonel)</label>
                <input
                  value={mealTypeForm.id}
                  onChange={(e) => setMealTypeForm((prev) => ({ ...prev, id: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Ad</label>
                <input
                  required
                  value={mealTypeForm.name}
                  onChange={(e) => setMealTypeForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Sıra</label>
                <input
                  value={mealTypeForm.order}
                  onChange={(e) => setMealTypeForm((prev) => ({ ...prev, order: e.target.value }))}
                />
              </div>
              <button type="submit" disabled={loading}>
                Kaydet
              </button>
            </form>

            <form className="card" onSubmit={saveIngredient}>
              <h2>Ingredient Ekle</h2>
              <div className="field">
                <label>Ad</label>
                <input
                  required
                  value={ingredientForm.displayName}
                  onChange={(e) =>
                    setIngredientForm((prev) => ({ ...prev, displayName: e.target.value }))
                  }
                />
              </div>
              <div className="field">
                <label>Kategori</label>
                <input
                  value={ingredientForm.category}
                  onChange={(e) => setIngredientForm((prev) => ({ ...prev, category: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Emoji</label>
                <input
                  value={ingredientForm.emoji}
                  onChange={(e) => setIngredientForm((prev) => ({ ...prev, emoji: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Alias (virgül/newline/|)</label>
                <textarea
                  value={ingredientForm.aliases}
                  onChange={(e) => setIngredientForm((prev) => ({ ...prev, aliases: e.target.value }))}
                />
              </div>
              <button type="submit" disabled={loading}>
                Kaydet
              </button>
            </form>

            <form className="card" onSubmit={saveRecipe}>
              <h2>Recipe Ekle</h2>
              <div className="field">
                <label>Başlık</label>
                <input
                  required
                  value={recipeForm.title}
                  onChange={(e) => setRecipeForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Açıklama</label>
                <textarea
                  value={recipeForm.description}
                  onChange={(e) => setRecipeForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>MealType IDs (virgül/newline/|)</label>
                <textarea
                  required
                  value={recipeForm.mealTypeIds}
                  onChange={(e) => setRecipeForm((prev) => ({ ...prev, mealTypeIds: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Ingredients (virgül/newline/|)</label>
                <textarea
                  required
                  value={recipeForm.ingredients}
                  onChange={(e) => setRecipeForm((prev) => ({ ...prev, ingredients: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Steps (virgül/newline/|)</label>
                <textarea
                  required
                  value={recipeForm.steps}
                  onChange={(e) => setRecipeForm((prev) => ({ ...prev, steps: e.target.value }))}
                />
              </div>
              <button type="submit" disabled={loading}>
                Kaydet
              </button>
            </form>
          </section>

          <div className="hr" />

          <section className="grid">
            <div className="card">
              <h2>Toplu JSON Import</h2>
              <p className="meta">Doğrudan recipe array veya {`{ mealTypes, ingredients, recipes }`} objesi kabul eder.</p>
              <div className="field">
                <label>JSON dosyası seç</label>
                <input type="file" accept="application/json" onChange={loadJsonFromFile} />
              </div>
              <div className="field">
                <label>JSON İçeriği</label>
                <textarea value={jsonPayload} onChange={(e) => setJsonPayload(e.target.value)} />
              </div>
              <button onClick={importJson} disabled={loading || jsonPayload.trim().length === 0}>
                JSON Yükle
              </button>
            </div>

            <div className="card">
              <h2>Toplu CSV Import</h2>
              <p className="meta">CSV başlıkları hedef tipe göre eşleşmeli.</p>
              <div className="field">
                <label>Hedef</label>
                <select value={csvTarget} onChange={(e) => setCsvTarget(e.target.value as typeof csvTarget)}>
                  <option value="recipes">recipes</option>
                  <option value="ingredients">ingredients</option>
                  <option value="mealTypes">mealTypes</option>
                </select>
              </div>
              <div className="field">
                <label>CSV dosyası seç</label>
                <input type="file" accept=".csv,text/csv" onChange={loadCsvFromFile} />
              </div>
              <div className="field">
                <label>CSV İçeriği</label>
                <textarea value={csvPayload} onChange={(e) => setCsvPayload(e.target.value)} />
              </div>
              <button onClick={importCsv} disabled={loading || csvPayload.trim().length === 0}>
                CSV Yükle
              </button>
            </div>

            <div className="card">
              <h2>Pending Suggestion</h2>
              <ul className="list">
                {suggestions.map((item) => (
                  <li key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <div className="meta">
                        kategori: {item.categoryHint || '-'} | id: <span className="mono">{item.id}</span>
                      </div>
                    </div>
                    <div className="row" style={{ marginTop: 8 }}>
                      <button
                        disabled={loading}
                        onClick={() => decideSuggestion(item.id, 'approved')}
                      >
                        Onayla
                      </button>
                      <button
                        disabled={loading}
                        className="danger"
                        onClick={() => decideSuggestion(item.id, 'rejected')}
                      >
                        Reddet
                      </button>
                    </div>
                  </li>
                ))}
                {suggestions.length === 0 && <li>Bekleyen suggestion yok.</li>}
              </ul>
            </div>
          </section>

          <div className="hr" />

          <section className="grid">
            <div className="card">
              <h2>Meal Types ({mealTypes.length})</h2>
              <ul className="list">
                {mealTypes.slice(0, 8).map((item) => (
                  <li key={item.id}>
                    <strong>{item.name}</strong>
                    <div className="meta mono">{item.id}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card">
              <h2>Ingredients ({ingredients.length})</h2>
              <ul className="list">
                {ingredients.slice(0, 8).map((item) => (
                  <li key={item.id}>
                    <strong>{item.displayName}</strong>
                    <div className="meta mono">{item.id}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card">
              <h2>Recipes ({recipes.length})</h2>
              <ul className="list">
                {recipes.slice(0, 8).map((item) => (
                  <li key={item.id}>
                    <strong>{item.title}</strong>
                    <div className="meta mono">{item.id}</div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
