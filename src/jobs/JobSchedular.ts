import { TaskQueue } from '../utils/TaskQueue.js'
import type { ExecutionMode, IntervalString } from './types.js'
import type { Job } from './Job.js'
import logger from '../logger.js'

export class JobScheduler {
  /**
   * Array of jobs to be scheduled and executed.
   */
  private jobs: Job[]

  /**
   * Determines how jobs are executed: either in 'parallel' or 'sequential' mode.
   */
  private executionMode: ExecutionMode

  /**
   * Array of timers used to schedule job executions at specified intervals.
   */
  private timers: NodeJS.Timeout[] = []

  /**
   * Task queue used to manage sequential execution of jobs.
   * Initialized only if execution mode is 'sequential'.
   */
  private taskQueue?: TaskQueue

  /**
   * Map to track the running state of each job by its name.
   * True means the job is currently running or scheduled.
   */
  private jobStates: Map<string, boolean> = new Map()

  /**
   * Creates a new JobScheduler instance.
   * @param jobs - Array of jobs to schedule.
   * @param executionMode - Mode of execution: 'parallel' (default) or 'sequential'.
   */
  constructor(jobs: Job[], executionMode: ExecutionMode = 'parallel') {
    this.jobs = jobs
    this.executionMode = executionMode
    if (this.executionMode === 'sequential') {
      this.taskQueue = new TaskQueue()
    }
    for (const job of this.jobs) {
      this.jobStates.set(job.name, false)
    }
  }

  /**
   * Converts an interval string (e.g. '5m', '1h', '2d') into milliseconds.
   * @param interval - Interval string representing the duration.
   * @returns The interval duration in milliseconds.
   * @throws Error if the interval unit is unknown.
   */
  private convertIntervalToMs(interval: IntervalString): number {
    const unit = interval.slice(-1) // 'm', 'h' or 'd'
    const value = parseInt(interval.slice(0, -1), 10)
    switch (unit) {
      case 'm':
        return value * 60 * 1000
      case 'h':
        return value * 60 * 60 * 1000
      case 'd':
        return value * 24 * 60 * 60 * 1000
      default:
        throw new Error(`Unknown interval unit: ${unit}`)
    }
  }

  /**
   * Starts the job scheduler, setting up timers for all jobs based on their intervals.
   * Logs the start event with execution mode and number of jobs.
   */
  public start() {
    logger.info(
      `Start JobScheduler in ${this.executionMode} mode with ${this.jobs.length} jobs.`,
    )
    for (const job of this.jobs) {
      const intervalMs = this.convertIntervalToMs(job.interval)
      this.scheduleJob(job, intervalMs)
    }
  }

  /**
   * Schedules a job to run repeatedly at the specified interval.
   * @param job - The job to schedule.
   * @param intervalMs - The interval in milliseconds between executions.
   */
  private scheduleJob(job: Job, intervalMs: number) {
    // Optional: Immediate call at startup TODO: make it configurable
    // this.executeJob(job)
    const timer = setInterval(() => {
      this.executeJob(job)
    }, intervalMs)
    this.timers.push(timer)
  }

  /**
   * Executes a job if it is not already running.
   * In 'parallel' mode, runs the job immediately.
   * In 'sequential' mode, adds the job to the task queue.
   * Handles job execution errors and updates job state accordingly.
   * @param job - The job to execute.
   */
  private executeJob(job: Job) {
    if (this.jobStates.get(job.name)) {
      logger.warn(
        `Job "${job.name}" is already running or scheduled; skip this call.`,
      )
      return
    }
    this.jobStates.set(job.name, true)
    const task = async () => {
      try {
        await job.execute()
      } catch (error) {
        logger.error(`Error when executing job "${job.name}":`, error)
      } finally {
        this.jobStates.set(job.name, false)
      }
    }

    if (this.executionMode === 'parallel') {
      logger.info(`Execute job "${job.name}" in parallel.`)
      task()
    } else {
      logger.info(
        `Add job "${job.name}" in the queue for sequential execution.`,
      )
      this.taskQueue!.add(task)
    }
  }

  /**
   * Stops all scheduled jobs by clearing their timers.
   * Logs that the scheduler has been stopped.
   */
  public stop() {
    for (const timer of this.timers) {
      clearInterval(timer)
    }
    logger.info('JobScheduler has been stopped.')
  }

  /**
   * Returns a list of job names that are currently active (running or scheduled).
   * @returns Array of active job names.
   */
  public getActiveJobs(): string[] {
    const activeJobs: string[] = []
    this.jobStates.forEach((isActive, jobName) => {
      if (isActive) {
        activeJobs.push(jobName)
      }
    })
    return activeJobs
  }
}
