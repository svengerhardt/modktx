import type { IntervalString } from './types.js'

/**
 * Represents a scheduled job with a name, interval, and execution logic.
 */
export interface Job {
  /**
   * Unique name of the job used for identification and logging.
   */
  name: string
  /**
   * Time interval string indicating how often the job should run (e.g., '1m', '1h').
   */
  interval: IntervalString
  /**
   * Function that contains the logic to be executed when the job runs.
   * @returns A promise that resolves when the job has completed.
   */
  execute: () => Promise<void>
}
