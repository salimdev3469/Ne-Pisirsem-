import { FieldValue } from 'firebase-admin/firestore';

import { adminDb } from './firebase-admin';
import { ingredientIdFromName, mealTypeIdFromName, normalizeText } from './normalize';
import type { IngredientDoc, MealTypeDoc, RecipeDoc, SuggestionDoc } from './types';

const COLLECTIONS = {
  mealTypes: 'meal_types',
  ingredients: 'ingredients',
  recipes: 'recipes',
  ingredientSuggestions: 'ingredient_suggestions'
} as const;

const DEFAULT_MEAL_TYPE_ID = 'meal_genel';

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item)).filter(Boolean);
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return fallback;
}

function extractIngredientIdsFromRefs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const ids: string[] = [];
  for (const item of value) {
    if (typeof item === 'string') {
      const normalized = item.trim();
      if (normalized) ids.push(normalized);
      continue;
    }

    if (item && typeof item === 'object') {
      const row = item as Record<string, unknown>;
      const id =
        asString(row.ingredientId) ||
        asString(row.id) ||
        asString(row.ref) ||
        asString(row.name);

      if (id) ids.push(id);
    }
  }

  return ids;
}

function mapMealType(id: string, data: Record<string, unknown>): MealTypeDoc {
  return {
    id,
    name: asString(data.name),
    order: asNumber(data.order, 0),
    isActive: asBoolean(data.isActive, true),
    imageUrl: asString(data.imageUrl) || null,
    lottieUrl: asString(data.lottieUrl) || null
  };
}

function mapIngredient(id: string, data: Record<string, unknown>): IngredientDoc {
  const displayName = asString(data.displayName || data.name);
  return {
    id,
    displayName,
    normalizedName: asString(data.normalizedName) || normalizeText(displayName),
    category: asString(data.category) || 'Diğer',
    emoji: asString(data.emoji) || '🍽️',
    aliases: asStringList(data.aliases),
    isActive: asBoolean(data.isActive, true)
  };
}

function mapRecipe(id: string, data: Record<string, unknown>): RecipeDoc {
  const ingredientIds =
    asStringList(data.ingredientIds).length > 0
      ? asStringList(data.ingredientIds)
      : extractIngredientIdsFromRefs(data.ingredientRefs);

  const cookingTimeText = asString(data.cookingTime);
  const cookingTimeMinutes =
    typeof data.cookingTimeMinutes === 'number' && Number.isFinite(data.cookingTimeMinutes)
      ? `${Math.round(data.cookingTimeMinutes)} dk`
      : '';

  return {
    id,
    title: asString(data.title),
    description: asString(data.description) || null,
    mealTypeIds: asStringList(data.mealTypeIds),
    ingredientIds: [...new Set(ingredientIds)],
    ingredients: asStringList(data.ingredients),
    steps: asStringList(data.steps),
    imageUrl: asString(data.imageUrl) || null,
    sourceUrl: asString(data.sourceUrl) || null,
    youtubeUrl: asString(data.youtubeUrl) || null,
    cookingTime: cookingTimeText || cookingTimeMinutes || null,
    difficulty: asString(data.difficulty) || null,
    isActive: asBoolean(data.isActive, true)
  };
}

function normalizeIngredientIdentity(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('ing_')) {
    return normalizeText(trimmed);
  }

  return normalizeText(ingredientIdFromName(trimmed));
}

function normalizeMealTypeIdentity(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('meal_')) {
    return normalizeText(trimmed);
  }

  return normalizeText(mealTypeIdFromName(trimmed));
}

export async function fetchMealTypes(activeOnly = true): Promise<MealTypeDoc[]> {
  const snapshot = await adminDb.collection(COLLECTIONS.mealTypes).get();

  const rows = snapshot.docs
    .map((doc) => mapMealType(doc.id, doc.data() as Record<string, unknown>))
    .filter((item) => (activeOnly ? item.isActive : true))
    .sort((a, b) => a.order - b.order);

  return rows;
}

export async function fetchIngredients(activeOnly = true): Promise<IngredientDoc[]> {
  const snapshot = await adminDb.collection(COLLECTIONS.ingredients).get();

  const rows = snapshot.docs
    .map((doc) => mapIngredient(doc.id, doc.data() as Record<string, unknown>))
    .filter((item) => (activeOnly ? item.isActive : true))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'tr'));

  return rows;
}

export async function fetchRecipesForMealType(
  mealTypeId: string,
  maxItems = 250,
  activeOnly = true
): Promise<RecipeDoc[]> {
  let query = adminDb.collection(COLLECTIONS.recipes).limit(maxItems);

  if (activeOnly) {
    query = query.where('isActive', '==', true);
  }

  if (mealTypeId.trim().length > 0) {
    query = query.where('mealTypeIds', 'array-contains', mealTypeId.trim());
  }

  const snapshot = await query.get();

  return snapshot.docs
    .map((doc) => mapRecipe(doc.id, doc.data() as Record<string, unknown>))
    .filter((item) => item.title.length > 0);
}

export async function submitIngredientSuggestion(input: {
  name: string;
  categoryHint?: string;
}) {
  const name = input.name.trim();
  const categoryHint = (input.categoryHint ?? '').trim();

  const ref = await adminDb.collection(COLLECTIONS.ingredientSuggestions).add({
    type: 'ingredient',
    name,
    normalizedName: normalizeText(name),
    categoryHint: categoryHint || null,
    status: 'pending',
    moderationNote: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  return ref.id;
}

export async function upsertMealType(input: {
  id?: string;
  name: string;
  order?: number;
  isActive?: boolean;
  imageUrl?: string;
  lottieUrl?: string;
}): Promise<string> {
  const name = input.name.trim();
  const id = (input.id ?? '').trim() || mealTypeIdFromName(name);
  const ref = adminDb.collection(COLLECTIONS.mealTypes).doc(id);
  const snap = await ref.get();

  await ref.set(
    {
      id,
      name,
      order: typeof input.order === 'number' ? input.order : 0,
      isActive: input.isActive ?? true,
      imageUrl: (input.imageUrl ?? '').trim() || null,
      lottieUrl: (input.lottieUrl ?? '').trim() || null,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: snap.exists
        ? (snap.data() as Record<string, unknown>)?.createdAt ?? FieldValue.serverTimestamp()
        : FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  return id;
}

export async function upsertIngredient(input: {
  id?: string;
  displayName: string;
  category?: string;
  emoji?: string;
  aliases?: string[];
  isActive?: boolean;
}): Promise<string> {
  const displayName = input.displayName.trim();
  const id = (input.id ?? '').trim() || ingredientIdFromName(displayName);
  const ref = adminDb.collection(COLLECTIONS.ingredients).doc(id);
  const snap = await ref.get();

  const normalizedName = normalizeText(displayName);
  const aliases = new Set<string>([
    normalizedName,
    ...(input.aliases ?? []).map((item) => normalizeText(item)).filter(Boolean)
  ]);

  await ref.set(
    {
      id,
      displayName,
      normalizedName,
      category: (input.category ?? '').trim() || 'Diğer',
      emoji: (input.emoji ?? '').trim() || '🍽️',
      aliases: [...aliases],
      isActive: input.isActive ?? true,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: snap.exists
        ? (snap.data() as Record<string, unknown>)?.createdAt ?? FieldValue.serverTimestamp()
        : FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  return id;
}

export async function upsertRecipe(input: {
  id?: string;
  title: string;
  description?: string;
  mealTypeIds: string[];
  ingredients: string[];
  steps: string[];
  imageUrl?: string;
  sourceUrl?: string;
  youtubeUrl?: string;
  cookingTime?: string;
  difficulty?: string;
  isActive?: boolean;
}): Promise<string> {
  const title = input.title.trim();
  const rawId = (input.id ?? '').trim();
  const id = rawId || `recipe_${normalizeText(title).replace(/\s+/g, '_')}`;

  const mealTypeIds = [...new Set(input.mealTypeIds.map(normalizeMealTypeIdentity).filter(Boolean))];
  const ingredientNames = [...new Set(input.ingredients.map((item) => item.trim()).filter(Boolean))];
  const ingredientIds = ingredientNames.map(normalizeIngredientIdentity).filter(Boolean);
  const steps = input.steps.map((step) => step.trim()).filter(Boolean);

  const normalizedMealTypes = mealTypeIds.length > 0 ? mealTypeIds : [DEFAULT_MEAL_TYPE_ID];

  const ref = adminDb.collection(COLLECTIONS.recipes).doc(id);
  const snap = await ref.get();

  await ref.set(
    {
      id,
      title,
      description: (input.description ?? '').trim() || null,
      mealTypeIds: normalizedMealTypes,
      ingredients: ingredientNames,
      ingredientIds,
      steps,
      imageUrl: (input.imageUrl ?? '').trim() || null,
      sourceUrl: (input.sourceUrl ?? '').trim() || null,
      youtubeUrl: (input.youtubeUrl ?? '').trim() || null,
      cookingTime: (input.cookingTime ?? '').trim() || null,
      difficulty: (input.difficulty ?? '').trim() || null,
      isActive: input.isActive ?? true,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: snap.exists
        ? (snap.data() as Record<string, unknown>)?.createdAt ?? FieldValue.serverTimestamp()
        : FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  return id;
}

export async function fetchSuggestions(status: SuggestionDoc['status'] = 'pending'): Promise<SuggestionDoc[]> {
  const snapshot = await adminDb
    .collection(COLLECTIONS.ingredientSuggestions)
    .where('status', '==', status)
    .limit(200)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      name: asString(data.name),
      normalizedName: asString(data.normalizedName),
      categoryHint: asString(data.categoryHint) || null,
      status: (asString(data.status) || 'pending') as SuggestionDoc['status'],
      moderationNote: asString(data.moderationNote) || null
    };
  });
}

export async function decideSuggestion(input: {
  id: string;
  status: 'approved' | 'rejected';
  moderationNote?: string;
}) {
  const ref = adminDb.collection(COLLECTIONS.ingredientSuggestions).doc(input.id.trim());
  const snap = await ref.get();

  if (!snap.exists) {
    throw new Error('Suggestion not found.');
  }

  const data = snap.data() as Record<string, unknown>;
  const name = asString(data.name);
  const categoryHint = asString(data.categoryHint);

  let ingredientId: string | null = null;
  if (input.status === 'approved' && !name) {
    throw new Error('Approved suggestion has no name.');
  }

  if (input.status === 'approved' && name) {
    ingredientId = await upsertIngredient({
      displayName: name,
      category: categoryHint || 'Diğer',
      isActive: true
    });
  }

  const updatePayload: Record<string, unknown> = {
    status: input.status,
    moderationNote: (input.moderationNote ?? '').trim() || null,
    updatedAt: FieldValue.serverTimestamp()
  };

  if (ingredientId) {
    updatePayload.resolvedIngredientId = ingredientId;
  }

  await ref.set(updatePayload, { merge: true });
}

export async function deleteMealType(id: string): Promise<void> {
  await adminDb.collection(COLLECTIONS.mealTypes).doc(id.trim()).delete();
}

export async function deleteIngredient(id: string): Promise<void> {
  await adminDb.collection(COLLECTIONS.ingredients).doc(id.trim()).delete();
}

export async function deleteRecipe(id: string): Promise<void> {
  await adminDb.collection(COLLECTIONS.recipes).doc(id.trim()).delete();
}
