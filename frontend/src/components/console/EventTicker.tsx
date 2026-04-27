import { Activity, Clock, ShieldAlert, TrendingUp } from "lucide-react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";
import { generateTickerSeries } from "@/lib/mockEvents";
import { cn } from "@/lib/utils";

interface TickerCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  series: number[];
  accent: string;
  trend: string;
  trendUp?: boolean;
}

function TickerCard({
  label,
  value,
  icon: Icon,
  series,
  accent,
  trend,
  trendUp,
}: TickerCardProps) {
  const data = series.map((v, i) => ({ i, v }));
  return (
    <Card className="flex h-24 items-center gap-4 px-5">
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-md",
          accent,
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="flex flex-col">
        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
          {label}
        </span>
        <span className="font-display text-2xl text-[var(--text-primary)]">
          {value}
        </span>
        <span
          className={cn(
            "font-mono text-[10px]",
            trendUp ? "text-signal-block" : "text-signal-safe",
          )}
        >
          {trend}
        </span>
      </div>
      <div className="ml-auto h-12 w-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line
              type="monotone"
              dataKey="v"
              stroke="currentColor"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              className="text-signal-causal"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function EventTicker() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <TickerCard
        label="Queries / min"
        value="142"
        icon={TrendingUp}
        series={generateTickerSeries(11)}
        accent="bg-signal-causal/15 text-signal-causal"
        trend="+12% vs last hour"
        trendUp
      />
      <TickerCard
        label="Violation rate"
        value="6.3%"
        icon={ShieldAlert}
        series={generateTickerSeries(23)}
        accent="bg-signal-watch/15 text-signal-watch"
        trend="-0.4 pts vs last hour"
      />
      <TickerCard
        label="p50 latency"
        value="284 ms"
        icon={Clock}
        series={generateTickerSeries(37)}
        accent="bg-signal-info/15 text-signal-info"
        trend="-18 ms vs last hour"
      />
      <TickerCard
        label="Top violation"
        value="hallucination"
        icon={Activity}
        series={generateTickerSeries(53)}
        accent="bg-signal-block/15 text-signal-block"
        trend="32% of all violations"
        trendUp
      />
    </div>
  );
}
