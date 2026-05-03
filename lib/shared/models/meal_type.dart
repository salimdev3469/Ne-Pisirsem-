class MealType {
  final String id;
  final String name;
  final String? imageUrl;
  final String? lottieUrl;
  final int order;
  final bool isActive;

  const MealType({
    required this.id,
    required this.name,
    this.imageUrl,
    this.lottieUrl,
    required this.order,
    required this.isActive,
  });

  factory MealType.fromJson(Map<String, dynamic> map) {
    return MealType(
      id: (map['id'] ?? '').toString().trim(),
      name: (map['name'] ?? '').toString().trim(),
      imageUrl: _nullableText(map['imageUrl']),
      lottieUrl: _nullableText(map['lottieUrl']),
      order: _asInt(map['order'], 0),
      isActive: map['isActive'] is bool ? map['isActive'] as bool : true,
    );
  }

  static String? _nullableText(dynamic value) {
    if (value == null) return null;
    final text = value.toString().trim();
    return text.isEmpty ? null : text;
  }

  static int _asInt(dynamic value, int fallback) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    return fallback;
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is MealType && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;
}
