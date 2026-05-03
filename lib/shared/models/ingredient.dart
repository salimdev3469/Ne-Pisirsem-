class Ingredient {
  final String id;
  final String name;
  final String emoji;
  final String category;
  final List<String> aliases;

  const Ingredient({
    required this.id,
    required this.name,
    required this.emoji,
    required this.category,
    this.aliases = const [],
  });

  factory Ingredient.fromMap(Map<String, String> map) {
    final name = (map['name'] ?? '').trim();
    return Ingredient(
      id: _normalizeAsId(name),
      name: name,
      emoji: map['emoji'] ?? '🍽️',
      category: map['category'] ?? 'Diğer',
      aliases: [name.toLowerCase().trim()],
    );
  }

  factory Ingredient.fromJson(Map<String, dynamic> map) {
    final displayName =
        (map['displayName'] ?? map['name'] ?? '').toString().trim();

    return Ingredient(
      id: (map['id'] ?? _normalizeAsId(displayName)).toString().trim(),
      name: displayName,
      emoji: (map['emoji'] ?? '🍽️').toString(),
      category: (map['category'] ?? 'Diğer').toString(),
      aliases: _aliasesFrom(map['aliases']),
    );
  }

  static String _normalizeAsId(String input) {
    final normalized = input
        .toLowerCase()
        .replaceAll('ı', 'i')
        .replaceAll('ğ', 'g')
        .replaceAll('ü', 'u')
        .replaceAll('ş', 's')
        .replaceAll('ö', 'o')
        .replaceAll('ç', 'c')
        .trim()
        .replaceAll(RegExp(r'\s+'), '_')
        .replaceAll(RegExp(r'[^a-z0-9_]'), '');
    return normalized.isEmpty ? 'ing_unknown' : 'ing_$normalized';
  }

  static List<String> _aliasesFrom(dynamic value) {
    if (value is! List) return const [];
    return value
        .map((item) => item.toString().trim().toLowerCase())
        .where((item) => item.isNotEmpty)
        .toList();
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Ingredient && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;
}
