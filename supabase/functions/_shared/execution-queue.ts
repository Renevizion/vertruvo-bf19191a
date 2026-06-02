// ============================================
// FIX #7: WORKFLOW EXECUTION QUEUE
// ============================================

interface QueuedJob {
  id: string;
  workflowId: string;
  triggerData: any;
  priority: number;
  createdAt: number;
  attempts: number;
  maxAttempts: number;
}

interface JobResult {
  jobId: string;
  success: boolean;
  duration: number;
  error?: string;
}

class WorkflowQueue {
  private queue: QueuedJob[] = [];
  private processing: Set<string> = new Set();
  private results: Map<string, JobResult> = new Map();
  private maxConcurrent = 5;
  
  async enqueue(
    workflowId: string,
    triggerData: any,
    priority: number = 0,
    maxAttempts: number = 3
  ): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: QueuedJob = {
      id: jobId,
      workflowId,
      triggerData,
      priority,
      createdAt: Date.now(),
      attempts: 0,
      maxAttempts,
    };
    
    this.queue.push(job);
    this.queue.sort((a, b) => b.priority - a.priority); // Higher priority first
    
    console.log(`[Queue] Enqueued job ${jobId} for workflow ${workflowId} (priority: ${priority})`);
    
    // Start processing if not at max capacity
    this.processNext();
    
    return jobId;
  }
  
  private async processNext(): Promise<void> {
    // Check if we're at max concurrent jobs
    if (this.processing.size >= this.maxConcurrent) {
      return;
    }
    
    // Get next job
    const job = this.queue.shift();
    if (!job) return;
    
    this.processing.add(job.id);
    console.log(`[Queue] Processing job ${job.id} (${this.processing.size}/${this.maxConcurrent} slots)`);
    
    // Process job asynchronously
    this.executeJob(job).finally(() => {
      this.processing.delete(job.id);
      // Process next job
      this.processNext();
    });
  }
  
  private async executeJob(job: QueuedJob): Promise<void> {
    const startTime = Date.now();
    job.attempts++;
    
    try {
      // Call workflow executor
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/workflow-executor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          workflowId: job.workflowId,
          triggerData: job.triggerData,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Workflow execution failed: ${response.statusText}`);
      }
      
      const duration = Date.now() - startTime;
      
      this.results.set(job.id, {
        jobId: job.id,
        success: true,
        duration,
      });
      
      console.log(`[Queue] Job ${job.id} completed in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`[Queue] Job ${job.id} failed (attempt ${job.attempts}/${job.maxAttempts}):`, errorMessage);
      
      // Retry if not max attempts
      if (job.attempts < job.maxAttempts) {
        console.log(`[Queue] Retrying job ${job.id}...`);
        this.queue.unshift(job); // Add back to front of queue
      } else {
        this.results.set(job.id, {
          jobId: job.id,
          success: false,
          duration,
          error: errorMessage,
        });
      }
    }
  }
  
  getJobStatus(jobId: string): { status: 'queued' | 'processing' | 'completed' | 'failed' | 'not_found'; result?: JobResult } {
    if (this.processing.has(jobId)) {
      return { status: 'processing' };
    }
    
    const result = this.results.get(jobId);
    if (result) {
      return {
        status: result.success ? 'completed' : 'failed',
        result,
      };
    }
    
    const queued = this.queue.find(j => j.id === jobId);
    if (queued) {
      return { status: 'queued' };
    }
    
    return { status: 'not_found' };
  }
  
  getQueueStats() {
    return {
      queued: this.queue.length,
      processing: this.processing.size,
      completed: Array.from(this.results.values()).filter(r => r.success).length,
      failed: Array.from(this.results.values()).filter(r => !r.success).length,
    };
  }
}

// Global queue instance
export const workflowQueue = new WorkflowQueue();

// Queue job and return immediately
export async function queueWorkflowExecution(
  workflowId: string,
  triggerData: any,
  priority: number = 0
): Promise<string> {
  return await workflowQueue.enqueue(workflowId, triggerData, priority);
}

// Check job status
export function getJobStatus(jobId: string) {
  return workflowQueue.getJobStatus(jobId);
}

// Get queue statistics
export function getQueueStats() {
  return workflowQueue.getQueueStats();
}
