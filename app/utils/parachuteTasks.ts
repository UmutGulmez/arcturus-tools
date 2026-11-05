// Web Worker ve ana iş parçacığı yedeği tarafından ortak kullanılan görev çalıştırıcı.
import { monteCarlo, simulateDescent } from './parachute'
import type { McConfig, McResult, SimParams, SimResult, StaticInputs } from './parachute'

export type TaskMessage =
  | { type: 'sim'; payload: SimParams }
  | { type: 'mc'; payload: { inputs: StaticInputs; cfg: McConfig } }

export type TaskResult<T extends TaskMessage> = T extends { type: 'sim' } ? SimResult : McResult

export function runTask<T extends TaskMessage>(msg: T): TaskResult<T> {
  if (msg.type === 'sim') return simulateDescent(msg.payload) as TaskResult<T>
  return monteCarlo(msg.payload.inputs, msg.payload.cfg) as TaskResult<T>
}
