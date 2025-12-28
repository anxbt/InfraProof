import { ExternalLink, FileText } from "lucide-react";

export type TaskStatus = "idle" | "created" | "running" | "completed";

interface TaskStatusCardProps {
  status: TaskStatus;
  taskId: string | null;
  receiptTxHash?: string;
  artifactUrl?: string;
}

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  idle: { label: "Awaiting Task", className: "text-muted-foreground" },
  created: { label: "Created", className: "text-status-created" },
  running: { label: "Running", className: "text-status-running" },
  completed: { label: "Completed", className: "text-status-completed" },
};

const TaskStatusCard = ({ status, taskId, receiptTxHash, artifactUrl }: TaskStatusCardProps) => {
  const { label, className } = statusConfig[status];

  if (status === "idle") {
    return (
      <div className="bg-card border border-border rounded p-6">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">Awaiting task submission</p>
          <p className="text-muted-foreground/70 text-xs mt-1">
            No active execution
          </p>
        </div>
      </div>
    );
  }

  // BSC Testnet explorer URL
  const getExplorerUrl = (txHash: string) =>
    `https://testnet.bscscan.com/tx/${txHash}`;

  return (
    <div className="bg-card border border-border rounded p-6">
      <div className="space-y-4">
        {/* Task ID */}
        <div className="flex justify-between items-start">
          <span className="text-muted-foreground text-xs uppercase tracking-wide">
            Task ID
          </span>
          <code className="text-foreground text-xs font-mono bg-secondary px-2 py-1 rounded">
            {taskId}
          </code>
        </div>

        {/* Status */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-xs uppercase tracking-wide">
            Status
          </span>
          <span className={`text-sm font-medium ${className}`}>{label}</span>
        </div>

        {/* Operator */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-xs uppercase tracking-wide">
            Operator
          </span>
          <code className="text-foreground text-xs font-mono">
            0xBa26...a405E
          </code>
        </div>

        {/* On-chain Receipt */}
        {receiptTxHash && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs uppercase tracking-wide">
              On-chain Receipt
            </span>
            <a
              href={getExplorerUrl(receiptTxHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary text-xs flex items-center gap-1 hover:brightness-110 transition-all"
            >
              View Transaction
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Execution Artifacts - only show when completed */}
        {status === "completed" && artifactUrl && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs uppercase tracking-wide">
              Execution Artifacts
            </span>
            <a
              href={artifactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary text-xs flex items-center gap-1 hover:brightness-110 transition-all"
            >
              View on Greenfield
              <FileText className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskStatusCard;
