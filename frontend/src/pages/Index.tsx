import { useState, useCallback } from "react";
import { Github, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import TaskStatusCard, { TaskStatus } from "@/components/TaskStatusCard";
import HowItWorks from "@/components/HowItWorks";
import { createTask, executeTask } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [taskStatus, setTaskStatus] = useState<TaskStatus>("idle");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [receiptTxHash, setReceiptTxHash] = useState<string | undefined>();
  const [artifactUrl, setArtifactUrl] = useState<string | undefined>();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleCreateTask = useCallback(async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setTaskStatus("created");
    setReceiptTxHash(undefined);
    setArtifactUrl(undefined);

    try {
      // Step 1: Create task on-chain
      const createResponse = await createTask(30);
      const newTaskId = createResponse.taskId.toString();
      setTaskId(newTaskId);

      toast({
        title: "Task Created",
        description: `Task ID: ${newTaskId} | TX: ${createResponse.txHash.slice(0, 10)}...`,
      });

      // Step 2: Auto-execute (simulating autonomous operator)
      setTaskStatus("running");

      const executeResponse = await executeTask(createResponse.taskId);

      // Store the receipt transaction hash and artifact URL
      setReceiptTxHash(executeResponse.receiptTxHash);
      setArtifactUrl(executeResponse.artifactUrl);

      toast({
        title: "Task Completed",
        description: `Artifacts uploaded | Receipt TX: ${executeResponse.receiptTxHash.slice(0, 10)}...`,
      });

      setTaskStatus("completed");
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process task",
        variant: "destructive",
      });
      setTaskStatus("idle");
      setTaskId(null);
      setReceiptTxHash(undefined);
      setArtifactUrl(undefined);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, toast]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero section with gradient */}
      <div className="bg-gradient-dawn">
        <div className="max-w-2xl mx-auto px-6 pt-12 pb-16">
          {/* Header */}
          <header className="mb-12">
            <div className="flex items-center gap-2 mb-2">
              <Server className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-semibold text-foreground">InfraProof</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Verifiable execution layer for decentralized infrastructure tasks.
            </p>
          </header>

          {/* Primary Action Section */}
          <section>
            <Button
              onClick={handleCreateTask}
              disabled={isProcessing}
              className="w-full sm:w-auto px-6 py-3 text-sm font-medium bg-primary text-primary-foreground hover:brightness-110 transition-all disabled:opacity-50"
            >
              Create SERVER_BENCHMARK Task
            </Button>

            <ul className="mt-6 space-y-2">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-primary mt-0.5">•</span>
                Task specification is committed on-chain
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-primary mt-0.5">•</span>
                Operator executes a deterministic server benchmark
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-primary mt-0.5">•</span>
                Execution artifacts are verified via Greenfield + BNB Chain
              </li>
            </ul>
          </section>
        </div>
      </div>

      {/* Main content on solid background */}
      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* Live Task Status Card */}
        <section className="mb-12">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground mb-3 font-medium">
            Task Execution Status
          </h2>
          <TaskStatusCard
            status={taskStatus}
            taskId={taskId}
            receiptTxHash={receiptTxHash}
            artifactUrl={artifactUrl}
          />
        </section>

        {/* How It Works */}
        <HowItWorks />

        {/* Why This Is DePIN */}
        <section className="mb-12 bg-card border border-border rounded p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Why This Is DePIN
          </h2>
          <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
            <p>
              InfraProof decentralizes infrastructure execution by separating task creation, execution, and verification.
            </p>
            <p>
              Operators execute work off-chain, while integrity is enforced on-chain through verifiable receipts.
            </p>
            <p>
              Hardware is abstracted, making the protocol infrastructure-agnostic and scalable.
            </p>
          </div>
        </section>

        {/* Technical Assurance */}
        <section className="mb-12 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground/70">
          <span>Open-source protocol</span>
          <span>Deterministic execution</span>
          <span>On-chain receipt verification</span>
          <span>Greenfield-backed artifact integrity</span>
        </section>

        {/* Footer */}
        <footer className="pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>

            <p className="text-xs text-muted-foreground">
              Built on BNB Chain and Greenfield
            </p>

            <p className="text-xs text-muted-foreground">
              Open-source • Verifiable • DePIN
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
