"use client";

import { ComponentType, useMemo, useState } from "react";
import {
  Activity,
  Clock3,
  Coins,
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
  amount: 1000,
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

  const selectedRailCode = result?.selectedRoute.railCode;

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
        headers: {
          "Content-Type": "application/json",
        },
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
        const details = "details" in data ? data.details : undefined;
        throw new Error(details ?? "Failed to evaluate route.");
      }

      setResult(data as RouteDecisionResult);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Failed to process request";
      setError(message);
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          count: 1000,
          sourceCurrency: formState.sourceCurrency,
          destinationCurrency: formState.destinationCurrency,
          priority: formState.priority,
        }),
      });

      const data = (await response.json()) as SimulationSummary | { details?: string };
      if (!response.ok) {
        const details = "details" in data ? data.details : undefined;
        throw new Error(details ?? "Failed to run simulation.");
      }

      setSimulation(data as SimulationSummary);
    } catch (simulationError) {
      const message = simulationError instanceof Error ? simulationError.message : "Simulation request failed";
      setError(message);
    } finally {
      setIsSimulating(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-8">
      <section className="rounded-2xl border border-blue-900/20 bg-[linear-gradient(135deg,#0f172a_0%,#1e1b4b_55%,#0f172a_100%)] p-8 text-slate-100 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-400 border border-blue-500/20">
              <Sparkles className="size-3" /> Smart FX Routing Engine
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Cross-Border Payout Optimizer
            </h1>
            <p className="max-w-2xl text-slate-400 md:text-lg">
              Intelligent multi-rail routing using real-time liquidity, volatility metrics, and reliability scoring.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 backdrop-blur-sm min-w-[140px]">
              <p className="text-xs font-medium text-slate-500 uppercase">Market Volatility</p>
              <p className="text-2xl font-bold text-blue-400">
                {result ? `${(result.metadata.volatilityFactor * 100).toFixed(2)}%` : "0.00%"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 backdrop-blur-sm min-w-[140px]">
              <p className="text-xs font-medium text-slate-500 uppercase">Active Rails</p>
              <p className="text-2xl font-bold text-emerald-400">3</p>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-4 duration-300">
          <AlertTitle>Routing Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm transition-all hover:shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Radar className="size-5 text-blue-600" /> Configuration
              </CardTitle>
              <CardDescription>Configure payout parameters and constraints.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-xs font-bold uppercase text-slate-500">Amount</Label>
                <div className="relative">
                  <Coins className="absolute left-3 top-2.5 size-4 text-slate-400" />
                  <Input
                    id="amount"
                    type="number"
                    min={1}
                    className="pl-9 font-semibold"
                    value={formState.amount}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        amount: Number(event.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sourceCurrency" className="text-xs font-bold uppercase text-slate-500">Source</Label>
                  <Input
                    id="sourceCurrency"
                    className="font-mono font-bold"
                    value={formState.sourceCurrency}
                    maxLength={3}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        sourceCurrency: event.target.value.toUpperCase(),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destinationCurrency" className="text-xs font-bold uppercase text-slate-500">Destination</Label>
                  <Input
                    id="destinationCurrency"
                    className="font-mono font-bold"
                    value={formState.destinationCurrency}
                    maxLength={3}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        destinationCurrency: event.target.value.toUpperCase(),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Optimization Priority</Label>
                <Select
                  value={formState.priority}
                  onValueChange={(value) =>
                    setFormState((prev) => ({
                      ...prev,
                      priority: value as Priority,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cheap">
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-emerald-500" />
                        <span>Lowest Cost (Cheap)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="fast">
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-blue-500" />
                        <span>Fastest Settlement (Fast)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="balanced">
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-amber-500" />
                        <span>Mixed Metrics (Balanced)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxTime" className="text-xs font-bold uppercase text-slate-500">Max Time (h)</Label>
                  <Input
                    id="maxTime"
                    type="number"
                    min={1}
                    value={formState.maxTime ?? ""}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        maxTime: Number(event.target.value) || undefined,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxFeePercent" className="text-xs font-bold uppercase text-slate-500">Max Fee %</Label>
                  <Input
                    id="maxFeePercent"
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
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center mb-1">
                  <Label htmlFor="whatIfShock" className="text-xs font-bold uppercase text-slate-500">What-if FX Shock (%)</Label>
                  <span className={`text-xs font-bold ${formState.whatIfShockPercent && formState.whatIfShockPercent > 0 ? 'text-red-500' : formState.whatIfShockPercent && formState.whatIfShockPercent < 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {formState.whatIfShockPercent && formState.whatIfShockPercent > 0 ? '+' : ''}{formState.whatIfShockPercent}%
                  </span>
                </div>
                <Input
                  id="whatIfShock"
                  type="range"
                  step={0.5}
                  min={-10}
                  max={10}
                  value={formState.whatIfShockPercent ?? 0}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      whatIfShockPercent: Number(event.target.value) || 0,
                    }))
                  }
                  className="h-2 bg-slate-100 accent-blue-600"
                />
                <p className="text-[10px] text-slate-400 text-center italic">Simulate market rate fluctuations</p>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 shadow-md font-bold" disabled={isSubmitting} onClick={submitRoute}>
                  {isSubmitting ? "Processing..." : "Calculate Best Route"}
                </Button>
                <Button variant="outline" className="w-full font-medium" disabled={isSimulating} onClick={runSimulation}>
                  {isSimulating ? "Running Simulation..." : "Run 1000x Stress Test"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className={`border-slate-200 shadow-lg transition-all duration-500 ${result ? 'ring-2 ring-blue-500/20' : ''}`}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <TrendingUp className="size-5 text-emerald-600" /> Best Available Route
                </CardTitle>
                {result && (
                  <Badge variant={result.selectedRoute.anomalyFlag ? "destructive" : "outline"} className="px-3 py-1">
                    {result.selectedRoute.anomalyFlag ? "High Cost Anomaly" : "Standard Route"}
                  </Badge>
                )}
              </div>
              <CardDescription>Optimized rail selection based on current market state.</CardDescription>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="flex size-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg">
                        <Activity className="size-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500">Selected Provider</p>
                        <h3 className="text-xl font-bold text-slate-900">{result.selectedRoute.railName}</h3>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-500">Route Efficiency</p>
                      <p className="text-xl font-mono font-bold text-blue-600">
                        {((1 - result.selectedRoute.score) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <Metric title="Total Friction" value={result.selectedRoute.totalCostSource.toFixed(2)} icon={Coins} subtitle={formState.sourceCurrency} />
                    <Metric title="Value Received" value={result.selectedRoute.convertedAmount.toLocaleString()} icon={TrendingUp} subtitle={formState.destinationCurrency} color="text-emerald-600" />
                    <Metric title="Fee Burden" value={`${result.selectedRoute.feePercent.toFixed(2)}%`} icon={Activity} />
                    <Metric title="Settlement" value={`${result.selectedRoute.estimatedSettlementTimeHours.toFixed(1)}h`} icon={Clock3} />
                    <Metric title="Reliability" value={result.selectedRoute.reliabilityScore.toFixed(3)} icon={ShieldCheck} />
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                    <div className="flex gap-3">
                      <div className="mt-0.5">
                        <div className="flex size-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">i</div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Strategic Reasoning</p>
                        <p className="text-sm leading-relaxed text-blue-900 font-medium">
                          {result.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 rounded-full bg-slate-100 p-4">
                    <Radar className="size-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900">Awaiting Input</h3>
                  <p className="max-w-[280px] text-sm text-slate-500">
                    Configure your payout and click &quot;Calculate&quot; to view the optimal routing analysis.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 pb-4 border-b border-slate-100">
              <CardTitle className="text-lg">Multi-Rail Comparison</CardTitle>
              <CardDescription>Deep-dive into how different rails performed for this request.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/30">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="w-[180px] text-xs font-bold uppercase text-slate-500">Rail Network</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-slate-500">Total Friction</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-slate-500">Efficiency</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-slate-500">Speed</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-slate-500 text-right">Reliability</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result ? result.comparisons.map((quote) => (
                    <TableRow key={quote.railCode} className={`transition-colors ${quote.railCode === selectedRailCode ? "bg-blue-50/60 hover:bg-blue-50" : "hover:bg-slate-50"}`}>
                      <TableCell className="font-semibold text-slate-900">
                        <div className="flex flex-col">
                          <span>{quote.railName}</span>
                          {quote.disqualifiedReason && (
                            <span className="text-[10px] text-red-500 font-normal leading-tight mt-0.5">{quote.disqualifiedReason}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{quote.totalCostSource.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                            <div 
                              className={`h-full ${quote.railCode === selectedRailCode ? 'bg-blue-600' : 'bg-slate-400'}`} 
                              style={{ width: `${Math.max(5, (1 - quote.score) * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-600">{(quote.score).toFixed(3)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{quote.estimatedSettlementTimeHours}h</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={`font-mono text-[10px] ${quote.reliabilityScore > 0.9 ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : ''}`}>
                          {quote.reliabilityScore.toFixed(3)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-slate-400 italic">
                        Perform a calculation to see comparison data.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {simulation && (
            <Card className="border-slate-200 shadow-sm animate-in slide-in-from-bottom-4 duration-700">
              <CardHeader className="bg-emerald-50/30 border-b border-emerald-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="size-4 text-emerald-600" /> Stress Test Analytics (1000x)
                  </CardTitle>
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                    Priority: {formState.priority}
                  </Badge>
                </div>
                <CardDescription>Statistical dominance and average cost performance.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="text-xs font-bold uppercase text-slate-500">Rail</TableHead>
                      <TableHead className="text-xs font-bold uppercase text-slate-500">Wins</TableHead>
                      <TableHead className="text-xs font-bold uppercase text-slate-500">Dominance</TableHead>
                      <TableHead className="text-xs font-bold uppercase text-slate-500 text-right">Avg Friction</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {simulationRows.map((row) => (
                      <TableRow key={row.railCode}>
                        <TableCell className="font-bold text-slate-700">{row.railCode}</TableCell>
                        <TableCell className="text-sm">{row.count}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="w-8 text-xs font-medium">{(row.count / simulation.totalRuns * 100).toFixed(0)}%</span>
                            <div className="h-1.5 flex-1 max-w-[100px] overflow-hidden rounded-full bg-slate-100">
                              <div 
                                className="h-full bg-emerald-500" 
                                style={{ width: `${(row.count / simulation.totalRuns * 100)}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">{row.averageCost.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </main>
  );
}

function Metric({
  title,
  value,
  icon: Icon,
  subtitle,
  color = "text-slate-900"
}: {
  title: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  subtitle?: string;
  color?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-blue-100 hover:shadow-md">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {title}
        </p>
        <Icon className="size-3.5 text-blue-500/50" />
      </div>
      <div className="flex items-baseline gap-1">
        <p className={`text-xl font-bold tracking-tight ${color}`}>{value}</p>
        {subtitle && <span className="text-[10px] font-bold text-slate-400 uppercase">{subtitle}</span>}
      </div>
    </div>
  );
}

