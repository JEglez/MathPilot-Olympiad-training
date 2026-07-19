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

function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <Link
        to="/"
        className="flex items-center gap-2.5 px-5 py-5 text-white hover:no-underline"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal text-white font-bold text-lg shrink-0">
          <Sigma size={20} />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-base text-white">MathPilot</span>
          <span className="text-[10px] text-sidebar-muted uppercase tracking-widest">Olympiad</span>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex flex-col gap-1 px-3 flex-1 pt-2">
        {NAV_ITEMS.map(({ to, end, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-active-bg text-white border-l-2 border-sidebar-active"
                  : "text-sidebar-foreground hover:bg-white/10 hover:text-white"
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-[11px] text-sidebar-muted">6,445+ problems</p>
        <p className="text-[11px] text-sidebar-muted">8 topics · IMO · USAMO</p>
      </div>
    </aside>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen">
        <Sidebar />
        {/* Offset content by sidebar width */}
        <div className="flex-1 ml-56 min-w-0">
          <main className="p-6 max-w-5xl">
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
