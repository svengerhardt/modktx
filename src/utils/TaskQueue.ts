import logger from '../logger.js'

/**
 * A simple FIFO task queue that ensures tasks are executed sequentially.
 */
export class TaskQueue {
  /**
   * Internal queue holding async task functions to be executed.
   */
  private queue: Array<() => Promise<void>> = []
  /**
   * Flag indicating whether the queue is currently processing tasks.
   */
  private isProcessing = false

  /**
   * Adds a task to the queue and starts processing if not already running.
   * @param task - An async function to be added to the queue.
   */
  public add(task: () => Promise<void>) {
    this.queue.push(task)
    this.processQueue()
  }

  /**
   * Internal method that sequentially executes tasks from the queue.
   * Handles errors during task execution and continues processing.
   */
  private async processQueue() {
    if (this.isProcessing) return
    this.isProcessing = true
    while (this.queue.length > 0) {
      const task = this.queue.shift()!
      try {
        await task()
      } catch (error) {
        logger.error('Error when processing a task in the queue:', error)
      }
    }
    this.isProcessing = false
  }
}
