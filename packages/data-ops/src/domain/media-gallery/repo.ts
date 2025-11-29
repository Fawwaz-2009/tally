import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { mediaGalleryTable } from "../../db";
import { DbClient } from "../../layers";
import { MediaGalleryInsert } from "./schema";
import { withDbTryPromise } from "../shared/utils";

export class MediaGalleryRepo extends Effect.Service<MediaGalleryRepo>()("MediaGalleryRepo", {
  effect: Effect.gen(function* () {
    const db = yield* DbClient;
    return {
      createMedia: Effect.fn("mediaGalleryRepo.createMedia")(
        function* (media: MediaGalleryInsert) {
          return yield* withDbTryPromise(db.insert(mediaGalleryTable).values(media).returning().get());
        },
        Effect.tap((r) => {
          return Effect.annotateCurrentSpan("io.output", r);
        })
      ),
      getAllMedia: Effect.fn("mediaGalleryRepo.getAllMedia")(
        function* () {
          return yield* withDbTryPromise(db.select().from(mediaGalleryTable).orderBy(mediaGalleryTable.createdAt).all());
        },
        Effect.tap((r) => {
          return Effect.annotateCurrentSpan("io.output", r);
        })
      ),
      deleteMedia: Effect.fn("mediaGalleryRepo.deleteMedia")(
        function* (id: string) {
          const result = yield* withDbTryPromise(db.delete(mediaGalleryTable).where(eq(mediaGalleryTable.id, id)).returning().get());
          if (!result) {
            return yield* Effect.fail(new Error("Media not found"));
          }
          return result;
        },
        Effect.tap((r) => {
          return Effect.annotateCurrentSpan("io.output", r);
        })
      ),
    } as const;
  }),
  accessors: true,
  dependencies: [DbClient.Default],
}) {}
