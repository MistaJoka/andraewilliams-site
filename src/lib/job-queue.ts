// Pure logic behind the "background job" mini-demo in the Server step
// of /tech-stack-fundamentals/ -- demonstrates that "the request
// already got a response" and "the real work is still happening"
// aren't a contradiction. Deliberately separate from stack-sim.ts (the
// main 3-tier live simulator), same reasoning as cache-demo.ts: this
// page's whole narrative is built around exactly three unchanging
// jobs, so this stays its own small, self-contained concept demo.
let jobCounter = 0;

export function resetJobCounter(): void {
  jobCounter = 0;
}

export interface JobSubmission {
  immediateResponse: string;
  jobId: number;
  backgroundSteps: string[];
}

export function submitBackgroundJob(task: string): JobSubmission {
  jobCounter++;
  const jobId = jobCounter;
  return {
    immediateResponse: `202 Accepted — job #${jobId} queued (request returns now)`,
    jobId,
    backgroundSteps: [
      `Job #${jobId}: started`,
      `Job #${jobId}: ${task}`,
      `Job #${jobId}: done`,
    ],
  };
}
