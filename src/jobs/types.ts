/**
 * Defines allowed time interval strings for scheduling jobs.
 * Examples: '1m' = 1 minute, '1h' = 1 hour, '1d' = 1 day.
 */
export type IntervalString = '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
/**
 * Specifies how jobs should be executed.
 * 'parallel' means jobs run concurrently; 'sequential' means jobs run one after another.
 */
export type ExecutionMode = 'parallel' | 'sequential'
