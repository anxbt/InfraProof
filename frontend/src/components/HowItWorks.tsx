import { Send, Cpu, Database, Shield } from "lucide-react";

const steps = [
  {
    icon: Send,
    title: "Task Creation",
    description: "A deterministic task specification is hashed and committed on-chain.",
  },
  {
    icon: Cpu,
    title: "Off-chain Execution",
    description: "An operator executes the SERVER_BENCHMARK workload off-chain.",
  },
  {
    icon: Database,
    title: "Artifact Storage",
    description: "Logs and metrics are uploaded to Greenfield as immutable artifacts.",
  },
  {
    icon: Shield,
    title: "Receipt Verification",
    description: "Artifact hashes are committed on-chain for tamper-proof verification.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-12 mb-12">
      <h2 className="text-sm font-semibold text-foreground mb-6">
        How InfraProof Verifies Execution
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className="bg-card border border-border rounded p-5"
          >
            <div className="flex gap-4 items-start">
              <div className="w-9 h-9 bg-secondary rounded flex items-center justify-center flex-shrink-0">
                <step.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-muted-foreground/60 text-xs font-mono">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-sm font-medium text-foreground">
                    {step.title}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HowItWorks;
