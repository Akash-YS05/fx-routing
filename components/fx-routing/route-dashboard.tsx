"use client";

import { useMemo, useState } from "react";
import {
  ArrowRightLeft,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Crown,
  Gauge,
  Radar,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
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
import {
  Priority,
  ReplayHistoryPage,
  ReplayHistoryItem,
  RouteDecisionResult,
  SimulationSummary,
} from "@/lib/types/fx-routing";

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
  const [replayHistory, setReplayHistory] = useState<ReplayHistoryItem[]>([]);
  const [replayPageInfo, setReplayPageInfo] = useState<
    Pick<ReplayHistoryPage, "page" | "pageSize" | "totalItems" | "totalPages"> | null
  >(null);
  const [isReplaySectionOpen, setIsReplaySectionOpen] = useState(false);
  const [isReplayLoading, setIsReplayLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simulationRows = useMemo(() => {
    if (!simulation) return [];

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

  async function loadReplayHistory(page = 1) {
    setIsReplayLoading(true);
    setError(null);
    try {
      const pageSize = replayPageInfo?.pageSize ?? 6;
      const response = await fetch(`/api/route/replay?page=${page}&pageSize=${pageSize}`);
      const data = (await response.json()) as ReplayHistoryPage | { details?: string };

      if (!response.ok) {
        const details = "details" in data ? data.details : undefined;
        throw new Error(details ?? "Unable to fetch replay history");
      }

      const pageData = data as ReplayHistoryPage;
      setReplayHistory(pageData.items ?? []);
      setReplayPageInfo({
        page: pageData.page,
        pageSize: pageData.pageSize,
        totalItems: pageData.totalItems,
        totalPages: pageData.totalPages,
      });
      setIsReplaySectionOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Replay history error");
    } finally {
      setIsReplayLoading(false);
    }
  }

  async function replayDecision(transactionId: string) {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/route/replay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId }),
      });

      const data = (await response.json()) as RouteDecisionResult | { details?: string; error?: string };
      if (!response.ok) {
        const message = "details" in data ? data.details : undefined;
        throw new Error(message ?? "Replay execution failed");
      }

      setResult(data as RouteDecisionResult);
      await loadReplayHistory(replayPageInfo?.page ?? 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Replay error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[1380px] flex-col gap-7 px-4 py-6 md:px-8 md:py-9">
      <section className="relative overflow-hidden rounded-3xl border border-[#dce5fb] bg-[linear-gradient(132deg,#f4f7ff_0%,#edf2ff_42%,#f7f9ff_100%)] p-6 shadow-[0_34px_70px_-48px_rgba(49,80,150,0.45),inset_0_1px_0_0_rgba(255,255,255,0.95)] md:p-8">
        <div className="pointer-events-none absolute -top-28 right-[-82px] size-72 rounded-full bg-[#bfd3ff]/45 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-4 size-80 rounded-full bg-[#d5dfff]/42 blur-3xl" />

        <div className="relative z-10 grid gap-6 md:grid-cols-[1.2fr_auto] md:items-end">
          <div className="space-y-3">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#c9d7fc] bg-white/72 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-[#41557e] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)]">
              {/* <Sparkles className="size-3.5 text-[#506ba9]" /> */}
              Smart FX Routing Engine
            </p>
            <h1 className="text-3xl font-normal leading-tight tracking-tight text-[#1d2b49] md:text-4xl">
              Precise, elegant cross-border route optimization
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed font-light text-[#4b5f89] md:text-base">
              Evaluate rails by cost, settlement speed, and reliability with crisp controls and explainable decisions.
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
        <Card className="rounded-2xl border-[#d7dff3] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9ff_100%)] shadow-[0_18px_42px_-32px_rgba(46,68,125,0.36),inset_0_1px_0_0_rgba(255,255,255,0.9)]">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 font-medium text-[#1f2f53]">
              <Radar className="size-4.5 text-[#48639e]" />
              Input Panel
            </CardTitle>
            <CardDescription className="font-light text-[#5c6f96]">
              Set transaction values and execution constraints.
            </CardDescription>
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
              className="h-10 rounded-xl border-[#d2dbf1] bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_100%)] font-light text-[#203056] shadow-[inset_0_1px_2px_0_rgba(34,55,100,0.08),0_1px_0_0_rgba(255,255,255,0.7)]"
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
                  className="h-10 rounded-xl border-[#d2dbf1] bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_100%)] font-mono font-medium tracking-wide text-[#21345e] shadow-[inset_0_1px_2px_0_rgba(34,55,100,0.08)]"
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
                  className="h-10 rounded-xl border-[#d2dbf1] bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_100%)] font-mono font-medium tracking-wide text-[#21345e] shadow-[inset_0_1px_2px_0_rgba(34,55,100,0.08)]"
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
                <SelectTrigger className="h-10 w-full rounded-xl border-[#d2dbf1] bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_100%)] font-light text-[#203056] shadow-[inset_0_1px_2px_0_rgba(34,55,100,0.08)]">
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
                  className="h-10 rounded-xl border-[#d2dbf1] bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_100%)] font-light text-[#203056] shadow-[inset_0_1px_2px_0_rgba(34,55,100,0.08)]"
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
                  className="h-10 rounded-xl border-[#d2dbf1] bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_100%)] font-light text-[#203056] shadow-[inset_0_1px_2px_0_rgba(34,55,100,0.08)]"
                />
              </div>
            </div>

            <div className="space-y-2 border-t border-[#e4eaf9] pt-4">
              <div className="flex items-center justify-between">
                <FormLabel label="What-if FX Shock" />
                <span className="font-mono text-xs font-medium text-[#5b6f9b]">
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
                className="h-2 rounded-full border-0 bg-[#e2e9fb] px-0"
              />
            </div>

            <div className="grid gap-2 pt-2">
              <Button
                className="h-10 rounded-xl border border-[#355393] bg-[linear-gradient(180deg,#3a5ca4_0%,#2f4f90_100%)] text-[#f2f6ff] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22),0_8px_14px_-8px_rgba(28,56,117,0.55)] hover:bg-[linear-gradient(180deg,#3f63ad_0%,#335699_100%)]"
                disabled={isSubmitting}
                onClick={submitRoute}
              >
                {isSubmitting ? "Evaluating route..." : "Compute Optimal Route"}
              </Button>
              <Button
                variant="outline"
                className="h-10 rounded-xl border-[#ccd8f3] bg-[linear-gradient(180deg,#ffffff_0%,#f1f5ff_100%)] text-[#2b447b] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] hover:bg-[linear-gradient(180deg,#ffffff_0%,#e8f0ff_100%)]"
                disabled={isSimulating}
                onClick={runSimulation}
              >
                {isSimulating ? "Running simulation..." : "Simulate 1000 Transactions"}
              </Button>
              <Button
                variant="outline"
                className="h-10 rounded-xl border-[#ccd8f3] bg-[linear-gradient(180deg,#ffffff_0%,#f1f5ff_100%)] text-[#2b447b] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] hover:bg-[linear-gradient(180deg,#ffffff_0%,#e8f0ff_100%)]"
                disabled={isReplayLoading}
                onClick={() => loadReplayHistory(1)}
              >
                {isReplayLoading ? "Loading replays..." : "Load Replay History"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="rounded-2xl border-[#d7dff3] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9ff_100%)] shadow-[0_18px_42px_-32px_rgba(46,68,125,0.36),inset_0_1px_0_0_rgba(255,255,255,0.9)]">
            <CardHeader className="pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 font-medium text-[#1f2f53]">
                  <Crown className="size-4.5 text-[#b7882f]" />
                  Selected Route
                </CardTitle>
                {result ? (
                  <Badge
                    variant="outline"
                    className="border-[#d0daf2] bg-[linear-gradient(180deg,#ffffff_0%,#f4f7ff_100%)] text-[10px] font-medium uppercase tracking-[0.16em] text-[#3f588d]"
                  >
                    {result.selectedRoute.anomalyFlag ? "High Friction Flag" : "Policy Clean"}
                  </Badge>
                ) : null}
              </div>
              <CardDescription className="font-light text-[#5c6f96]">
                Best route and rationale at this market state.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-4 rounded-2xl border border-[#d7e0f4] bg-[linear-gradient(180deg,#ffffff_0%,#f2f6ff_100%)] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.94)]">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#60739f]">Recommended Rail</p>
                      <h3 className="mt-1 text-2xl font-normal text-[#1d2b49]">{result.selectedRoute.railName}</h3>
                      <p className="mt-1 text-xs font-light text-[#62739b]">Code: {result.selectedRoute.railCode}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#60739f]">Composite Score</p>
                      <p className="font-mono text-2xl font-medium text-[#1f2f53]">
                        {result.selectedRoute.score.toFixed(4)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <StatTile
                      icon={BriefcaseBusiness}
                      label="Total Cost"
                      value={result.selectedRoute.totalCostSource.toFixed(2)}
                    />
                    <StatTile
                      icon={ArrowRightLeft}
                      label="Converted Amount"
                      value={result.selectedRoute.convertedAmount.toFixed(2)}
                    />
                    <StatTile
                      icon={Clock3}
                      label="Settlement"
                      value={`${result.selectedRoute.estimatedSettlementTimeHours}h`}
                    />
                    <StatTile
                      icon={ShieldCheck}
                      label="Reliability"
                      value={`${(result.selectedRoute.reliabilityScore * 100).toFixed(1)}%`}
                    />
                  </div>

                  <div className="rounded-2xl border border-[#d7e0f4] bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_100%)] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)]">
                    <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[#60739f]">Explanation</p>
                    <p className="text-sm font-light leading-relaxed text-[#2d3d62]">{result.explanation}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#d6e0f4] bg-[linear-gradient(180deg,#fbfdff_0%,#f4f8ff_100%)] p-8 text-center text-sm font-light text-[#60739f]">
                  Submit a transaction profile to generate route intelligence.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#d7dff3] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9ff_100%)] shadow-[0_18px_42px_-32px_rgba(46,68,125,0.36),inset_0_1px_0_0_rgba(255,255,255,0.9)]">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 font-medium text-[#1f2f53]">
                  <TrendingUp className="size-4.5 text-[#48639e]" />
                  Replay Decisions
                </CardTitle>
                {isReplaySectionOpen ? (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="rounded-lg text-[#466199] hover:bg-[#eaf0ff]"
                    onClick={() => setIsReplaySectionOpen(false)}
                    aria-label="Close replay section"
                  >
                    <X className="size-4" />
                  </Button>
                ) : null}
              </div>
              <CardDescription className="font-light text-[#5c6f96]">
                Re-run historical simulations with their original parameters.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isReplaySectionOpen && replayHistory.length ? (
                <div className="space-y-2">
                  {replayHistory.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 rounded-xl border border-[#d6e0f4] bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_100%)] p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)] md:flex-row md:items-center md:justify-between"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-normal text-[#1f2f53]">
                          {item.amount.toFixed(2)} {item.sourceCurrency} to {item.destinationCurrency}
                        </p>
                        <p className="text-xs font-light text-[#62739b]">
                          {item.priority.toUpperCase()} | {item.selectedRailCode} | {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg border-[#cfdaf3] bg-[linear-gradient(180deg,#ffffff_0%,#eef3ff_100%)] text-[#2f4b82]"
                        onClick={() => replayDecision(item.id)}
                        disabled={isSubmitting}
                      >
                        Replay
                      </Button>
                    </div>
                  ))}

                  {replayPageInfo ? (
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-[#d6e0f4] bg-[linear-gradient(180deg,#ffffff_0%,#f0f5ff_100%)] px-3 py-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)]">
                      <p className="text-xs font-light text-[#51658f]">
                        Page {replayPageInfo.page} of {replayPageInfo.totalPages} ({replayPageInfo.totalItems} items)
                      </p>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon-sm"
                          variant="outline"
                          className="rounded-lg border-[#cfdaf3] bg-[linear-gradient(180deg,#ffffff_0%,#eef3ff_100%)] text-[#2f4b82]"
                          disabled={isReplayLoading || replayPageInfo.page <= 1}
                          onClick={() => loadReplayHistory(replayPageInfo.page - 1)}
                          aria-label="Previous replay page"
                        >
                          <ChevronLeft className="size-4" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="outline"
                          className="rounded-lg border-[#cfdaf3] bg-[linear-gradient(180deg,#ffffff_0%,#eef3ff_100%)] text-[#2f4b82]"
                          disabled={isReplayLoading || replayPageInfo.page >= replayPageInfo.totalPages}
                          onClick={() => loadReplayHistory(replayPageInfo.page + 1)}
                          aria-label="Next replay page"
                        >
                          <ChevronRight className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#d6e0f4] bg-[linear-gradient(180deg,#fbfdff_0%,#f4f8ff_100%)] p-8 text-center text-sm font-light text-[#60739f]">
                  {isReplaySectionOpen
                    ? "No replay records found for this page."
                    : "Load replay history to view and rerun previous decisions."}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#d7dff3] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9ff_100%)] shadow-[0_18px_42px_-32px_rgba(46,68,125,0.36),inset_0_1px_0_0_rgba(255,255,255,0.9)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-medium text-[#1f2f53]">
                <Gauge className="size-4.5 text-[#48639e]" />
                Rail Comparison
              </CardTitle>
              <CardDescription className="font-light text-[#5c6f96]">
                Cost, speed, reliability, and score across rails.
              </CardDescription>
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
                    <TableRow
                      key={quote.railCode}
                      className={quote.railCode === result.selectedRoute.railCode ? "bg-[#eff4ff]" : ""}
                    >
                      <TableCell className="font-medium text-[#203056]">
                        {quote.railName}
                        {quote.disqualifiedReason ? (
                          <p className="mt-0.5 text-xs font-light text-amber-700">{quote.disqualifiedReason}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-light text-[#2b3e66]">{quote.totalCostSource.toFixed(2)}</TableCell>
                      <TableCell className="font-light text-[#2b3e66]">{quote.feePercent.toFixed(2)}%</TableCell>
                      <TableCell className="font-light text-[#2b3e66]">{quote.estimatedSettlementTimeHours.toFixed(1)}</TableCell>
                      <TableCell className="font-light text-[#2b3e66]">{quote.reliabilityScore.toFixed(3)}</TableCell>
                      <TableCell className="font-mono font-medium text-[#243d70]">{quote.score.toFixed(4)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#d7dff3] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9ff_100%)] shadow-[0_18px_42px_-32px_rgba(46,68,125,0.36),inset_0_1px_0_0_rgba(255,255,255,0.9)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-medium text-[#1f2f53]">
                <TrendingUp className="size-4.5 text-[#48639e]" />
                1000x Simulation
              </CardTitle>
              <CardDescription className="font-light text-[#5c6f96]">
                Rail dominance and average selected cost in batch routing.
              </CardDescription>
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
                        <TableCell className="font-medium text-[#203056]">{row.railCode}</TableCell>
                        <TableCell className="font-light text-[#2b3e66]">{row.count}</TableCell>
                        <TableCell className="font-light text-[#2b3e66]">
                          {((row.count / simulation.totalRuns) * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell className="font-light text-[#2b3e66]">{row.averageCost.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#d6e0f4] bg-[linear-gradient(180deg,#fbfdff_0%,#f4f8ff_100%)] p-8 text-center text-sm font-light text-[#60739f]">
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
  return <Label className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#61749d]">{label}</Label>;
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#cad9f8] bg-[linear-gradient(180deg,#ffffffcc_0%,#edf3ffcc_100%)] px-4 py-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92),0_8px_16px_-10px_rgba(87,116,183,0.28)] backdrop-blur-sm">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#60739f]">{label}</p>
      <p className="mt-1 font-mono text-2xl font-medium text-[#223760]">{value}</p>
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
    <div className="rounded-2xl border border-[#d8e1f4] bg-[linear-gradient(180deg,#ffffff_0%,#f3f7ff_100%)] p-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.92)]">
      <p className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#60739f]">
        <Icon className="size-3.5 text-[#4c669f]" />
        {label}
      </p>
      <p className="mt-1.5 font-mono text-lg font-medium text-[#203056]">{value}</p>
    </div>
  );
}
