import { Layer, ManagedRuntime } from 'effect'
import { RuntimeEnvs, WorkerObservability } from '../layers'
import { BaseLayer } from './base-layer'

// Add telemetry layer with RuntimeEnvs dependency
const RuntimeLayer = Layer.mergeAll(BaseLayer, WorkerObservability.pipe(Layer.provide(RuntimeEnvs.Default)))

export const frontendRuntime = ManagedRuntime.make(RuntimeLayer)
