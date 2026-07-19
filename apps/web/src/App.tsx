import { BookOpen, MessageSquare, Search, Sigma } from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { ForwardRefExoticComponent, RefAttributes } from "react";
import { BrowserRouter, Link, NavLink, Route, Routes } from "react-router-dom";
import { cn } from "./lib/utils";
import { BrowsePage } from "./pages/BrowsePage";
import { ChatPage } from "./pages/ChatPage";
import { ProblemDetailPage } from "./pages/ProblemDetailPage";
import { SearchPage } from "./pages/SearchPage";

type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;

const NAV_ITEMS: Array<{ to: string; end?: boolean; icon: LucideIcon; label: string }> = [
  { to: "/", end: true, icon: Search, label: "Search" },
  { to: "/browse", icon: BookOpen, label: "Browse" },
  { to: "/chat", icon: MessageSquare, label: "Chat" },
];

const DOMAINS = [
  { label: "Algebra",       dot: "#F59E0B" },
  { label: "Geometry",      dot: "#34D399" },
  { label: "Number Theory", dot: "#60A5FA" },
  { label: "Combinatorics", dot: "#C084FC" },
] as const;

function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <Link
        to="/"
        className="flex items-center gap-2.5 px-5 py-5 hover:no-underline"
        style={{ textDecoration: "none" }}
      >
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white font-bold text-base shrink-0"
          style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)" }}
        >
          <Sigma size={17} />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-sm text-white">MathPilot</span>
          <span className="text-[9px] uppercase tracking-widest" style={{ color: "#F59E0B" }}>Olympiad</span>
        </div>
      </Link>

      {/* Training nav */}
      <nav className="flex flex-col gap-0.5 px-3 pt-1">
        <p className="text-[9px] font-bold uppercase tracking-[0.13em] px-2 mb-1" style={{ color: "rgba(255,255,255,0.28)" }}>
          Training
        </p>
        {NAV_ITEMS.map(({ to, end, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors",
                isActive
                  ? "text-amber-300 font-semibold border-l-2 border-amber-400 bg-sidebar-active-bg"
                  : "text-sidebar-foreground hover:bg-white/8 hover:text-white"
              )
            }
            style={({ isActive }) => isActive ? { borderLeftColor: "#F59E0B" } : {}}
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Domains */}
      <nav className="flex flex-col gap-0.5 px-3 pt-5">
        <p className="text-[9px] font-bold uppercase tracking-[0.13em] px-2 mb-1" style={{ color: "rgba(255,255,255,0.28)" }}>
          Domains
        </p>
        {DOMAINS.map(({ label, dot }) => (
          <div
            key={label}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-sidebar-foreground hover:bg-white/8 hover:text-white cursor-default transition-colors"
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
            {label}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="mt-auto px-5 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>6,445+ problems</p>
        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>IMO · USAMO · AIME</p>
      </div>
    </aside>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 ml-56 min-w-0 flex flex-col">
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<SearchPage />} />
              <Route path="/browse" element={<BrowsePage />} />
              <Route path="/problems/:id" element={<ProblemDetailPage />} />
              <Route path="/chat" element={<ChatPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
