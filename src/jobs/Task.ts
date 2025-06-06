/**
 * Represents a generic task that can be executed asynchronously.
 */
export interface Task {
  /**
   * Executes the task.
   * @returns A promise that resolves when the task is complete.
   */
  run(): Promise<void>
}
