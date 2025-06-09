# JobScheduler

The `JobScheduler` allows you to define and run asynchronous tasks at fixed time intervals. Jobs can be executed in **parallel** or in a **sequential** queue.

## Example

```ts
import { Job, JobScheduler, Task } from "modktx";

(async () => {
  // Simulates a long-running task that takes ~10 seconds to complete
  const dummyTask: Task = {
    run: async () => {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      console.log("DummyTask");
    },
  };

  // Defines a job that runs the dummy task every 1 minute
  const job1: Job = {
    name: "Job 1",
    interval: "1m",
    execute: async () => {
      await dummyTask.run();
    },
  };

  // Initializes the JobScheduler with the job in 'sequential' mode
  const jobs: Job[] = [job1];
  const scheduler = new JobScheduler(jobs, "sequential");

  // Starts the scheduler
  scheduler.start();
})();
```

## Job Configuration

| Property     | Type     | Description                                     |
|--------------|----------|-------------------------------------------------|
| `name`       | string   | Unique name for identifying the job             |
| `interval`   | string   | Execution interval (`"1m"`, `"5m"`, `"1h"`, …) |
| `execute`    | function | Async function executed on each run             |

## JobScheduler Configuration

| Parameter          | Type     | Description                                                              |
|--------------------|----------|--------------------------------------------------------------------------|
| `jobs`             | `Job[]`  | List of jobs to be scheduled                                             |
| `mode`             | string   | `'parallel'` to run concurrently, `'sequential'` to queue job execution  |

## Notes

- Jobs repeat indefinitely based on the specified interval.
- Use `scheduler.stop()` to halt execution.
- In `'sequential'` mode, the scheduler automatically queues overlapping runs.
- It's recommended to handle errors inside the `execute` function to avoid unhandled rejections.