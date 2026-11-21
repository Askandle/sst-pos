import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function AppLayout() {
  return (
    <div className="relative min-h-screen flex flex-col lg:flex-row bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary overflow-x-hidden">
      {/* Subtle drifting ambient backdrop for frosted glass refraction */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="glass-orb-a absolute -top-24 -left-20 h-[420px] w-[420px] rounded-full bg-sky-400/18 dark:bg-sky-500/14 blur-3xl" />
        <div className="glass-orb-b absolute -bottom-24 -right-20 h-[440px] w-[440px] rounded-full bg-emerald-400/16 dark:bg-emerald-500/12 blur-3xl" />
        <div className="glass-orb-a absolute top-1/3 left-1/2 h-[320px] w-[320px] rounded-full bg-indigo-400/10 dark:bg-indigo-500/10 blur-3xl" />
      </div>

      <Navbar />
      <main className="relative z-10 flex-1 min-w-0 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
