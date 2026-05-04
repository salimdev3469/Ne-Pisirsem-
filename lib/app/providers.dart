import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import '../../features/bootstrap/data/bootstrap_repository.dart';
import '../../shared/models/bootstrap_data.dart';
import '../../shared/models/ingredient.dart';
import '../../shared/models/meal_type.dart';
import '../../shared/models/recipe.dart';

String _normalizeIdentity(String input) {
  return input
      .toLowerCase()
      .replaceAll('ı', 'i')
      .replaceAll('ğ', 'g')
      .replaceAll('ü', 'u')
      .replaceAll('ş', 's')
      .replaceAll('ö', 'o')
      .replaceAll('ç', 'c')
      .trim()
      .replaceAll(RegExp(r'\s+'), '_');
}

final httpClientProvider = Provider<http.Client>((ref) {
  final client = http.Client();
  ref.onDispose(client.close);
  return client;
});

final bootstrapRepositoryProvider = Provider<BootstrapRepository>((ref) {
  return BootstrapRepository(client: ref.watch(httpClientProvider));
});

final bootstrapDataProvider = FutureProvider<BootstrapData>((ref) async {
  return ref.watch(bootstrapRepositoryProvider).fetchBootstrap();
});

final selectedMealTypeProvider = StateProvider<MealType?>((ref) => null);

class SelectedIngredientsNotifier extends StateNotifier<List<Ingredient>> {
  SelectedIngredientsNotifier() : super([]);

  void toggle(Ingredient ingredient) {
    if (state.contains(ingredient)) {
      state = state.where((i) => i != ingredient).toList();
    } else {
      state = [...state, ingredient];
    }
  }

  void add(Ingredient ingredient) {
    if (!state.contains(ingredient)) {
      state = [...state, ingredient];
    }
  }

  void remove(Ingredient ingredient) {
    state = state.where((i) => i != ingredient).toList();
  }

  void clear() => state = [];
}

final selectedIngredientsProvider =
    StateNotifierProvider<SelectedIngredientsNotifier, List<Ingredient>>(
  (ref) => SelectedIngredientsNotifier(),
);

final allIngredientsProvider = Provider<List<Ingredient>>((ref) {
  final bootstrap = ref.watch(bootstrapDataProvider).valueOrNull;
  return bootstrap?.ingredients ?? const [];
});

final ingredientSearchQueryProvider = StateProvider<String>((ref) => '');

final filteredIngredientsProvider = Provider<List<Ingredient>>((ref) {
  final all = ref.watch(allIngredientsProvider);
  final query = ref.watch(ingredientSearchQueryProvider).toLowerCase().trim();
  if (query.isEmpty) return all;

  return all.where((i) {
    final inName = i.name.toLowerCase().contains(query);
    final inAliases = i.aliases.any((alias) => alias.contains(query));
    return inName || inAliases;
  }).toList();
});

final filteredRecipesProvider = FutureProvider<List<RecipeMatch>>((ref) async {
  final selected = ref.watch(selectedIngredientsProvider);
  if (selected.isEmpty) return const [];

  final selectedMealType = ref.watch(selectedMealTypeProvider);
  if (selectedMealType == null) return const [];

  final bootstrapData = await ref.watch(bootstrapDataProvider.future);

  final allIngredients = ref.watch(allIngredientsProvider);
  final ingredientNameById = <String, String>{
    for (final ingredient in allIngredients)
      _normalizeIdentity(ingredient.id): ingredient.name,
  };

  String resolveIngredientName(String raw) {
    final normalized = _normalizeIdentity(raw);
    final resolved = ingredientNameById[normalized];
    if (resolved != null && resolved.isNotEmpty) return resolved;

    return raw
        .replaceFirst('ing_', '')
        .replaceAll('_', ' ')
        .trim();
  }

  final repository = ref.watch(bootstrapRepositoryProvider);
  final selectedIngredientIds = selected.map((item) => item.id).toList();
  final strictMinScore = bootstrapData.config.minMatchScore <= 0
      ? 85.0
      : bootstrapData.config.minMatchScore;
  final relaxedMinScore = strictMinScore > 35 ? 35.0 : strictMinScore;

  var apiItems = await repository.fetchRecommendations(
    mealTypeId: selectedMealType.id,
    ingredientIds: selectedIngredientIds,
    limit: 30,
    minScore: strictMinScore,
  );

  if (apiItems.isEmpty && relaxedMinScore < strictMinScore) {
    apiItems = await repository.fetchRecommendations(
      mealTypeId: selectedMealType.id,
      ingredientIds: selectedIngredientIds,
      limit: 30,
      minScore: relaxedMinScore,
    );
  }

  final mapped = apiItems
      .where((item) => item.recipe != null)
      .map((item) {
        final snapshot = item.recipe!;

        final recipeIngredients = snapshot.ingredients.isNotEmpty
            ? snapshot.ingredients
            : snapshot.ingredientIds.map(resolveIngredientName).toList();

        final recipe = Recipe(
          id: snapshot.id,
          title: snapshot.title,
          mealTypeIds: snapshot.mealTypeIds,
          ingredients: recipeIngredients,
          steps: snapshot.steps,
          imageUrl: snapshot.imageUrl,
          sourceUrl: snapshot.sourceUrl,
          youtubeUrl: snapshot.youtubeUrl,
          description: snapshot.description,
          cookingTime: snapshot.cookingTime,
          difficulty: snapshot.difficulty,
        );

        return RecipeMatch(
          recipe: recipe,
          matchCount: item.matchedIngredientIds.length,
          matchPercentage: item.score,
          matchedIngredients:
              item.matchedIngredientIds.map(resolveIngredientName).toList(),
          missingIngredients:
              item.missingIngredientIds.map(resolveIngredientName).toList(),
        );
      })
      .toList();

  mapped.sort((a, b) => b.matchPercentage.compareTo(a.matchPercentage));
  return mapped;
});

final categoryRecipesProvider = FutureProvider<List<Recipe>>((ref) async {
  final selectedMealType = ref.watch(selectedMealTypeProvider);
  if (selectedMealType == null) return const [];

  final allIngredients = ref.watch(allIngredientsProvider);
  final ingredientNameById = <String, String>{
    for (final ingredient in allIngredients)
      _normalizeIdentity(ingredient.id): ingredient.name,
  };

  String resolveIngredientName(String raw) {
    final normalized = _normalizeIdentity(raw);
    final resolved = ingredientNameById[normalized];
    if (resolved != null && resolved.isNotEmpty) return resolved;

    return raw.replaceFirst('ing_', '').replaceAll('_', ' ').trim();
  }

  final repository = ref.watch(bootstrapRepositoryProvider);
  final apiRecipes = await repository.fetchRecipesByMealType(
    mealTypeId: selectedMealType.id,
    limit: 300,
  );

  final recipes = apiRecipes
      .map((snapshot) {
        final recipeIngredients = snapshot.ingredients.isNotEmpty
            ? snapshot.ingredients
            : snapshot.ingredientIds.map(resolveIngredientName).toList();

        return Recipe(
          id: snapshot.id,
          title: snapshot.title,
          mealTypeIds: snapshot.mealTypeIds,
          ingredients: recipeIngredients,
          steps: snapshot.steps,
          imageUrl: snapshot.imageUrl,
          sourceUrl: snapshot.sourceUrl,
          youtubeUrl: snapshot.youtubeUrl,
          description: snapshot.description,
          cookingTime: snapshot.cookingTime,
          difficulty: snapshot.difficulty,
        );
      })
      .toList()
    ..sort((a, b) => a.title.compareTo(b.title));

  return recipes;
});
