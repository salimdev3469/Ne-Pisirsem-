import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/recipe.dart';

class RecipeDetailScreen extends StatelessWidget {
  final Recipe recipe;
  final RecipeMatch? match;

  RecipeDetailScreen({super.key, required RecipeMatch match})
      : recipe = match.recipe,
        match = match;

  RecipeDetailScreen.fromRecipe({super.key, required this.recipe})
      : match = null;

  Future<void> _launchUrl(String? url) async {
    if (url == null || url.trim().isEmpty) return;
    final uri = Uri.parse(url);
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      debugPrint('Could not launch $url');
    }
  }

  @override
  Widget build(BuildContext context) {
    final pct = match?.matchPercentage ?? 0;
    final hasImage = (recipe.imageUrl ?? '').isNotEmpty;
    final hasYoutube = (recipe.youtubeUrl ?? '').isNotEmpty;
    final hasSource = (recipe.sourceUrl ?? '').isNotEmpty;
    final matchedIngredients = match?.matchedIngredients ?? const <String>[];
    final missingIngredients = match?.missingIngredients ?? const <String>[];

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // Hero image app bar
          SliverAppBar(
            expandedHeight: 280,
            pinned: true,
            backgroundColor: AppTheme.background,
            leading: Padding(
              padding: const EdgeInsets.all(8),
              child: GestureDetector(
                onTap: () => Navigator.pop(context),
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.1),
                        blurRadius: 8,
                      ),
                    ],
                  ),
                  child: const Icon(Icons.arrow_back_ios_new_rounded,
                      color: AppTheme.textDark, size: 20),
                ),
              ),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  if (hasImage)
                    CachedNetworkImage(
                      imageUrl: recipe.imageUrl!,
                      fit: BoxFit.cover,
                      placeholder: (_, __) => Container(
                        color: AppTheme.chipUnselected,
                        child: const Center(
                          child: CircularProgressIndicator(
                              color: AppTheme.primary, strokeWidth: 2),
                        ),
                      ),
                      errorWidget: (_, __, ___) => _noImagePlaceholder(),
                    )
                  else
                    _noImagePlaceholder(),
                  // Gradient overlay
                  Positioned(
                    bottom: 0,
                    left: 0,
                    right: 0,
                    child: Container(
                      height: 80,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.transparent,
                            AppTheme.background.withOpacity(0.9),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Content
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Match badge
                  if (match != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: _matchColor(pct).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                            color: _matchColor(pct).withOpacity(0.3)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.check_circle_rounded,
                              size: 16, color: _matchColor(pct)),
                          const SizedBox(width: 6),
                          Text(
                            '%${pct.round()} malzeme uyumlu  •  ${match!.matchCount}/${recipe.ingredients.length}',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: _matchColor(pct),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Title
                  Text(
                    recipe.title,
                    style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.textDark,
                      height: 1.2,
                    ),
                  ),
                  if ((recipe.cookingTime ?? '').isNotEmpty ||
                      (recipe.difficulty ?? '').isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: [
                        if ((recipe.cookingTime ?? '').isNotEmpty)
                          _MetaChip(
                            icon: Icons.schedule_rounded,
                            text: recipe.cookingTime!,
                          ),
                        if ((recipe.difficulty ?? '').isNotEmpty)
                          _MetaChip(
                            icon: Icons.local_fire_department_rounded,
                            text: recipe.difficulty!,
                          ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 8),
                  if ((recipe.description ?? '').isNotEmpty)
                    Text(
                      recipe.description!,
                      style: const TextStyle(
                        fontSize: 15,
                        color: AppTheme.textMedium,
                        height: 1.5,
                      ),
                    ),
                  const SizedBox(height: 28),

                  // Ingredients Section
                  _SectionTitle(title: 'Malzemeler', emoji: '🛒'),
                  const SizedBox(height: 12),
                  _IngredientsGrid(
                    ingredients: recipe.ingredients,
                    matchedIngredients: matchedIngredients,
                  ),
                  const SizedBox(height: 28),

                  // Missing ingredients
                  if (missingIngredients.isNotEmpty) ...[
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppTheme.accent.withOpacity(0.07),
                        borderRadius: BorderRadius.circular(14),
                        border:
                            Border.all(color: AppTheme.accent.withOpacity(0.2)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.shopping_cart_outlined,
                                  size: 16, color: AppTheme.accent),
                              const SizedBox(width: 6),
                              Text(
                                'Eksik malzemeler (${missingIngredients.length})',
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.accent,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 6,
                            runSpacing: 4,
                            children: missingIngredients
                                .map(
                                  (ing) => Text(
                                    '• $ing',
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: AppTheme.textMedium,
                                    ),
                                  ),
                                )
                                .toList(),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 28),
                  ],

                  // Steps Section
                  _SectionTitle(title: 'Yapılışı', emoji: '👨‍🍳'),
                  const SizedBox(height: 12),
                  ...recipe.steps.asMap().entries.map(
                        (entry) =>
                            _StepItem(step: entry.value, index: entry.key + 1),
                      ),
                  const SizedBox(height: 32),

                  // Action Buttons
                  if (hasYoutube || hasSource) ...[
                    _SectionTitle(title: 'Daha Fazlası', emoji: '🔗'),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        if (hasYoutube)
                          Expanded(
                            child: _ActionButton(
                              label: "YouTube'da İzle",
                              icon: Icons.play_circle_rounded,
                              color: const Color(0xFFFF0000),
                              onTap: () => _launchUrl(recipe.youtubeUrl),
                            ),
                          ),
                        if (hasYoutube && hasSource) const SizedBox(width: 12),
                        if (hasSource)
                          Expanded(
                            child: _ActionButton(
                              label: 'Tarife Git',
                              icon: Icons.open_in_browser_rounded,
                              color: AppTheme.primary,
                              onTap: () => _launchUrl(recipe.sourceUrl),
                            ),
                          ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _matchColor(double pct) {
    if (pct >= 80) return AppTheme.primary;
    if (pct >= 50) return AppTheme.accent;
    return AppTheme.textLight;
  }

  Widget _noImagePlaceholder() {
    return Container(
      color: AppTheme.chipUnselected,
      child: const Center(
        child:
            Icon(Icons.restaurant_rounded, size: 64, color: AppTheme.textLight),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  final String emoji;
  const _SectionTitle({required this.title, required this.emoji});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(emoji, style: const TextStyle(fontSize: 20)),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: AppTheme.textDark,
          ),
        ),
      ],
    );
  }
}

class _IngredientsGrid extends StatelessWidget {
  final List<String> ingredients;
  final List<String> matchedIngredients;
  const _IngredientsGrid(
      {required this.ingredients, required this.matchedIngredients});

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: ingredients.map((ing) {
        final normalizedIng = ing.toLowerCase().trim();
        final isMatched = matchedIngredients
            .any((m) => m.toLowerCase().trim() == normalizedIng);
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: isMatched
                ? AppTheme.primary.withOpacity(0.1)
                : AppTheme.chipUnselected,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isMatched
                  ? AppTheme.primary.withOpacity(0.3)
                  : AppTheme.divider,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (isMatched)
                const Padding(
                  padding: EdgeInsets.only(right: 4),
                  child: Icon(Icons.check_rounded,
                      size: 14, color: AppTheme.primary),
                ),
              Text(
                ing,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isMatched ? AppTheme.primary : AppTheme.textMedium,
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}

class _MetaChip extends StatelessWidget {
  final IconData icon;
  final String text;
  const _MetaChip({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.chipUnselected,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: AppTheme.textMedium),
          const SizedBox(width: 6),
          Text(
            text,
            style: const TextStyle(
              fontSize: 12,
              color: AppTheme.textMedium,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _StepItem extends StatelessWidget {
  final String step;
  final int index;
  const _StepItem({required this.step, required this.index});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: AppTheme.primary,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                '$index',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                step,
                style: const TextStyle(
                  fontSize: 15,
                  color: AppTheme.textDark,
                  height: 1.5,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _ActionButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 6),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
