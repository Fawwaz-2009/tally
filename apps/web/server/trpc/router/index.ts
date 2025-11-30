import { z } from 'zod'

import { createTRPCRouter, publicProcedure } from '../init'

import { type TRPCRouterRecord } from '@trpc/server'
import { frontendRuntime } from '@repo/data-ops/runtimes'
import { TodoService, MediaGalleryService } from '@repo/data-ops/domain'
import { Effect } from 'effect'

const todosRouter = {
  list: publicProcedure.query(async () => {
    const program = Effect.gen(function* () {
      const service = yield* TodoService
      return yield* service.getTodos()
    })
    return frontendRuntime.runPromise(program)
  }),
  add: publicProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input }) => {
      const program = Effect.gen(function* () {
        const service = yield* TodoService
        return yield* service.createTodo({ name: input.name })
      })
      return frontendRuntime.runPromise(program)
    }),
} satisfies TRPCRouterRecord

const mediaGalleryRouter = {
  list: publicProcedure.query(async () => {
    const program = Effect.gen(function* () {
      const service = yield* MediaGalleryService
      return yield* service.getAllMedia()
    })
    return frontendRuntime.runPromise(program)
  }),
  add: publicProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        imageBase64: z.string(),
        imageName: z.string(),
        mimeType: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const program = Effect.gen(function* () {
        const service = yield* MediaGalleryService
        const buffer = Buffer.from(input.imageBase64, 'base64')
        return yield* service.createMedia({
          title: input.title,
          description: input.description,
          imageBuffer: buffer,
          imageName: input.imageName,
          mimeType: input.mimeType,
        })
      })
      return frontendRuntime.runPromise(program)
    }),
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const program = Effect.gen(function* () {
        const service = yield* MediaGalleryService
        return yield* service.deleteMedia(input.id)
      })
      return frontendRuntime.runPromise(program)
    }),
} satisfies TRPCRouterRecord

export const trpcRouter = createTRPCRouter({
  todos: todosRouter,
  mediaGallery: mediaGalleryRouter,
})
export type TRPCRouter = typeof trpcRouter
