const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

/**
 * API client for InfraProof backend
 */

export interface CreateTaskResponse {
    success: boolean;
    taskId: number;
    specHash: string;
    txHash: string;
    taskSpec: {
        type: string;
        duration: number;
        config: object;
        createdAt: string;
    };
}

export interface ExecuteTaskResponse {
    success: boolean;
    taskId: number;
    artifactHash: string;
    resultHash: string;
    artifactUrl: string;
    receiptTxHash: string;
    benchmarkSummary: {
        duration: number;
        cpuOpsPerSec: number;
        memoryWriteMBps: number;
        diskWriteMBps: number;
    };
}

export interface GetTaskResponse {
    success: boolean;
    task: {
        taskId: number;
        requester: string;
        specHash: string;
        createdAt: number;
        status: 'PENDING' | 'COMPLETED';
    };
    receipt: {
        operator: string;
        artifactHash: string;
        resultHash: string;
        completedAt: number;
    } | null;
}

/**
 * Create a new SERVER_BENCHMARK task
 */
export async function createTask(duration: number = 30): Promise<CreateTaskResponse> {
    const response = await fetch(`${BACKEND_URL}/tasks/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            type: 'SERVER_BENCHMARK',
            duration,
            config: {},
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create task');
    }

    return response.json();
}

/**
 * Execute a task (trigger benchmark)
 */
export async function executeTask(taskId: number): Promise<ExecuteTaskResponse> {
    const response = await fetch(`${BACKEND_URL}/tasks/execute/${taskId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to execute task');
    }

    return response.json();
}

/**
 * Get task status
 */
export async function getTask(taskId: number): Promise<GetTaskResponse> {
    const response = await fetch(`${BACKEND_URL}/tasks/${taskId}`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch task');
    }

    return response.json();
}
