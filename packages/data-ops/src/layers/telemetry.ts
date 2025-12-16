import * as Otlp from '@effect/opentelemetry/Otlp'
import * as FetchHttpClient from '@effect/platform/FetchHttpClient'
import { Effect, Layer } from 'effect'
import { RuntimeEnvs } from './index'

/**
 * Creates an observability layer that sends telemetry data to SigNoz via OTLP.
 * This layer uses Effect's native telemetry support without external OpenTelemetry packages.
 */
const createObservabilityLayer = (serviceName: string) =>
  Layer.unwrapEffect(
    Effect.gen(function* () {
      // Get configuration from RuntimeEnvs
      const envs = yield* RuntimeEnvs

      const enableTelemetry = envs.ENABLE_TELEMETRY === 'true'
      const environment = envs.NODE_ENV || 'development'

      // Skip telemetry if not enabled
      if (!enableTelemetry) {
        yield* Effect.log(`Telemetry disabled`)
        return Layer.empty
      }

      // SigNoz configuration
      const signozToken = envs.SIGNOZ_ACCESS_TOKEN || ''
      const signozEndpoint = envs.SIGNOZ_ENDPOINT || 'https://ingest.in.signoz.cloud:443'

      if (!signozToken) {
        yield* Effect.log(`SigNoz telemetry disabled: missing access token`)
        return Layer.empty
      }

      // Use Otlp.layer for both traces AND logs
      // Remove /v1/traces from endpoint since Otlp.layer will append the appropriate paths
      const signozBaseUrl = signozEndpoint.replace('/v1/traces', '')

      return Otlp.layer({
        baseUrl: signozBaseUrl,
        headers: {
          'signoz-access-token': signozToken,
        },
        resource: {
          serviceName: serviceName,
          serviceVersion: process.env.npm_package_version || 'unknown',
          attributes: {
            'service.environment': environment,
            'deployment.environment': environment,
          },
        },
      }).pipe(Layer.provide(FetchHttpClient.layer))
    }),
  )

// Export different layers for different services
// These layers expect RuntimeEnvs to be provided by the consumer
export const WorkerObservability = createObservabilityLayer('mooz-worker')
export const FrontendObservability = createObservabilityLayer('mooz-frontend')
export const SchedulerObservability = createObservabilityLayer('mooz-scheduler')

// Default export for convenience
export const TelemetryLayer = WorkerObservability
