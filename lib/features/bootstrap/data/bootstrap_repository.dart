import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../core/constants/app_api_config.dart';
import '../../../shared/models/bootstrap_data.dart';

class BootstrapRepositoryException implements Exception {
  final String message;

  const BootstrapRepositoryException(this.message);

  @override
  String toString() => message;
}

class IngredientSuggestionResult {
  final bool success;
  final String message;
  final String? suggestionId;

  const IngredientSuggestionResult({
    required this.success,
    required this.message,
    this.suggestionId,
  });
}

class RecommendationApiRecipe {
  final String id;
  final String title;
  final String? description;
  final List<String> mealTypeIds;
  final List<String> ingredientIds;
  final List<String> ingredients;
  final List<String> steps;
  final String? imageUrl;
  final String? sourceUrl;
  final String? youtubeUrl;
  final String? cookingTime;
  final String? difficulty;

  const RecommendationApiRecipe({
    required this.id,
    required this.title,
    required this.description,
    required this.mealTypeIds,
    required this.ingredientIds,
    required this.ingredients,
    required this.steps,
    required this.imageUrl,
    required this.sourceUrl,
    required this.youtubeUrl,
    required this.cookingTime,
    required this.difficulty,
  });

  factory RecommendationApiRecipe.fromJson(Map<String, dynamic> map) {
    return RecommendationApiRecipe(
      id: (map['id'] ?? '').toString().trim(),
      title: (map['title'] ?? '').toString().trim(),
      description: _nullableText(map['description']),
      mealTypeIds: _stringList(map['mealTypeIds']),
      ingredientIds: _stringList(map['ingredientIds']),
      ingredients: _stringList(map['ingredients']),
      steps: _stringList(map['steps']),
      imageUrl: _nullableText(map['imageUrl']),
      sourceUrl: _nullableText(map['sourceUrl']),
      youtubeUrl: _nullableText(map['youtubeUrl']),
      cookingTime: _nullableText(map['cookingTime']),
      difficulty: _nullableText(map['difficulty']),
    );
  }
}

class RecommendationApiItem {
  final String recipeId;
  final double score;
  final List<String> matchedIngredientIds;
  final List<String> missingIngredientIds;
  final RecommendationApiRecipe? recipe;

  const RecommendationApiItem({
    required this.recipeId,
    required this.score,
    required this.matchedIngredientIds,
    required this.missingIngredientIds,
    required this.recipe,
  });

  factory RecommendationApiItem.fromJson(Map<String, dynamic> map) {
    return RecommendationApiItem(
      recipeId: (map['recipeId'] ?? '').toString().trim(),
      score: _asDouble(map['score']),
      matchedIngredientIds: _stringList(map['matchedIngredientIds']),
      missingIngredientIds: _stringList(map['missingIngredientIds']),
      recipe: map['recipe'] is Map<String, dynamic>
          ? RecommendationApiRecipe.fromJson(map['recipe'] as Map<String, dynamic>)
          : null,
    );
  }
}

class BootstrapRepository {
  final http.Client _client;

  const BootstrapRepository({required http.Client client}) : _client = client;

  Future<BootstrapData> fetchBootstrap() async {
    final response = await _client.get(
      AppApiConfig.uri('/public/bootstrap'),
      headers: const {'Accept': 'application/json'},
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw BootstrapRepositoryException(
        'Bootstrap API error: ${response.statusCode}',
      );
    }

    final decoded = jsonDecode(response.body);
    if (decoded is! Map<String, dynamic>) {
      throw const BootstrapRepositoryException('Bootstrap response is not a JSON object.');
    }

    return BootstrapData.fromJson(decoded);
  }

  Future<List<RecommendationApiItem>> fetchRecommendations({
    required String mealTypeId,
    required List<String> ingredientIds,
    int limit = 20,
    double minScore = 85,
  }) async {
    final response = await _client.post(
      AppApiConfig.uri('/public/recommendations'),
      headers: const {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'mealTypeId': mealTypeId,
        'ingredientIds': ingredientIds,
        'limit': limit,
        'minScore': minScore,
      }),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw BootstrapRepositoryException(
        'Recommendation API error: ${response.statusCode}',
      );
    }

    final decoded = jsonDecode(response.body);
    if (decoded is! Map<String, dynamic>) {
      throw const BootstrapRepositoryException(
        'Recommendation response is not a JSON object.',
      );
    }

    final itemsRaw = decoded['items'];
    if (itemsRaw is! List) return const [];

    return itemsRaw
        .whereType<Map<String, dynamic>>()
        .map(RecommendationApiItem.fromJson)
        .where((item) => item.recipeId.isNotEmpty)
        .toList();
  }

  Future<List<RecommendationApiRecipe>> fetchRecipesByMealType({
    required String mealTypeId,
    String query = '',
    int limit = 200,
  }) async {
    final queryParams = <String, String>{
      'mealTypeId': mealTypeId.trim(),
      'limit': limit.toString(),
    };

    if (query.trim().isNotEmpty) {
      queryParams['q'] = query.trim();
    }

    final uri = AppApiConfig.uri('/public/recipes')
        .replace(queryParameters: queryParams);

    final response = await _client.get(
      uri,
      headers: const {'Accept': 'application/json'},
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw BootstrapRepositoryException(
        'Public recipes API error: ${response.statusCode}',
      );
    }

    final decoded = jsonDecode(response.body);
    if (decoded is! Map<String, dynamic>) {
      throw const BootstrapRepositoryException(
        'Public recipes response is not a JSON object.',
      );
    }

    final itemsRaw = decoded['items'];
    if (itemsRaw is! List) return const [];

    return itemsRaw
        .whereType<Map<String, dynamic>>()
        .map(RecommendationApiRecipe.fromJson)
        .where((item) => item.id.isNotEmpty && item.title.isNotEmpty)
        .toList();
  }

  Future<IngredientSuggestionResult> submitIngredientSuggestion({
    required String name,
    String? categoryHint,
  }) async {
    final response = await _client.post(
      AppApiConfig.uri('/public/suggestions/ingredient'),
      headers: const {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'name': name.trim(),
        if (categoryHint != null && categoryHint.trim().isNotEmpty)
          'categoryHint': categoryHint.trim(),
      }),
    );

    final decoded = jsonDecode(response.body);
    final asMap = decoded is Map<String, dynamic>
        ? decoded
        : const <String, dynamic>{};

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return IngredientSuggestionResult(
        success: true,
        message: (asMap['message'] ?? 'Öneri alındı.').toString(),
        suggestionId: asMap['suggestionId']?.toString(),
      );
    }

    return IngredientSuggestionResult(
      success: false,
      message: (asMap['message'] ?? 'Öneri gönderilemedi.').toString(),
    );
  }
}

String? _nullableText(dynamic value) {
  if (value == null) return null;
  final text = value.toString().trim();
  return text.isEmpty ? null : text;
}

List<String> _stringList(dynamic value) {
  if (value is! List) return const [];
  return value
      .map((item) => _nullableText(item))
      .whereType<String>()
      .toList();
}

double _asDouble(dynamic value) {
  if (value is num) return value.toDouble();
  return 0;
}
