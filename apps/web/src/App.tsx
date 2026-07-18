import { BrowserRouter, Link, NavLink, Route, Routes } from "react-router-dom";
import styles from "./App.module.css";
import { BrowsePage } from "./pages/BrowsePage";
import { ChatPage } from "./pages/ChatPage";
import { ProblemDetailPage } from "./pages/ProblemDetailPage";
import { SearchPage } from "./pages/SearchPage";

function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoMath}>∑</span> MathPilot
        </Link>
        <nav className={styles.nav}>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
          >
            Search
          </NavLink>
          <NavLink
            to="/browse"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
          >
            Browse
          </NavLink>
          <NavLink
            to="/chat"
            className={({ isActive }) =>
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
          >
            Chat
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Header />
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/problems/:id" element={<ProblemDetailPage />} />
          <Route path="/chat" element={<ChatPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
