import { Link, useLocation } from 'react-router-dom';
import { Layers, Settings, Zap } from 'lucide-react';

export default function TopBar() {
  const { pathname } = useLocation();
  const isSettings = pathname === '/settings';

  return (
    <header className="h-11 flex items-center justify-between px-4 border-b border-border/30 bg-surface-1/50 backdrop-blur-sm flex-shrink-0">
      <Link to="/" className="flex items-center gap-2 group">
        <div className="w-6 h-6 rounded-md bg-violet/20 flex items-center justify-center group-hover:bg-violet/30 transition-colors">
          <Zap className="w-3.5 h-3.5 text-violet" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Archon</span>
        <span className="text-[10px] font-mono text-muted-foreground/30 ml-1">v2.0</span>
      </Link>

      <nav className="flex items-center gap-1">
        <Link
          to="/"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all duration-200 ${
            !isSettings
              ? 'text-foreground/80 bg-surface-2/40'
              : 'text-muted-foreground/50 hover:text-muted-foreground/70 hover:bg-surface-2/20'
          }`}
        >
          <Layers className="w-3 h-3" />
          Projects
        </Link>
        <Link
          to="/settings"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all duration-200 ${
            isSettings
              ? 'text-foreground/80 bg-surface-2/40'
              : 'text-muted-foreground/50 hover:text-muted-foreground/70 hover:bg-surface-2/20'
          }`}
        >
          <Settings className="w-3 h-3" />
          Settings
        </Link>
      </nav>
    </header>
  );
}
