import {
  Bar,
  BarChart,
  CartesianGrid,
  ErrorBar,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Row {
  dataset: string;
  guardian: number;
  guardian_err: [number, number];
  judge: number;
  judge_err: [number, number];
  random: number;
  random_err: [number, number];
}

const DATA: Row[] = [
  {
    dataset: "MedHalt-2k",
    guardian: 0.74,
    guardian_err: [0.04, 0.04],
    judge: 0.58,
    judge_err: [0.05, 0.05],
    random: 0.18,
    random_err: [0.03, 0.03],
  },
  {
    dataset: "GovHarm-1k",
    guardian: 0.82,
    guardian_err: [0.03, 0.03],
    judge: 0.61,
    judge_err: [0.04, 0.04],
    random: 0.2,
    random_err: [0.03, 0.03],
  },
  {
    dataset: "MedRAG-Inj",
    guardian: 0.69,
    guardian_err: [0.05, 0.05],
    judge: 0.49,
    judge_err: [0.06, 0.06],
    random: 0.15,
    random_err: [0.03, 0.03],
  },
  {
    dataset: "PII-Echo",
    guardian: 0.91,
    guardian_err: [0.02, 0.02],
    judge: 0.72,
    judge_err: [0.04, 0.04],
    random: 0.22,
    random_err: [0.03, 0.03],
  },
  {
    dataset: "Drift-Med",
    guardian: 0.66,
    guardian_err: [0.05, 0.05],
    judge: 0.45,
    judge_err: [0.06, 0.06],
    random: 0.17,
    random_err: [0.03, 0.03],
  },
];

export function BenchmarkScoreboard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top-1 attribution accuracy</CardTitle>
        <CardDescription>
          GuardianAI vs LLM-judge baseline vs random, with 95% bootstrap CI.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={DATA}
              margin={{ top: 16, right: 24, left: 0, bottom: 8 }}
            >
              <CartesianGrid stroke="var(--border-subtle)" vertical={false} />
              <XAxis
                dataKey="dataset"
                stroke="var(--text-tertiary)"
                fontSize={11}
              />
              <YAxis
                stroke="var(--text-tertiary)"
                fontSize={11}
                domain={[0, 1]}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: 11,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="guardian" fill="var(--signal-causal)" name="GuardianAI">
                <ErrorBar
                  dataKey="guardian_err"
                  width={6}
                  stroke="var(--text-secondary)"
                />
              </Bar>
              <Bar dataKey="judge" fill="var(--signal-info)" name="LLM-judge">
                <ErrorBar
                  dataKey="judge_err"
                  width={6}
                  stroke="var(--text-secondary)"
                />
              </Bar>
              <Bar dataKey="random" fill="var(--signal-watch)" name="Random">
                <ErrorBar
                  dataKey="random_err"
                  width={6}
                  stroke="var(--text-secondary)"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
