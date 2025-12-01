import { Effect } from "effect";
import { SettingsRepo } from "./repo";
import { UserRepo } from "../users/repo";

export class SettingsService extends Effect.Service<SettingsService>()(
  "SettingsService",
  {
    effect: Effect.gen(function* () {
      const settingsRepo = yield* SettingsRepo;
      const userRepo = yield* UserRepo;

      return {
        // Get all settings
        get: settingsRepo.get,

        // Get base currency
        getBaseCurrency: Effect.fn("settingsService.getBaseCurrency")(
          function* () {
            const settings = yield* settingsRepo.get();
            return settings.baseCurrency;
          }
        ),

        // Set base currency
        setBaseCurrency: (currency: string) =>
          settingsRepo.update({ baseCurrency: currency }),

        // Check if initial setup is complete
        isSetupComplete: Effect.fn("settingsService.isSetupComplete")(
          function* () {
            // Setup is complete if there's at least one user
            const userCount = yield* userRepo.count();
            return userCount > 0;
          }
        ),

        // Complete initial setup: creates user and sets base currency atomically
        completeSetup: Effect.fn("settingsService.completeSetup")(function* (
          params: { userName: string; currency: string }
        ) {
          // Generate slug ID from name (lowercase, alphanumeric with hyphens)
          const userId = params.userName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

          // Create user
          const user = yield* userRepo.create({
            id: userId,
            name: params.userName,
          });

          // Set base currency
          yield* settingsRepo.update({ baseCurrency: params.currency });

          return { user, userId };
        }),
      } as const;
    }),
    dependencies: [SettingsRepo.Default, UserRepo.Default],
    accessors: true,
  }
) {}
