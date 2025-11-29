import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { mediaGalleryTable } from "../../db";
import z from "zod/v4";

export const MediaGalleryInsertSchema = createInsertSchema(mediaGalleryTable);
export const MediaGallerySelectSchema = createSelectSchema(mediaGalleryTable);

export type MediaGalleryInsert = z.infer<typeof MediaGalleryInsertSchema>;
export type MediaGallery = z.infer<typeof MediaGallerySelectSchema>;

