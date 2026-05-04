import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/providers.dart';
import '../../../app/router/app_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/ingredient.dart';
import '../../../shared/widgets/ingredient_chip_widget.dart';

class IngredientSelectionScreen extends ConsumerWidget {
  const IngredientSelectionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bootstrapAsync = ref.watch(bootstrapDataProvider);
    final selectedMealType = ref.watch(selectedMealTypeProvider);

    if (selectedMealType == null) {
      return Scaffold(
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.restaurant_menu_rounded,
                      size: 48, color: AppTheme.primary),
                  const SizedBox(height: 12),
                  const Text(
                    'Önce yemek türü seçmelisin.',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textDark,
                    ),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => context.pop(),
                    child: const Text('Yemek Türüne Dön'),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return bootstrapAsync.when(
      loading: () => const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: AppTheme.primary),
        ),
      ),
      error: (error, _) => Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline_rounded,
                    size: 44, color: AppTheme.accent),
                const SizedBox(height: 12),
                const Text(
                  'Malzemeler yüklenemedi.',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textDark,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  error.toString(),
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppTheme.textMedium),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => ref.invalidate(bootstrapDataProvider),
                  child: const Text('Tekrar Dene'),
                ),
              ],
            ),
          ),
        ),
      ),
      data: (_) => _SelectionBody(selectedMealTypeName: selectedMealType.name),
    );
  }
}

class _SelectionBody extends ConsumerWidget {
  final String selectedMealTypeName;

  const _SelectionBody({required this.selectedMealTypeName});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(selectedIngredientsProvider);
    final filtered = ref.watch(filteredIngredientsProvider);
    final query = ref.watch(ingredientSearchQueryProvider);

    final grouped = <String, List<Ingredient>>{};
    for (final ing in filtered) {
      grouped.putIfAbsent(ing.category, () => []).add(ing);
    }

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _Header(
              selectedCount: selected.length,
              selectedMealTypeName: selectedMealTypeName,
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: TextField(
                onChanged: (v) =>
                    ref.read(ingredientSearchQueryProvider.notifier).state = v,
                decoration: InputDecoration(
                  hintText: 'Malzeme ara...',
                  prefixIcon: const Icon(Icons.search_rounded,
                      color: AppTheme.textLight),
                  suffixIcon: query.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.close_rounded,
                              color: AppTheme.textLight),
                          onPressed: () => ref
                              .read(ingredientSearchQueryProvider.notifier)
                              .state = '',
                        )
                      : null,
                ),
              ),
            ),
            const SizedBox(height: 12),
            if (selected.isNotEmpty) _SelectedBar(selected: selected, ref: ref),
            Expanded(
              child: filtered.isEmpty
                  ? _EmptySearch(
                      query: query,
                      onSuggest: () =>
                          _showSuggestIngredientDialog(context, ref, query),
                    )
                  : ListView(
                      padding: const EdgeInsets.only(bottom: 120),
                      children: grouped.entries.map((entry) {
                        return _CategorySection(
                          category: entry.key,
                          ingredients: entry.value,
                          selected: selected,
                          onToggle: (ing) => ref
                              .read(selectedIngredientsProvider.notifier)
                              .toggle(ing),
                        );
                      }).toList(),
                    ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: _BottomCTA(
        selectedCount: selected.length,
        onTap:
            selected.isNotEmpty ? () => context.push(AppRouter.results) : null,
      ),
    );
  }

  Future<void> _showSuggestIngredientDialog(
    BuildContext context,
    WidgetRef ref,
    String initialName,
  ) async {
    String draftValue = initialName.trim();

    final value = await showDialog<String>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Yeni Malzeme Öner'),
          content: StatefulBuilder(
            builder: (context, setState) {
              return TextFormField(
                initialValue: draftValue,
                autofocus: true,
                onChanged: (next) => setState(() => draftValue = next),
                decoration: const InputDecoration(
                  hintText: 'Örn: kapya biber',
                ),
              );
            },
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Vazgeç'),
            ),
            ElevatedButton(
              onPressed: () {
                final text = draftValue.trim();
                if (text.isEmpty) return;
                Navigator.pop(context, text);
              },
              child: const Text('Gönder'),
            ),
          ],
        );
      },
    );

    if (value == null || value.trim().isEmpty || !context.mounted) return;

    final result =
        await ref.read(bootstrapRepositoryProvider).submitIngredientSuggestion(
              name: value,
            );

    if (!context.mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(result.message),
        backgroundColor: result.success ? AppTheme.primary : AppTheme.accent,
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final int selectedCount;
  final String selectedMealTypeName;

  const _Header({
    required this.selectedCount,
    required this.selectedMealTypeName,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text('🧺', style: TextStyle(fontSize: 28)),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Malzemelerini Seç',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.textDark,
                      ),
                    ),
                    Text(
                      selectedCount == 0
                          ? 'Tür: $selectedMealTypeName'
                          : '$selectedCount malzeme seçildi',
                      style: TextStyle(
                        fontSize: 13,
                        color: selectedCount > 0
                            ? AppTheme.primary
                            : AppTheme.textLight,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              TextButton(
                onPressed: () => context.pop(),
                child: const Text('Tür Değiştir'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SelectedBar extends StatelessWidget {
  final List<Ingredient> selected;
  final WidgetRef ref;

  const _SelectedBar({required this.selected, required this.ref});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        color: AppTheme.chipSelected,
        border: Border.symmetric(
          horizontal: BorderSide(color: AppTheme.primary.withOpacity(0.15)),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                const Text(
                  'Seçilenler',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    color: AppTheme.primary,
                  ),
                ),
                const Spacer(),
                GestureDetector(
                  onTap: () =>
                      ref.read(selectedIngredientsProvider.notifier).clear(),
                  child: const Text(
                    'Temizle',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppTheme.textMedium,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 40,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: selected.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, i) {
                final ing = selected[i];
                return GestureDetector(
                  onTap: () => ref
                      .read(selectedIngredientsProvider.notifier)
                      .remove(ing),
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppTheme.primary,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      children: [
                        Text(ing.emoji, style: const TextStyle(fontSize: 14)),
                        const SizedBox(width: 4),
                        Text(
                          ing.name,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Icon(Icons.close_rounded,
                            size: 14, color: Colors.white70),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _CategorySection extends StatelessWidget {
  final String category;
  final List<Ingredient> ingredients;
  final List<Ingredient> selected;
  final void Function(Ingredient) onToggle;

  const _CategorySection({
    required this.category,
    required this.ingredients,
    required this.selected,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 10),
          child: Text(
            category,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppTheme.textMedium,
              letterSpacing: 0.5,
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: ingredients
                .map(
                  (ing) => IngredientChipWidget(
                    ingredient: ing,
                    isSelected: selected.contains(ing),
                    onTap: () => onToggle(ing),
                  ),
                )
                .toList(),
          ),
        ),
        const SizedBox(height: 4),
      ],
    );
  }
}

class _EmptySearch extends StatelessWidget {
  final String query;
  final VoidCallback onSuggest;

  const _EmptySearch({required this.query, required this.onSuggest});

  @override
  Widget build(BuildContext context) {
    final suggested = query.trim().isNotEmpty;
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('🔍', style: TextStyle(fontSize: 48)),
            const SizedBox(height: 16),
            Text(
              suggested ? '"$query" bulunamadı' : 'Malzeme bulunamadı',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AppTheme.textMedium,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            const Text(
              'İstersen bu malzemeyi öneri olarak bize iletebilirsin.',
              style: TextStyle(fontSize: 14, color: AppTheme.textLight),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 18),
            OutlinedButton.icon(
              onPressed: onSuggest,
              icon: const Icon(Icons.add_circle_outline_rounded),
              label: const Text('Malzemeyi Ekle'),
            ),
          ],
        ),
      ),
    );
  }
}

class _BottomCTA extends StatelessWidget {
  final int selectedCount;
  final VoidCallback? onTap;

  const _BottomCTA({required this.selectedCount, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(
          20, 12, 20, 12 + MediaQuery.of(context).padding.bottom),
      decoration: const BoxDecoration(
        color: AppTheme.background,
        border: Border(
          top: BorderSide(color: AppTheme.divider),
        ),
      ),
      child: SizedBox(
        width: double.infinity,
        height: 56,
        child: ElevatedButton.icon(
          onPressed: onTap,
          icon: const Icon(Icons.restaurant_menu_rounded, color: Colors.white),
          label: Text(
            selectedCount == 0
                ? 'Malzeme seç ve tarifleri gör'
                : 'Tarifleri Göster ($selectedCount malzeme)',
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
          style: ElevatedButton.styleFrom(
            backgroundColor:
                onTap != null ? AppTheme.primary : AppTheme.divider,
            elevation: onTap != null ? 2 : 0,
            shadowColor: AppTheme.primary.withOpacity(0.3),
          ),
        ),
      ),
    );
  }
}
