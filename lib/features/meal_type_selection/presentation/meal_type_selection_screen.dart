import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/providers.dart';
import '../../../app/router/app_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/meal_type.dart';

class MealTypeSelectionScreen extends ConsumerWidget {
  const MealTypeSelectionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bootstrapAsync = ref.watch(bootstrapDataProvider);
    final selected = ref.watch(selectedMealTypeProvider);

    return Scaffold(
      body: SafeArea(
        child: bootstrapAsync.when(
          loading: () => const Center(
            child: CircularProgressIndicator(color: AppTheme.primary),
          ),
          error: (error, _) => _LoadError(
            message: error.toString(),
            onRetry: () => ref.invalidate(bootstrapDataProvider),
          ),
          data: (bootstrap) {
            final mealTypes =
                bootstrap.mealTypes.where((m) => m.isActive).toList();
            if (mealTypes.isEmpty) {
              return _LoadError(
                message: 'Aktif yemek türü bulunamadı.',
                onRetry: () => ref.invalidate(bootstrapDataProvider),
              );
            }

            if (selected == null) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                ref.read(selectedMealTypeProvider.notifier).state =
                    mealTypes.first;
              });
            }

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _Header(),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: GridView.builder(
                      itemCount: mealTypes.length,
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 1.05,
                        mainAxisSpacing: 12,
                        crossAxisSpacing: 12,
                      ),
                      itemBuilder: (context, index) {
                        final mealType = mealTypes[index];
                        final isSelected = selected?.id == mealType.id;
                        return _MealTypeCard(
                          mealType: mealType,
                          isSelected: isSelected,
                          onTap: () => ref
                              .read(selectedMealTypeProvider.notifier)
                              .state = mealType,
                        );
                      },
                    ),
                  ),
                ),
                _BottomCTA(
                  isEnabled: selected != null,
                  onTap: selected == null
                      ? null
                      : () {
                          ref
                              .read(selectedIngredientsProvider.notifier)
                              .clear();
                          ref
                              .read(ingredientSearchQueryProvider.notifier)
                              .state = '';
                          context.go(AppRouter.ingredientSelection);
                        },
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text('🍽️', style: TextStyle(fontSize: 30)),
            ],
          ),
          const SizedBox(height: 6),
          const Text(
            'Ne tür bir yemek yapacaksın?',
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w800,
              color: AppTheme.textDark,
              height: 1.2,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Yemek türünü seç, ardından malzemelerini birlikte toplayalım.',
            style: TextStyle(
              fontSize: 14,
              color: AppTheme.textMedium,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _MealTypeCard extends StatelessWidget {
  final MealType mealType;
  final bool isSelected;
  final VoidCallback onTap;

  const _MealTypeCard({
    required this.mealType,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isSelected
              ? AppTheme.primary.withOpacity(0.12)
              : AppTheme.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isSelected ? AppTheme.primary : AppTheme.divider,
            width: isSelected ? 2 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: AppTheme.cardShadow,
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: isSelected
                    ? AppTheme.primary.withOpacity(0.18)
                    : AppTheme.chipUnselected,
                shape: BoxShape.circle,
              ),
              child: const Center(
                child: Icon(Icons.restaurant_rounded, color: AppTheme.textDark),
              ),
            ),
            const Spacer(),
            Text(
              mealType.name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: isSelected ? AppTheme.primaryDark : AppTheme.textDark,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BottomCTA extends StatelessWidget {
  final bool isEnabled;
  final VoidCallback? onTap;

  const _BottomCTA({required this.isEnabled, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(
        20,
        12,
        20,
        12 + MediaQuery.of(context).padding.bottom,
      ),
      decoration: const BoxDecoration(
        color: AppTheme.background,
        border: Border(top: BorderSide(color: AppTheme.divider)),
      ),
      child: SizedBox(
        width: double.infinity,
        height: 56,
        child: ElevatedButton.icon(
          onPressed: onTap,
          icon: const Icon(Icons.arrow_forward_rounded, color: Colors.white),
          label: const Text(
            'Malzeme Seçimine Geç',
            style: TextStyle(
              fontSize: 16,
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
          ),
          style: ElevatedButton.styleFrom(
            backgroundColor: isEnabled ? AppTheme.primary : AppTheme.divider,
            elevation: isEnabled ? 2 : 0,
          ),
        ),
      ),
    );
  }
}

class _LoadError extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _LoadError({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline_rounded,
                color: AppTheme.accent, size: 48),
            const SizedBox(height: 12),
            const Text(
              'Veriler yüklenemedi',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: AppTheme.textDark,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppTheme.textMedium),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: onRetry,
              child: const Text('Tekrar Dene'),
            ),
          ],
        ),
      ),
    );
  }
}
