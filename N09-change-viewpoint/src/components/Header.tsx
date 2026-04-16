import { Sun, Moon } from 'lucide-react';

interface HeaderProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export default function Header({ theme, toggleTheme }: HeaderProps) {
  return (
    <header className="h-16 shrink-0 flex justify-between items-center px-4 border-b border-black/10 dark:border-white/10 transition-colors duration-300">
      <div className="flex items-center gap-3">
        <span className="text-[1.575rem] font-display font-bold tracking-[0.0125em] uppercase leading-tight pt-1">C</span>
        <span className="text-[1.575rem] font-display font-bold tracking-[0.0125em] uppercase leading-tight pt-1">CHANGE VIEWPOINT V2</span>
      </div>
      <div className="flex items-center gap-6 font-mono text-xs leading-normal tracking-wide uppercase">
        <button onClick={toggleTheme} className="hover:opacity-60 transition-opacity">
          {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  );
}
