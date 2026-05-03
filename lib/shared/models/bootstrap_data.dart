import 'ingredient.dart';
import 'meal_type.dart';

class RecommendationClientConfig {
  final double minMatchScore;
  final double corePenalty;
  final double nonCorePenalty;
  final int defaultLimit;

  const RecommendationClientConfig({
    required this.minMatchScore,
    required this.corePenalty,
    required this.nonCorePenalty,
    required this.defaultLimit,
  });

  factory RecommendationClientConfig.fromJson(Map<String, dynamic> map) {
    return RecommendationClientConfig(
      minMatchScore: _asDouble(map['minMatchScore'], 0),
      corePenalty: _asDouble(map['corePenalty'], 0.05),
      nonCorePenalty: _asDouble(map['nonCorePenalty'], 0.02),
      defaultLimit: _asInt(map['defaultLimit'], 5),
    );
  }

  static double _asDouble(dynamic value, double fallback) {
    if (value is num) return value.toDouble();
    return fallback;
  }

  static int _asInt(dynamic value, int fallback) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return fallback;
  }
}

class BootstrapData {
  final List<MealType> mealTypes;
  final List<Ingredient> ingredients;
  final RecommendationClientConfig config;

  const BootstrapData({
    required this.mealTypes,
    required this.ingredients,
    required this.config,
  });

  factory BootstrapData.fromJson(Map<String, dynamic> map) {
    final mealTypesRaw = map['mealTypes'] as List<dynamic>? ?? const [];
    final ingredientsRaw = map['ingredients'] as List<dynamic>? ?? const [];

    final mealTypes = mealTypesRaw
        .whereType<Map<String, dynamic>>()
        .map(MealType.fromJson)
        .where((item) => item.id.isNotEmpty && item.name.isNotEmpty)
        .toList()
      ..sort((a, b) => a.order.compareTo(b.order));

    final ingredients = ingredientsRaw
        .whereType<Map<String, dynamic>>()
        .map(Ingredient.fromJson)
        .where((item) => item.id.isNotEmpty && item.name.isNotEmpty)
        .toList()
      ..sort((a, b) => a.name.compareTo(b.name));

    return BootstrapData(
      mealTypes: mealTypes,
      ingredients: ingredients,
      config: RecommendationClientConfig.fromJson(
        map['config'] is Map<String, dynamic>
            ? map['config'] as Map<String, dynamic>
            : const <String, dynamic>{},
      ),
    );
  }
}
