import { Layer } from "effect";
import { BucketClient, DbClient, KvClient, RuntimeEnvs } from "../layers";
import { TodoRepo, TodoService, MediaGalleryRepo, MediaGalleryService } from "../domain";

/**
 * Base layer containing all core services for the application.
 * This layer is shared between different runtime configurations.
 */
export const BaseLayer = Layer.mergeAll(
  BucketClient.Default,
  // KvClient.Default,
  DbClient.Default,
  RuntimeEnvs.Default,
  TodoRepo.Default,
  TodoService.Default,
  MediaGalleryRepo.Default,
  MediaGalleryService.Default
);
