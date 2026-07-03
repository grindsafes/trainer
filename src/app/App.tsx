import { useState } from "react";
import { Outlet, NavLink } from "react-router";
import { Helmet } from "react-helmet-async";
import { useTheme } from "next-themes";
import { Download, Upload, Sun, Moon, Menu } from "lucide-react";
import logoSvg from "./imgs/logo.svg";
import { useTrainerContext } from "./TrainerContext";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle } from "./components/ui/drawer";

export default function App() {
  const { theme, setTheme } = useTheme();
  const { ranges, drills, importRef, exportData, importData } = useTrainerContext();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
    <Helmet>
      <title>GrindSafe</title>
      <meta name="description" content="Enhance your poker skills with a customizable trainer that allows users to create action ranges and practice with tailored training sessions." />
      <meta property="og:title" content="GrindSafe" />
      <meta property="og:description" content="Enhance your poker skills with a customizable trainer that allows users to create action ranges and practice with tailored training sessions." />
      <meta property="og:url" content="https://trainer.grindsafe.app" />
    </Helmet>
    <div className="w-full h-dvh flex flex-col overflow-hidden overscroll-y-contain bg-background text-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="flex-shrink-0 border-b border-border px-3 md:px-6 py-3 flex items-center gap-2 md:gap-6">
        <div className="flex items-center gap-2.5">
          <img src={theme === "dark" ? "/grindsafe-logo-dark.svg" : (logoSvg as string)} alt="GrindSafe" className="h-[22px]" />
        </div>

        <nav className="hidden lg:flex gap-1">
          {(["community", "charts", "trainer"] as const).map((t) => (
            <NavLink
              key={t}
              to={`/${t}`}
              className={({ isActive }) =>
                `px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`
              }
            >
              {t === "community" ? "Community" : t === "charts" ? "Charts" : "Trainer"}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden md:inline text-xs text-muted-foreground mr-2">{ranges.length} range{ranges.length !== 1 ? "s" : ""} · {drills.length} drill{drills.length !== 1 ? "s" : ""}</span>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
          </button>

          <div className="hidden lg:flex items-center gap-2">
            <button onClick={exportData} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors">
              <Download size={13} /> Export
            </button>
            <button onClick={() => importRef.current?.click()} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors">
              <Upload size={13} /> Import
            </button>
          </div>

          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={importData} />

          <a href="https://github.com/grindsafes/preflop-trainer" target="_blank" rel="noopener noreferrer" className="hidden lg:inline-flex"><img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/grindsafes/preflop-trainer" className="h-5" /></a>
          <a href="https://discord.com/invite/2WtGERkjY7" target="_blank" rel="noopener noreferrer" className="hidden lg:flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-[#5865F2] text-white hover:bg-[#4752C4] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width={13} height={13} viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
            Discord
          </a>

          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerTrigger asChild>
              <button className="lg:hidden flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors">
                <Menu size={15} />
              </button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>GrindSafe</DrawerTitle>
              </DrawerHeader>
              <div className="px-4 pb-6 flex flex-col gap-3">
                <nav className="flex flex-col gap-1">
                  {(["community", "charts", "trainer"] as const).map((t) => (
                    <NavLink
                      key={t}
                      to={`/${t}`}
                      end
                      onClick={() => setDrawerOpen(false)}
                      className={({ isActive }) =>
                        `px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`
                      }
                    >
                      {t === "community" ? "Community" : t === "charts" ? "Charts" : "Trainer"}
                    </NavLink>
                  ))}
                </nav>
                <div className="h-px bg-border my-1" />
                <div className="flex items-center gap-3 px-1">
                  <span className="text-xs text-muted-foreground">{ranges.length} range{ranges.length !== 1 ? "s" : ""} · {drills.length} drill{drills.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex gap-2 px-1">
                  <button onClick={() => { exportData(); setDrawerOpen(false); }} className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors">
                    <Download size={13} /> Export
                  </button>
                  <button onClick={() => { importRef.current?.click(); setDrawerOpen(false); }} className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors">
                    <Upload size={13} /> Import
                  </button>
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
    </>
  );
}
