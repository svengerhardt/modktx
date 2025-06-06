# JobScheduler

The `JobScheduler` enables scheduling and management of jobs at fixed intervals, either in **parallel** or **sequential** execution mode.

## Example

```ts
import { Job, JobScheduler, Task } from "modktx";

(async () => {
  // Defines a task that simulates a 10-second asynchronous operation
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

## Parameters

- `Job.name`: A unique name for the job.
- `Job.interval`: Time interval as a string (`'1m'`, `'5m'`, `'1h'`, etc.).
- `Job.execute`: An async function that contains the logic to run.
- `JobScheduler`: Can be initialized with multiple jobs and run in:
  - `'parallel'` – run jobs concurrently.
  - `'sequential'` – run jobs one after another using a queue.

## Notes

- Jobs will continue running on the specified interval until `scheduler.stop()` is called.
- In `'sequential'` mode, overlapping execution is prevented automatically.