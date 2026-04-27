import { Save } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DEFAULT_POLICY = `domain: medical
rules:
  - id: emergency_redirect
    description: "Redirect emergency / suicidal queries to crisis resources before answering"
    triggers:
      any_of:
        - regex: "\\\\b(suicid(e|al)|kill myself|harm myself|end my life)\\\\b"
        - regex: "\\\\b(chest pain|stroke|cardiac arrest|can't breathe|unconscious)\\\\b"
    action: add_disclaimer
    severity: warn
    disclaimer: |
      ⚠️ This sounds like a medical emergency. Please call your local emergency number
      (in India: 112) or visit the nearest hospital immediately. AI assistants cannot
      replace urgent medical care.

  - id: dosage_disclaimer
    description: "Require disclaimer for dosage queries"
    triggers:
      any_of:
        - regex: "\\\\b(dose|dosage|how much|how many mg|frequency|interval)\\\\b"
    action: add_disclaimer
    severity: watch
    disclaimer: |
      Note: Dosing information is for educational reference only. Always consult a
      qualified healthcare professional before taking, changing, or stopping any medication.

  - id: diagnosis_block
    description: "Block direct diagnostic claims"
    triggers:
      all_of:
        - regex: "\\\\b(do I have|do i have|am I (suffering|having)|diagnose me|what disease)\\\\b"
    action: add_disclaimer
    severity: warn
    disclaimer: |
      I'm not able to diagnose conditions. The information below is general medical
      knowledge — please see a clinician for personal evaluation.

  - id: prescription_block
    description: "Refuse explicit prescription requests"
    triggers:
      any_of:
        - regex: "\\\\b(prescribe|write me a (script|prescription)|give me (antibiotics|opioids))\\\\b"
    action: block
    severity: block
    refusal: |
      I cannot prescribe medications. Prescriptions require a licensed clinician who
      has examined you. Please consult a doctor.
`;

export function PolicyEditor() {
  const [text, setText] = useState(DEFAULT_POLICY);
  const lineCount = useMemo(() => text.split("\n").length, [text]);

  const save = () => {
    toast.success("Policy saved (mock) — would re-validate against schema");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Policy editor</CardTitle>
            <CardDescription>
              Edit the active YAML policy. Changes apply on save (mock).
            </CardDescription>
          </div>
          <Button size="sm" onClick={save} className="gap-2">
            <Save className="h-3.5 w-3.5" aria-hidden />
            Save
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-[40px_1fr] overflow-hidden rounded-md border border-border-subtle bg-bg-deep">
          <div className="select-none border-r border-border-subtle bg-bg-surface py-3 text-right font-mono text-[10px] leading-relaxed text-[var(--text-tertiary)]">
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i} className="px-2">
                {i + 1}
              </div>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            className="min-h-[420px] resize-y border-0 bg-bg-deep p-3 font-mono text-xs leading-relaxed text-[var(--text-primary)] focus:outline-none focus:ring-0"
          />
        </div>
        <p className="mt-2 font-mono text-[10px] text-[var(--text-tertiary)]">
          {lineCount} lines · backed by backend/policies/medical.yaml
        </p>
      </CardContent>
    </Card>
  );
}
