import { createStart } from '@tanstack/react-start'

declare module '@tanstack/react-start' {
  interface Register {
    server: {
      requestContext: {
        env?: any
        // Add more custom context types as needed
      }
    }
  }
}

export const startInstance = createStart(() => {
  return {
    defaultSsr: true,
  }
})

// You can add middleware here if needed
// startInstance.createMiddleware().server(({ next }) => {
//   return next({
//     context: {
//       // Add any middleware context
//     },
//   })
// })
