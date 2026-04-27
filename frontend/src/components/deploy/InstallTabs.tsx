import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SNIPPETS: Record<string, string> = {
  builtin: `# Run the built-in FastAPI server (Phase 1+)
uvicorn src.main:app --port 8000

# Send a governed request
curl -X POST http://localhost:8000/api/medrag/chat \\
  -H "Content-Type: application/json" \\
  -H "Accept: text/event-stream" \\
  -d '{
    "session_id": "demo",
    "user_input": "What is the safe dose of paracetamol?"
  }'`,
  sdk: `# Install (Phase 5)
pip install guardianai

# Use the @guardian.govern decorator on any LLM function
from guardian import guardian

@guardian.govern(domain="medical")
def answer(query: str) -> str:
    return llm.complete(query)

# All seven agents run automatically — pre-flight gates the call,
# post-flight inspects the output. Inspect the trace via .last_trace().
print(answer.last_trace().verdicts)`,
  proxy: `# OpenAI-compatible HTTP proxy (Phase 6 — coming next)
docker run -p 4000:4000 \\
  -e GUARDIAN_DOMAIN=medical \\
  guardianai/proxy:latest

# Then point your existing client at it — no code changes
import openai
openai.api_base = "http://localhost:4000/v1"
openai.api_key  = "sk-..."  # forwarded as-is

resp = openai.ChatCompletion.create(
  model="gpt-4o-mini",
  messages=[{"role": "user", "content": "..."}],
)
# resp.guardian.trace_id, resp.guardian.verdicts present.`,
};

interface SnippetProps {
  text: string;
}

function Snippet({ text }: SnippetProps) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="relative">
      <pre className="max-h-[420px] overflow-auto rounded-md border border-border-subtle bg-bg-deep p-4 font-mono text-xs leading-relaxed text-[var(--text-secondary)]">
        {text}
      </pre>
      <div className="absolute right-2 top-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={copy}
          className="gap-2"
          aria-label="Copy snippet to clipboard"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

export function InstallTabs() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Install</CardTitle>
        <CardDescription>
          Three integration paths — pick whichever fits your stack.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="builtin">
          <TabsList>
            <TabsTrigger value="builtin">Built-in</TabsTrigger>
            <TabsTrigger value="sdk">Python SDK</TabsTrigger>
            <TabsTrigger value="proxy">Proxy</TabsTrigger>
          </TabsList>
          <TabsContent value="builtin">
            <Snippet text={SNIPPETS.builtin} />
          </TabsContent>
          <TabsContent value="sdk">
            <Snippet text={SNIPPETS.sdk} />
            <p className="mt-2 font-mono text-[10px] text-[var(--text-tertiary)]">
              SDK shipped in Phase 5 — the snippet above reflects the live API.
            </p>
          </TabsContent>
          <TabsContent value="proxy">
            <Snippet text={SNIPPETS.proxy} />
            <p className="mt-2 font-mono text-[10px] text-[var(--text-tertiary)]">
              Proxy lands in Phase 6 — preview the planned drop-in interface.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
