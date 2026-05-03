import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/constants/app_constants.dart';
import '../../features/ingredient_selection/presentation/ingredient_selection_screen.dart';
import '../../features/meal_type_selection/presentation/meal_type_selection_screen.dart';
import '../../features/onboarding/presentation/onboarding_screen.dart';
import '../../features/recipe_detail/presentation/recipe_detail_screen.dart';
import '../../features/recipe_results/presentation/recipe_results_screen.dart';
import '../../shared/models/recipe.dart';

class AppRouter {
  static const String onboarding = '/onboarding';
  static const String home = '/';
  static const String ingredientSelection = '/ingredients';
  static const String results = '/results';
  static const String detail = '/detail';

  static GoRouter createRouter() {
    return GoRouter(
      initialLocation: home,
      redirect: (context, state) async {
        final prefs = await SharedPreferences.getInstance();
        final onboardingDone =
            prefs.getBool(AppConstants.onboardingDoneKey) ?? false;

        if (!onboardingDone && state.matchedLocation != onboarding) {
          return onboarding;
        }

        if (onboardingDone && state.matchedLocation == onboarding) {
          return home;
        }

        return null;
      },
      routes: [
        GoRoute(
          path: onboarding,
          builder: (context, state) => const OnboardingScreen(),
        ),
        GoRoute(
          path: home,
          builder: (context, state) => const MealTypeSelectionScreen(),
        ),
        GoRoute(
          path: ingredientSelection,
          builder: (context, state) => const IngredientSelectionScreen(),
        ),
        GoRoute(
          path: results,
          builder: (context, state) => const RecipeResultsScreen(),
        ),
        GoRoute(
          path: detail,
          builder: (context, state) {
            final match = state.extra as RecipeMatch;
            return RecipeDetailScreen(match: match);
          },
        ),
      ],
    );
  }
}
