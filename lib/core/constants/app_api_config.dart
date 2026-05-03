class AppApiConfig {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://ne-pisirsem.onrender.com/api',
  );

  static Uri uri(String path) {
    final sanitizedBase = baseUrl.endsWith('/')
        ? baseUrl.substring(0, baseUrl.length - 1)
        : baseUrl;
    final sanitizedPath = path.startsWith('/') ? path : '/$path';
    return Uri.parse('$sanitizedBase$sanitizedPath');
  }
}
