import { Effect } from "effect";
import { MediaGalleryRepo } from "./repo";
import { BucketClient } from "../../layers";
import { v4 as uuid } from "uuid";

export interface CreateMediaInput {
  title: string;
  description?: string;
  imageBuffer: Buffer;
  imageName: string;
  mimeType?: string;
}

export class MediaGalleryService extends Effect.Service<MediaGalleryService>()("MediaGalleryService", {
  effect: Effect.gen(function* () {
    const repo = yield* MediaGalleryRepo;
    const bucket = yield* BucketClient;

    return {
      getAllMedia: repo.getAllMedia,

      createMedia: (data: CreateMediaInput) =>
        Effect.gen(function* () {
          // Upload to storage
          const key = `media/${uuid()}-${data.imageName}`;
          yield* bucket.put(key, data.imageBuffer, {
            httpMetadata: data.mimeType ? { contentType: data.mimeType } : undefined,
          });

          // Save metadata to database
          return yield* repo.createMedia({
            title: data.title,
            description: data.description,
            imageUrl: key,
            mimeType: data.mimeType,
            fileSize: data.imageBuffer.length,
          });
        }),

      deleteMedia: (id: string) =>
        Effect.gen(function* () {
          // Get media item first to find the image URL
          const allMedia = yield* repo.getAllMedia();
          const media = allMedia.find((m) => m.id === id);

          if (!media) {
            return yield* Effect.fail(new Error("Media not found"));
          }

          // Delete from bucket
          yield* bucket.delete(media.imageUrl);

          // Delete from database
          return yield* repo.deleteMedia(id);
        }),
    } as const;
  }),
  dependencies: [MediaGalleryRepo.Default, BucketClient.Default],
  accessors: true,
}) {}
