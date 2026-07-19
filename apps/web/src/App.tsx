import { Menu, MessageSquare, Search, Sigma, X, BookMarked } from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { ForwardRefExoticComponent, RefAttributes } from "react";
import { useState } from "react";
import { BrowserRouter, Link, NavLink, Route, Routes } from "react-router-dom";
import { useProblemSet } from "./context/ProblemSetContext";
import { ChatPage } from "./pages/ChatPage";
import { MySetPage } from "./pages/MySetPage";
import { ProblemDetailPage } from "./pages/ProblemDetailPage";
import { SearchPage } from "./pages/SearchPage";

type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;

const NAV_ITEMS: Array<{ to: string; end?: boolean; icon: LucideIcon; label: string }> = [
  { to: "/", end: true, icon: Search, label: "Search" },
  { to: "/chat", icon: MessageSquare, label: "Chat" },
];

const DOMAINS = [
  { label: "Algebra",       dot: "#F59E0B" },
  { label: "Geometry",      dot: "#34D399" },
  { label: "Number Theory", dot: "#60A5FA" },
  { label: "Combinatorics", dot: "#C084FC" },
] as const;

const SIDEBAR_BG = "#0F172A";
const SIDEBAR_FG = "rgba(255,255,255,0.6)";
const SIDEBAR_ACTIVE_COLOR = "#F59E0B";
const SIDEBAR_ACTIVE_BG = "rgba(245,158,11,0.15)";
const SIDEBAR_SECTION_LABEL = "rgba(255,255,255,0.28)";

interface SidebarProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { problems } = useProblemSet();
  const setCount = problems.length;
  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex w-56 flex-col",
          "transition-transform duration-200",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0",
        ].join(" ")}
        style={{ background: SIDEBAR_BG, color: SIDEBAR_FG }}
      >
        {/* Logo + mobile close button */}
        <div className="flex items-center justify-between px-5 py-5">
          <Link
            to="/"
            className="flex items-center gap-2.5"
            style={{ textDecoration: "none", color: "inherit" }}
            onClick={onClose}
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-base shrink-0"
              style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#fff" }}
            >
              <Sigma size={17} />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-sm" style={{ color: "#fff" }}>MathPilot</span>
              <span className="text-[9px] uppercase tracking-widest" style={{ color: SIDEBAR_ACTIVE_COLOR }}>Olympiad</span>
            </div>
          </Link>
          <button
            type="button"
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
            style={{ color: SIDEBAR_FG }}
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        </div>

        {/* Training nav */}
        <nav className="flex flex-col gap-0.5 px-3 pt-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.13em] px-2 mb-1"
            style={{ color: SIDEBAR_SECTION_LABEL }}>
            Training
          </p>
          {NAV_ITEMS.map(({ to, end, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors"
              style={({ isActive }) => isActive
                ? { color: SIDEBAR_ACTIVE_COLOR, background: SIDEBAR_ACTIVE_BG, borderLeft: `2px solid ${SIDEBAR_ACTIVE_COLOR}`, fontWeight: 600 }
                : { color: SIDEBAR_FG }
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Workspace nav */}
        <nav className="flex flex-col gap-0.5 px-3 pt-5">
          <p className="text-[9px] font-bold uppercase tracking-[0.13em] px-2 mb-1"
            style={{ color: SIDEBAR_SECTION_LABEL }}>
            Workspace
          </p>
          <NavLink
            to="/my-set"
            onClick={onClose}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors"
            style={({ isActive }) => isActive
              ? { color: SIDEBAR_ACTIVE_COLOR, background: SIDEBAR_ACTIVE_BG, borderLeft: `2px solid ${SIDEBAR_ACTIVE_COLOR}`, fontWeight: 600 }
              : { color: SIDEBAR_FG }
            }
          >
            <BookMarked size={15} />
            My Set
            {setCount > 0 && (
              <span
                className="ml-auto text-xs font-bold rounded-full px-1.5 leading-5"
                style={{ background: SIDEBAR_ACTIVE_COLOR, color: "#0F172A", minWidth: "1.25rem", textAlign: "center" }}
              >
                {setCount}
              </span>
            )}
          </NavLink>
        </nav>

        {/* Domains */}
        <nav className="flex flex-col gap-0.5 px-3 pt-5">
          <p className="text-[9px] font-bold uppercase tracking-[0.13em] px-2 mb-1"
            style={{ color: SIDEBAR_SECTION_LABEL }}>
            Domains
          </p>
          {DOMAINS.map(({ label, dot }) => (
            <div
              key={label}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium cursor-default"
              style={{ color: SIDEBAR_FG }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
              {label}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="mt-auto px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>6,445+ problems</p>
          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>IMO · USAMO · AIME</p>
        </div>
      </aside>
    </>
  );
}

export function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <BrowserRouter>
      <div className="flex min-h-screen">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 md:ml-56 min-w-0 flex flex-col overflow-x-hidden">
          {/* Mobile top bar — hamburger + logo, hidden on desktop */}
          <div
            className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 md:hidden"
            style={{ background: SIDEBAR_BG, borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          >
            <button
              type="button"
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
              style={{ color: "rgba(255,255,255,0.6)" }}
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <Link
              to="/"
              className="flex items-center gap-2"
              style={{ textDecoration: "none" }}
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-lg font-bold text-sm shrink-0"
                style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", color: "#fff" }}
              >
                <Sigma size={14} />
              </span>
              <span className="font-bold text-sm" style={{ color: "#fff" }}>MathPilot</span>
            </Link>
          </div>

          <main className="flex-1 w-full min-w-0">
            <Routes>
              <Route path="/" element={<SearchPage />} />
              <Route path="/problems/:id" element={<ProblemDetailPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/my-set" element={<MySetPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
