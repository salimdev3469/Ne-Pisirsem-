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

type MealTypeRow = {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
  imageUrl?: string | null;
  lottieUrl?: string | null;
};

type IngredientRow = {
  id: string;
  displayName: string;
  category: string;
  emoji: string;
  aliases?: string[];
  isActive: boolean;
};

type RecipeRow = {
  id: string;
  title: string;
  description?: string | null;
  mealTypeIds: string[];
  ingredientIds: string[];
  ingredients: string[];
  steps: string[];
  imageUrl?: string | null;
  sourceUrl?: string | null;
  youtubeUrl?: string | null;
  cookingTime?: string | null;
  difficulty?: string | null;
  isActive: boolean;
};

function splitMultiValue(input: string): string[] {
  return input
    .split(/[\n,;|]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinMultiValue(input: string[] | undefined): string {
  if (!input || input.length === 0) return '';
  return input.join('\n');
}

const initialMealTypeForm = {
  id: '',
  name: '',
  order: '0',
  imageUrl: '',
  lottieUrl: '',
  isActive: true
};

const initialIngredientForm = {
  id: '',
  displayName: '',
  category: 'Diğer',
  emoji: '🍽️',
  aliases: '',
  isActive: true
};

const initialRecipeForm = {
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
};

export default function AdminPage() {
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');

  const [status, setStatus] = useState('Hazır.');
  const [loading, setLoading] = useState(false);
  const [uploadingRecipeImage, setUploadingRecipeImage] = useState(false);

  const [mealTypes, setMealTypes] = useState<MealTypeRow[]>([]);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);

  const [mealTypeForm, setMealTypeForm] = useState(initialMealTypeForm);
  const [ingredientForm, setIngredientForm] = useState(initialIngredientForm);
  const [recipeForm, setRecipeForm] = useState(initialRecipeForm);
  const [recipeMealTypeSelectId, setRecipeMealTypeSelectId] = useState('');

  const [editingMealTypeId, setEditingMealTypeId] = useState<string | null>(null);
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);

  const [selectedRecipe, setSelectedRecipe] = useState<RecipeRow | null>(null);

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

  function resetMealTypeForm() {
    setMealTypeForm(initialMealTypeForm);
    setEditingMealTypeId(null);
  }

  function resetIngredientForm() {
    setIngredientForm(initialIngredientForm);
    setEditingIngredientId(null);
  }

  function resetRecipeForm() {
    setRecipeForm(initialRecipeForm);
    setRecipeMealTypeSelectId('');
    setEditingRecipeId(null);
  }

  function startMealTypeEdit(item: MealTypeRow) {
    setEditingMealTypeId(item.id);
    setMealTypeForm({
      id: item.id,
      name: item.name,
      order: String(item.order),
      imageUrl: item.imageUrl ?? '',
      lottieUrl: item.lottieUrl ?? '',
      isActive: item.isActive
    });
    setStatus(`Meal type düzenleniyor: ${item.name}`);
  }

  function startIngredientEdit(item: IngredientRow) {
    setEditingIngredientId(item.id);
    setIngredientForm({
      id: item.id,
      displayName: item.displayName,
      category: item.category,
      emoji: item.emoji,
      aliases: joinMultiValue(item.aliases),
      isActive: item.isActive
    });
    setStatus(`Ingredient düzenleniyor: ${item.displayName}`);
  }

  function startRecipeEdit(item: RecipeRow) {
    setEditingRecipeId(item.id);
    setRecipeMealTypeSelectId('');
    setRecipeForm({
      id: item.id,
      title: item.title,
      description: item.description ?? '',
      mealTypeIds: joinMultiValue(item.mealTypeIds),
      ingredients: joinMultiValue(item.ingredients.length > 0 ? item.ingredients : item.ingredientIds),
      steps: joinMultiValue(item.steps),
      imageUrl: item.imageUrl ?? '',
      sourceUrl: item.sourceUrl ?? '',
      youtubeUrl: item.youtubeUrl ?? '',
      cookingTime: item.cookingTime ?? '',
      difficulty: item.difficulty ?? '',
      isActive: item.isActive
    });
    setStatus(`Recipe düzenleniyor: ${item.title}`);
  }

  const recipeSelectedMealTypeIds = useMemo(
    () => splitMultiValue(recipeForm.mealTypeIds),
    [recipeForm.mealTypeIds]
  );

  const mealTypeNameById = useMemo(
    () =>
      new Map<string, string>(
        mealTypes.map((item) => [item.id, item.name])
      ),
    [mealTypes]
  );

  function setRecipeMealTypeIds(ids: string[]) {
    setRecipeForm((prev) => ({
      ...prev,
      mealTypeIds: ids.join('\n')
    }));
  }

  function addMealTypeToRecipe() {
    const nextId = recipeMealTypeSelectId.trim();
    if (!nextId) return;

    const ids = splitMultiValue(recipeForm.mealTypeIds);
    if (ids.includes(nextId)) return;

    setRecipeMealTypeIds([...ids, nextId]);
    setRecipeMealTypeSelectId('');
  }

  function removeMealTypeFromRecipe(id: string) {
    const ids = splitMultiValue(recipeForm.mealTypeIds).filter((item) => item !== id);
    setRecipeMealTypeIds(ids);
  }

  async function apiFetch<T = Record<string, unknown>>(
    path: string,
    options: RequestInit = {},
    requiresAuth = true
  ): Promise<T> {
    const headers = new Headers(options.headers ?? {});
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

    if (!isFormData && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (requiresAuth) {
      if (!token) throw new Error('Admin token yok. Önce giriş yapın.');
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(path, {
      ...options,
      headers
    });

    const contentType = response.headers.get('content-type') ?? '';
    const body = contentType.includes('application/json')
      ? await response.json().catch(() => ({}))
      : await response.text().catch(() => '');

    if (!response.ok) {
      if (body && typeof body === 'object' && 'message' in body) {
        throw new Error(String(body.message));
      }
      throw new Error(`Request failed: ${response.status}`);
    }

    return body as T;
  }

  async function refreshAdminData() {
    if (!canCallAdmin) return;

    setLoading(true);
    try {
      const [mealRes, ingRes, recipeRes, sugRes] = await Promise.all([
        apiFetch<{ items: MealTypeRow[] }>('/api/admin/meal-types'),
        apiFetch<{ items: IngredientRow[] }>('/api/admin/ingredients'),
        apiFetch<{ items: RecipeRow[] }>('/api/admin/recipes?includeInactive=1'),
        apiFetch<{ items: SuggestionRow[] }>('/api/admin/suggestions?status=pending')
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
    resetMealTypeForm();
    resetIngredientForm();
    resetRecipeForm();
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
          imageUrl: mealTypeForm.imageUrl,
          lottieUrl: mealTypeForm.lottieUrl,
          isActive: mealTypeForm.isActive
        })
      });
      resetMealTypeForm();
      await refreshAdminData();
      setStatus('Meal type kaydedildi.');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Meal type kaydedilemedi';
      setStatus(msg);
      alert(msg);
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
      resetIngredientForm();
      await refreshAdminData();
      setStatus('Ingredient kaydedildi.');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Ingredient kaydedilemedi';
      setStatus(msg);
      alert(msg);
    } finally {
      setLoading(false);
    }
  }

  async function saveRecipe(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const mealTypeIds = splitMultiValue(recipeForm.mealTypeIds);
      if (mealTypeIds.length === 0) {
        throw new Error('En az bir yemek türü seçmelisin.');
      }

      await apiFetch('/api/admin/recipes', {
        method: 'POST',
        body: JSON.stringify({
          id: recipeForm.id || undefined,
          title: recipeForm.title,
          description: recipeForm.description,
          mealTypeIds,
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

      resetRecipeForm();
      await refreshAdminData();
      setStatus('Recipe kaydedildi.');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Recipe kaydedilemedi';
      setStatus(msg);
      alert(msg);
    } finally {
      setLoading(false);
    }
  }

  async function deleteMealTypeById(id: string) {
    if (!window.confirm('Meal type silinsin mi?')) return;

    setLoading(true);
    try {
      await apiFetch('/api/admin/meal-types', {
        method: 'DELETE',
        body: JSON.stringify({ id })
      });
      if (editingMealTypeId === id) resetMealTypeForm();
      await refreshAdminData();
      setStatus('Meal type silindi.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Meal type silinemedi');
    } finally {
      setLoading(false);
    }
  }

  async function deleteIngredientById(id: string) {
    if (!window.confirm('Ingredient silinsin mi?')) return;

    setLoading(true);
    try {
      await apiFetch('/api/admin/ingredients', {
        method: 'DELETE',
        body: JSON.stringify({ id })
      });
      if (editingIngredientId === id) resetIngredientForm();
      await refreshAdminData();
      setStatus('Ingredient silindi.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Ingredient silinemedi');
    } finally {
      setLoading(false);
    }
  }

  async function deleteRecipeById(id: string) {
    if (!window.confirm('Recipe silinsin mi?')) return;

    setLoading(true);
    try {
      await apiFetch('/api/admin/recipes', {
        method: 'DELETE',
        body: JSON.stringify({ id })
      });
      if (selectedRecipe?.id === id) setSelectedRecipe(null);
      if (editingRecipeId === id) resetRecipeForm();
      await refreshAdminData();
      setStatus('Recipe silindi.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Recipe silinemedi');
    } finally {
      setLoading(false);
    }
  }

  async function importJson() {
    setLoading(true);
    try {
      const parsed = JSON.parse(jsonPayload);
      const response = await apiFetch<{ imported: Record<string, number> }>('/api/admin/import/json', {
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
      const response = await apiFetch<{ imported: number }>('/api/admin/import/csv', {
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

  async function uploadRecipeImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingRecipeImage(true);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiFetch<{ url: string }>('/api/admin/upload-image', {
        method: 'POST',
        body: formData
      });

      setRecipeForm((prev) => ({ ...prev, imageUrl: response.url ?? '' }));
      setStatus('Recipe fotoğrafı yüklendi.');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Fotoğraf yükleme hatası';
      setStatus(msg);
      alert(msg);
    } finally {
      setUploadingRecipeImage(false);
      setLoading(false);
      event.target.value = '';
    }
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
              <h2>{editingMealTypeId ? 'Meal Type Düzenle' : 'Meal Type Ekle'}</h2>
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
              <div className="field">
                <label>Görsel URL</label>
                <input
                  value={mealTypeForm.imageUrl}
                  onChange={(e) => setMealTypeForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Lottie URL</label>
                <input
                  value={mealTypeForm.lottieUrl}
                  onChange={(e) => setMealTypeForm((prev) => ({ ...prev, lottieUrl: e.target.value }))}
                />
              </div>
              <div className="field checkbox">
                <input
                  id="meal-type-active"
                  type="checkbox"
                  checked={mealTypeForm.isActive}
                  onChange={(e) => setMealTypeForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                <label htmlFor="meal-type-active">Aktif</label>
              </div>
              <div className="row">
                <button type="submit" disabled={loading}>
                  {editingMealTypeId ? 'Güncelle' : 'Kaydet'}
                </button>
                {editingMealTypeId && (
                  <button type="button" className="secondary" onClick={resetMealTypeForm}>
                    İptal
                  </button>
                )}
              </div>
            </form>

            <form className="card" onSubmit={saveIngredient}>
              <h2>{editingIngredientId ? 'Ingredient Düzenle' : 'Ingredient Ekle'}</h2>
              <div className="field">
                <label>ID (opsiyonel)</label>
                <input
                  value={ingredientForm.id}
                  onChange={(e) => setIngredientForm((prev) => ({ ...prev, id: e.target.value }))}
                />
              </div>
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
              <div className="field checkbox">
                <input
                  id="ingredient-active"
                  type="checkbox"
                  checked={ingredientForm.isActive}
                  onChange={(e) => setIngredientForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                <label htmlFor="ingredient-active">Aktif</label>
              </div>
              <div className="row">
                <button type="submit" disabled={loading}>
                  {editingIngredientId ? 'Güncelle' : 'Kaydet'}
                </button>
                {editingIngredientId && (
                  <button type="button" className="secondary" onClick={resetIngredientForm}>
                    İptal
                  </button>
                )}
              </div>
            </form>

            <form className="card" onSubmit={saveRecipe}>
              <h2>{editingRecipeId ? 'Recipe Düzenle' : 'Recipe Ekle'}</h2>
              <div className="field">
                <label>ID (opsiyonel)</label>
                <input
                  value={recipeForm.id}
                  onChange={(e) => setRecipeForm((prev) => ({ ...prev, id: e.target.value }))}
                />
              </div>
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
                <label>Yemek Türü Seç</label>
                <div className="row">
                  <select
                    value={recipeMealTypeSelectId}
                    onChange={(e) => setRecipeMealTypeSelectId(e.target.value)}
                  >
                    <option value="">Yemek türü seç...</option>
                    {mealTypes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.id})
                      </option>
                    ))}
                  </select>
                  <button type="button" className="secondary" onClick={addMealTypeToRecipe}>
                    Ekle
                  </button>
                </div>
                <div className="row" style={{ marginTop: 8 }}>
                  {recipeSelectedMealTypeIds.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className="secondary"
                      onClick={() => removeMealTypeFromRecipe(id)}
                      title="Kaldır"
                    >
                      {mealTypeNameById.get(id) ?? id} ×
                    </button>
                  ))}
                </div>
                <div className="meta">
                  Seçilen ID&apos;ler: {recipeSelectedMealTypeIds.join(', ') || '-'}
                </div>
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
              <div className="field">
                <label>Fotoğraf yükle</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={uploadRecipeImage}
                  disabled={loading || uploadingRecipeImage}
                />
                <div className="meta">
                  {uploadingRecipeImage ? 'Yükleniyor...' : 'Yükledikten sonra URL otomatik doldurulur.'}
                </div>
              </div>
              <div className="field">
                <label>Image URL</label>
                <input
                  value={recipeForm.imageUrl}
                  onChange={(e) => setRecipeForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Kaynak URL</label>
                <input
                  value={recipeForm.sourceUrl}
                  onChange={(e) => setRecipeForm((prev) => ({ ...prev, sourceUrl: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>YouTube URL</label>
                <input
                  value={recipeForm.youtubeUrl}
                  onChange={(e) => setRecipeForm((prev) => ({ ...prev, youtubeUrl: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Pişirme Süresi</label>
                <input
                  value={recipeForm.cookingTime}
                  onChange={(e) => setRecipeForm((prev) => ({ ...prev, cookingTime: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Zorluk</label>
                <input
                  value={recipeForm.difficulty}
                  onChange={(e) => setRecipeForm((prev) => ({ ...prev, difficulty: e.target.value }))}
                />
              </div>
              <div className="field checkbox">
                <input
                  id="recipe-active"
                  type="checkbox"
                  checked={recipeForm.isActive}
                  onChange={(e) => setRecipeForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                <label htmlFor="recipe-active">Aktif</label>
              </div>
              <div className="row">
                <button type="submit" disabled={loading}>
                  {editingRecipeId ? 'Güncelle' : 'Kaydet'}
                </button>
                {editingRecipeId && (
                  <button type="button" className="secondary" onClick={resetRecipeForm}>
                    İptal
                  </button>
                )}
              </div>
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
                {mealTypes.map((item) => (
                  <li key={item.id}>
                    <div className="list-row">
                      <div>
                        <strong>{item.name}</strong>
                        {!item.isActive && <span className="meta"> (pasif)</span>}
                        <div className="meta mono">{item.id}</div>
                        {item.imageUrl && (
                          <a className="meta" href={item.imageUrl} target="_blank" rel="noreferrer">
                            imageUrl
                          </a>
                        )}
                      </div>
                      <div className="row">
                        <button type="button" className="secondary" onClick={() => startMealTypeEdit(item)}>
                          Düzenle
                        </button>
                        <button type="button" className="danger" onClick={() => deleteMealTypeById(item.id)}>
                          Sil
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card">
              <h2>Ingredients ({ingredients.length})</h2>
              <ul className="list">
                {ingredients.map((item) => (
                  <li key={item.id}>
                    <div className="list-row">
                      <div>
                        <strong>{item.emoji} {item.displayName}</strong>
                        {!item.isActive && <span className="meta"> (pasif)</span>}
                        <div className="meta mono">{item.id}</div>
                        <div className="meta">kategori: {item.category}</div>
                      </div>
                      <div className="row">
                        <button type="button" className="secondary" onClick={() => startIngredientEdit(item)}>
                          Düzenle
                        </button>
                        <button type="button" className="danger" onClick={() => deleteIngredientById(item.id)}>
                          Sil
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card">
              <h2>Recipes ({recipes.length})</h2>
              <ul className="list">
                {recipes.map((item) => (
                  <li key={item.id}>
                    <div className="list-row">
                      <div>
                        <strong>{item.title}</strong>
                        {!item.isActive && <span className="meta"> (pasif)</span>}
                        <div className="meta mono">{item.id}</div>
                        <div className="meta">{item.ingredientIds.length} ingredient</div>
                      </div>
                      <div className="row">
                        <button type="button" onClick={() => setSelectedRecipe(item)}>
                          Detay
                        </button>
                        <button type="button" className="secondary" onClick={() => startRecipeEdit(item)}>
                          Düzenle
                        </button>
                        <button type="button" className="danger" onClick={() => deleteRecipeById(item.id)}>
                          Sil
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}

      {selectedRecipe && (
        <div className="modal-overlay" onClick={() => setSelectedRecipe(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedRecipe.title}</h2>
              <button type="button" className="secondary" onClick={() => setSelectedRecipe(null)}>
                Kapat
              </button>
            </div>

            <div className="meta mono">{selectedRecipe.id}</div>

            {selectedRecipe.imageUrl && (
              <img
                src={selectedRecipe.imageUrl}
                alt={selectedRecipe.title}
                className="recipe-image"
              />
            )}

            <p>{selectedRecipe.description || 'Açıklama yok.'}</p>

            <div className="row">
              {selectedRecipe.sourceUrl && (
                <a href={selectedRecipe.sourceUrl} target="_blank" rel="noreferrer">
                  Kaynak Linki
                </a>
              )}
              {selectedRecipe.youtubeUrl && (
                <a href={selectedRecipe.youtubeUrl} target="_blank" rel="noreferrer">
                  YouTube Linki
                </a>
              )}
            </div>

            <div className="detail-grid">
              <div>
                <h3>Meal Types</h3>
                <p className="meta">{selectedRecipe.mealTypeIds.join(', ') || '-'}</p>
              </div>
              <div>
                <h3>Pişirme</h3>
                <p className="meta">
                  Süre: {selectedRecipe.cookingTime || '-'} | Zorluk: {selectedRecipe.difficulty || '-'}
                </p>
              </div>
            </div>

            <h3>Ingredients</h3>
            <ul>
              {selectedRecipe.ingredients.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
              {selectedRecipe.ingredients.length === 0 && <li>-</li>}
            </ul>

            <h3>Steps</h3>
            <ol>
              {selectedRecipe.steps.map((step, index) => (
                <li key={`${step}-${index}`}>{step}</li>
              ))}
              {selectedRecipe.steps.length === 0 && <li>-</li>}
            </ol>
          </div>
        </div>
      )}
    </main>
  );
}
