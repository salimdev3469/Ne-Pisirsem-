import 'dart:convert';

class Recipe {
  final String id;
  final String title;
  final List<String> mealTypeIds;
  final List<String> ingredients;
  final List<String> steps;
  final String? imageUrl;
  final String? sourceUrl;
  final String? youtubeUrl;
  final String? description;
  final String? cookingTime;
  final String? difficulty;

  const Recipe({
    required this.id,
    required this.title,
    this.mealTypeIds = const [],
    required this.ingredients,
    required this.steps,
    this.imageUrl,
    this.sourceUrl,
    this.youtubeUrl,
    this.description,
    this.cookingTime,
    this.difficulty,
  });

  factory Recipe.fromMap(Map<String, dynamic> map) {
    return Recipe(
      id: map['id'].toString(),
      title: _nullableText(map['title']) ?? '',
      mealTypeIds: _stringList(map['mealTypeIds']),
      ingredients: _stringList(map['ingredients']),
      steps: _stringList(map['steps']),
      imageUrl: _nullableText(map['imageUrl']),
      sourceUrl: _nullableText(map['sourceUrl']),
      youtubeUrl: _nullableText(map['youtubeUrl']),
      description: _nullableText(map['description']),
      cookingTime: _nullableText(map['cookingTime']),
      difficulty: _nullableText(map['difficulty']),
    );
  }

  factory Recipe.fromJson(String source) {
    return Recipe.fromMap(jsonDecode(source) as Map<String, dynamic>);
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'mealTypeIds': mealTypeIds,
      'ingredients': ingredients,
      'steps': steps,
      'imageUrl': imageUrl,
      'sourceUrl': sourceUrl,
      'youtubeUrl': youtubeUrl,
      'description': description,
      'cookingTime': cookingTime,
      'difficulty': difficulty,
    };
  }

  String toJson() => jsonEncode(toMap());

  static String? _nullableText(dynamic value) {
    if (value == null) return null;
    final text = value.toString().trim();
    return text.isEmpty ? null : text;
  }

  static List<String> _stringList(dynamic value) {
    if (value is! List) return const [];
    return value
        .map((item) => _nullableText(item))
        .whereType<String>()
        .toList();
  }
}

class RecipeMatch {
  final Recipe recipe;
  final int matchCount;
  final double matchPercentage;
  final List<String> matchedIngredients;
  final List<String> missingIngredients;

  const RecipeMatch({
    required this.recipe,
    required this.matchCount,
    required this.matchPercentage,
    required this.matchedIngredients,
    required this.missingIngredients,
  });
}
