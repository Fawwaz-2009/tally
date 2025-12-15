import { Layer } from "effect";
import { BucketClient, DbClient, RuntimeEnvs } from "../layers";
import {
  UserRepo,
  UserService,
  SettingsRepo,
  SettingsService,
  ExpenseRepo,
  ExpenseService,
  CurrencyService,
} from "../domain";
import { ExtractionService, ExtractionServiceStub } from "../domain/extraction";

/**
 * Base layer containing all core services for the application.
 * This layer is shared between different runtime configurations.
 */
const isE2ETest = process.env.E2E_TEST === "1";

export const BaseLayer = Layer.mergeAll(
  BucketClient.Default,
  DbClient.Default,
  RuntimeEnvs.Default,
  UserRepo.Default,
  UserService.Default,
  SettingsRepo.Default,
  SettingsService.Default,
  ExpenseRepo.Default,
  ExpenseService.Default.pipe(Layer.provide(isE2ETest ? ExtractionServiceStub : ExtractionService.Default)),
  CurrencyService.Default,
);
