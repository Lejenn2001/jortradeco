import { useState, useMemo } from "react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { useMarketData } from "@/hooks/useMarketData";
import { Search, Filter, TrendingUp, TrendingDown, AlertTriangle, Zap, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";

type SortField = "score" | "time" | "ticker";
type FilterType = "all" | "call" | "put";

const DashboardSignals = () => {
  const { signals, loading } = useMarketData();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortField>("score");
  const [sortDesc, setSortDesc] = useState(true);

  const filtered = useMemo(() => {
    let list = [...signals];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.ticker.toLowerCase().includes(q) || s.action.toLowerCase().includes(q));
    }

    if (filterType !== "all") {
      list = list.filter((s) =>
        filterType === "call"
          ? s.action.toLowerCase().includes("call")
          : s.action.toLowerCase().includes("put")
      );
    }

    list.sort((a, b) => {
      if (sortBy === "score") return sortDesc ? b.score - a.score : a.score - b.score;
      if (sortBy === "ticker") return sortDesc ? b.ticker.localeCompare(a.ticker) : a.ticker.localeCompare(b.ticker);
      return 0;
    });

    return list;
  }, [signals, search, filterType, sortBy, sortDesc]);

  const toggleSort = (field: SortField) => {
    if (sortBy === field) setSortDesc(!sortDesc);
    else {
      setSortBy(field);
      setSortDesc(true);
    }
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
          {/* Header area */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold text-foreground">Live Signals</h1>
              <p className="text-sm text-muted-foreground">High conviction setups detected from options flow</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-muted-foreground">{signals.length} active signals</span>
            </div>
          </div>

          {/* Filters */}
          <div className="glass-panel rounded-xl p-4 flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ticker or action..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-none shadow-none focus-visible:ring-0 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {(["all", "call", "put"] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    filterType === f
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {f === "all" ? "All" : f === "call" ? "Calls" : "Puts"}
                </button>
              ))}
            </div>
          </div>

          {/* Signals Table */}
          <div className="glass-panel rounded-xl border-glow-blue overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 p-3 border-b border-border/40 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              <div className="col-span-1">Urgency</div>
              <div className="col-span-2 cursor-pointer flex items-center gap-1" onClick={() => toggleSort("ticker")}>
                Ticker <ArrowUpDown className="h-3 w-3" />
              </div>
              <div className="col-span-3">Action</div>
              <div className="col-span-2 cursor-pointer flex items-center gap-1" onClick={() => toggleSort("score")}>
                Score <ArrowUpDown className="h-3 w-3" />
              </div>
              <div className="col-span-2">Premium</div>
              <div className="col-span-2">Key Level</div>
            </div>

            {/* Rows */}
            {loading && (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading signals...</div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">No signals match your filters</div>
            )}
            {filtered.map((signal, i) => {
              const isCall = signal.action.toLowerCase().includes("call");
              const urgency = signal.score >= 9.5 ? "NOW" : signal.score >= 9 ? "HIGH" : "WATCH";
              const urgencyColor = urgency === "NOW" ? "text-red-400 bg-red-500/10" : urgency === "HIGH" ? "text-amber-400 bg-amber-500/10" : "text-emerald-400 bg-emerald-500/10";

              return (
                <div
                  key={`${signal.ticker}-${i}`}
                  className={`grid grid-cols-12 gap-2 p-3 items-center border-b border-border/20 hover:bg-muted/30 transition-colors ${
                    urgency === "NOW" ? "bg-red-500/5" : ""
                  }`}
                >
                  <div className="col-span-1">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${urgencyColor}`}>
                      {urgency === "NOW" && <Zap className="h-2.5 w-2.5 inline mr-0.5" />}
                      {urgency}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold text-sm text-foreground">{signal.ticker}</span>
                  </div>
                  <div className="col-span-3 flex items-center gap-1.5">
                    {isCall ? (
                      <TrendingUp className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-400" />
                    )}
                    <span className="text-xs text-muted-foreground">{signal.action}</span>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${signal.score >= 9.5 ? "bg-red-400" : signal.score >= 9 ? "bg-amber-400" : "bg-emerald-400"}`}
                          style={{ width: `${signal.score * 10}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-foreground">{signal.score}</span>
                    </div>
                  </div>
                  <div className="col-span-2 text-xs text-muted-foreground">{signal.premium || "—"}</div>
                  <div className="col-span-2 text-xs text-muted-foreground">{signal.keyLevel || "—"}</div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardSignals;
