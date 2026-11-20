import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background bg-[radial-gradient(ellipse_at_top_left,rgba(14,165,233,0.12),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.09),transparent_45%)] text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      <Navbar />
      <main className="flex-1 min-w-0 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
