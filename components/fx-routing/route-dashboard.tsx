"use client";

import { useMemo, useState } from "react";
import {
  ArrowRightLeft,
  BriefcaseBusiness,
  Clock3,
  Crown,
  Gauge,
  Radar,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Priority, RouteDecisionResult, SimulationSummary } from "@/lib/types/fx-routing";

type RouteFormState = {
  amount: number;
  sourceCurrency: string;
  destinationCurrency: string;
  priority: Priority;
  maxTime?: number;
  maxFeePercent?: number;
  whatIfShockPercent?: number;
};

const initialState: RouteFormState = {
  amount: 2500,
  sourceCurrency: "USD",
  destinationCurrency: "INR",
  priority: "balanced",
  maxTime: 48,
  maxFeePercent: 3,
  whatIfShockPercent: 0,
};

export function RouteDashboard() {
  const [formState, setFormState] = useState<RouteFormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState<RouteDecisionResult | null>(null);
  const [simulation, setSimulation] = useState<SimulationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const simulationRows = useMemo(() => {
    if (!simulation) {
      return [];
    }
    return Object.entries(simulation.chosenCountByRail)
      .map(([railCode, count]) => ({
        railCode,
        count,
        averageCost: simulation.averageCostByRail[railCode] ?? 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [simulation]);

  async function submitRoute() {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: formState.amount,
          sourceCurrency: formState.sourceCurrency,
          destinationCurrency: formState.destinationCurrency,
          priority: formState.priority,
          constraints: {
            maxTime: formState.maxTime,
            maxFeePercent: formState.maxFeePercent,
          },
          whatIfShockPercent: formState.whatIfShockPercent,
        }),
      });
      const data = (await response.json()) as RouteDecisionResult | { details?: string; error?: string };
      if (!response.ok) {
        const message = "details" in data ? data.details : undefined;
        throw new Error(message ?? "Route evaluation failed");
      }
      setResult(data as RouteDecisionResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "System error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function runSimulation() {
    setIsSimulating(true);
    setError(null);
    try {
      const response = await fetch("/api/route/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: 1000,
          sourceCurrency: formState.sourceCurrency,
          destinationCurrency: formState.destinationCurrency,
          priority: formState.priority,
        }),
      });
      const data = (await response.json()) as SimulationSummary | { details?: string };
      if (!response.ok) {
        const message = "details" in data ? data.details : undefined;
        throw new Error(message ?? "Simulation failed");
      }
      setSimulation(data as SimulationSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Batch error");
    } finally {
      setIsSimulating(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[1380px] flex-col gap-7 px-4 py-6 md:px-8 md:py-9">
      <section className="relative overflow-hidden rounded-3xl border border-[#313f60]/35 bg-[linear-gradient(130deg,#0d152a_0%,#142649_44%,#1c315a_100%)] p-6 text-slate-100 shadow-[0_32px_90px_-50px_rgba(7,17,35,0.95)] md:p-8">
        <div className="pointer-events-none absolute -top-24 right-[-76px] size-72 rounded-full bg-cyan-300/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-36 left-8 size-80 rounded-full bg-indigo-300/12 blur-3xl" />
        <div className="relative z-10 grid gap-6 md:grid-cols-[1.2fr_auto] md:items-end">
          <div className="space-y-3">
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-200/35 bg-cyan-100/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
              <Sparkles className="size-3.5" />
              Smart FX Routing Engine
            </p>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-50 md:text-4xl">
              Professional cross-border route optimization
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-300 md:text-base">
              Compare rails on cost, settlement speed, and reliability with a transparent, audit-ready decision output.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[340px]">
            <HeroMetric
              label="Volatility"
              value={result ? `${(result.metadata.volatilityFactor * 100).toFixed(2)}%` : "0.00%"}
            />
            <HeroMetric label="Active Rails" value="3" />
          </div>
        </div>
      </section>

      {error ? (
        <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertTitle>Routing error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid items-start gap-6 xl:grid-cols-[390px_1fr]">
        <Card className="rounded-2xl border-slate-300/75 bg-white/90 shadow-[0_22px_50px_-35px_rgba(15,23,42,0.45)] backdrop-blur">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Radar className="size-4.5 text-slate-700" />
              Input Panel
            </CardTitle>
            <CardDescription>Set transaction values and execution constraints.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormLabel label="Amount" />
            <Input
              type="number"
              min={1}
              value={formState.amount}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  amount: Number(event.target.value) || 0,
                }))
              }
              className="h-10 rounded-xl border-slate-300 bg-white font-medium"
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <FormLabel label="Source" />
                <Input
                  value={formState.sourceCurrency}
                  maxLength={3}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      sourceCurrency: event.target.value.toUpperCase(),
                    }))
                  }
                  className="h-10 rounded-xl border-slate-300 bg-white font-mono font-semibold tracking-wide"
                />
              </div>
              <div className="space-y-2">
                <FormLabel label="Destination" />
                <Input
                  value={formState.destinationCurrency}
                  maxLength={3}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      destinationCurrency: event.target.value.toUpperCase(),
                    }))
                  }
                  className="h-10 rounded-xl border-slate-300 bg-white font-mono font-semibold tracking-wide"
                />
              </div>
            </div>

            <div className="space-y-2">
              <FormLabel label="Priority" />
              <Select
                value={formState.priority}
                onValueChange={(value) =>
                  setFormState((prev) => ({
                    ...prev,
                    priority: value as Priority,
                  }))
                }
              >
                <SelectTrigger className="h-10 w-full rounded-xl border-slate-300 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cheap">Cheap</SelectItem>
                  <SelectItem value="fast">Fast</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <FormLabel label="Max Time (h)" />
                <Input
                  type="number"
                  min={1}
                  value={formState.maxTime ?? ""}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      maxTime: Number(event.target.value) || undefined,
                    }))
                  }
                  className="h-10 rounded-xl border-slate-300 bg-white"
                />
              </div>
              <div className="space-y-2">
                <FormLabel label="Max Fee %" />
                <Input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={formState.maxFeePercent ?? ""}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      maxFeePercent: Number(event.target.value) || undefined,
                    }))
                  }
                  className="h-10 rounded-xl border-slate-300 bg-white"
                />
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <FormLabel label="What-if FX Shock" />
                <span className="font-mono text-xs font-semibold text-slate-500">
                  {formState.whatIfShockPercent && formState.whatIfShockPercent > 0 ? "+" : ""}
                  {formState.whatIfShockPercent ?? 0}%
                </span>
              </div>
              <Input
                type="range"
                min={-10}
                max={10}
                step={0.5}
                value={formState.whatIfShockPercent ?? 0}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    whatIfShockPercent: Number(event.target.value) || 0,
                  }))
                }
                className="h-2 rounded-full border-0 bg-slate-200 px-0"
              />
            </div>

            <div className="grid gap-2 pt-2">
              <Button
                className="h-10 rounded-xl bg-slate-900 text-slate-50 hover:bg-slate-800"
                disabled={isSubmitting}
                onClick={submitRoute}
              >
                {isSubmitting ? "Evaluating route..." : "Compute Optimal Route"}
              </Button>
              <Button
                variant="outline"
                className="h-10 rounded-xl border-slate-300 bg-white hover:bg-slate-50"
                disabled={isSimulating}
                onClick={runSimulation}
              >
                {isSimulating ? "Running simulation..." : "Simulate 1000 Transactions"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="rounded-2xl border-slate-300/75 bg-white/90 shadow-[0_22px_50px_-35px_rgba(15,23,42,0.45)] backdrop-blur">
            <CardHeader className="pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Crown className="size-4.5 text-amber-600" />
                  Selected Route
                </CardTitle>
                {result ? (
                  <Badge variant="outline" className="border-slate-300 bg-white text-[11px] uppercase tracking-wider">
                    {result.selectedRoute.anomalyFlag ? "High Friction Flag" : "Policy Clean"}
                  </Badge>
                ) : null}
              </div>
              <CardDescription>Best route and the rationale behind the choice.</CardDescription>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Recommended Rail</p>
                      <h3 className="mt-1 text-2xl font-semibold text-slate-900">{result.selectedRoute.railName}</h3>
                      <p className="mt-1 text-xs text-slate-500">Code: {result.selectedRoute.railCode}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Composite Score</p>
                      <p className="font-mono text-2xl font-semibold text-slate-900">
                        {result.selectedRoute.score.toFixed(4)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <StatTile icon={BriefcaseBusiness} label="Total Cost" value={result.selectedRoute.totalCostSource.toFixed(2)} />
                    <StatTile
                      icon={ArrowRightLeft}
                      label="Converted Amount"
                      value={result.selectedRoute.convertedAmount.toFixed(2)}
                    />
                    <StatTile icon={Clock3} label="Settlement" value={`${result.selectedRoute.estimatedSettlementTimeHours}h`} />
                    <StatTile icon={ShieldCheck} label="Reliability" value={`${(result.selectedRoute.reliabilityScore * 100).toFixed(1)}%`} />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Explanation</p>
                    <p className="text-sm leading-relaxed text-slate-700">{result.explanation}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center text-sm text-slate-500">
                  Submit a transaction profile to generate route intelligence.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-300/75 bg-white/90 shadow-[0_22px_50px_-35px_rgba(15,23,42,0.45)] backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Gauge className="size-4.5 text-slate-700" />
                Rail Comparison
              </CardTitle>
              <CardDescription>Cost, speed, reliability, and score across rails.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rail</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Fee %</TableHead>
                    <TableHead>Time (h)</TableHead>
                    <TableHead>Reliability</TableHead>
                    <TableHead>Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result?.comparisons.map((quote) => (
                    <TableRow key={quote.railCode} className={quote.railCode === result.selectedRoute.railCode ? "bg-slate-100/75" : ""}>
                      <TableCell className="font-medium text-slate-900">
                        {quote.railName}
                        {quote.disqualifiedReason ? (
                          <p className="mt-0.5 text-xs text-amber-700">{quote.disqualifiedReason}</p>
                        ) : null}
                      </TableCell>
                      <TableCell>{quote.totalCostSource.toFixed(2)}</TableCell>
                      <TableCell>{quote.feePercent.toFixed(2)}%</TableCell>
                      <TableCell>{quote.estimatedSettlementTimeHours.toFixed(1)}</TableCell>
                      <TableCell>{quote.reliabilityScore.toFixed(3)}</TableCell>
                      <TableCell className="font-mono">{quote.score.toFixed(4)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-300/75 bg-white/90 shadow-[0_22px_50px_-35px_rgba(15,23,42,0.45)] backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <TrendingUp className="size-4.5 text-slate-700" />
                1000x Simulation
              </CardTitle>
              <CardDescription>Rail dominance and average selected cost in batch routing.</CardDescription>
            </CardHeader>
            <CardContent>
              {simulation ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rail</TableHead>
                      <TableHead>Chosen</TableHead>
                      <TableHead>Win Rate</TableHead>
                      <TableHead>Average Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {simulationRows.map((row) => (
                      <TableRow key={row.railCode}>
                        <TableCell className="font-medium text-slate-900">{row.railCode}</TableCell>
                        <TableCell>{row.count}</TableCell>
                        <TableCell>{((row.count / simulation.totalRuns) * 100).toFixed(1)}%</TableCell>
                        <TableCell>{row.averageCost.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center text-sm text-slate-500">
                  Run simulation to view route distribution.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

function FormLabel({ label }: { label: string }) {
  return <Label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</Label>;
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-500/35 bg-slate-900/30 px-4 py-3 backdrop-blur-sm">
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-300">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold text-slate-50">{value}</p>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
      <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-slate-500">
        <Icon className="size-3.5" />
        {label}
      </p>
      <p className="mt-1.5 font-mono text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
