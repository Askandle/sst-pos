import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Monitor,
  ShoppingCart,
  Package,
  Wrench,
  Receipt,
  TrendingDown,
  Shield,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [cartCount, setCartCount] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sst_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const updateCart = () => {
      try {
        const stored = JSON.parse(sessionStorage.getItem('cart') || '[]');
        const count = stored.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);
        setCartCount(count);
      } catch {
        setCartCount(0);
      }
    };

    updateCart();
    window.addEventListener('cart-updated', updateCart);
    window.addEventListener('storage', updateCart);
    return () => {
      window.removeEventListener('cart-updated', updateCart);
      window.removeEventListener('storage', updateCart);
    };
  }, [location.pathname]);

  const toggleDarkMode = () => {
    const root = document.documentElement;
    if (root.classList.contains('dark')) {
      root.classList.remove('dark');
      setIsDark(false);
      localStorage.setItem('theme', 'light');
    } else {
      root.classList.add('dark');
      setIsDark(true);
      localStorage.setItem('theme', 'dark');
    }
  };

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sst_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
  }, []);

  const handleSignOut = async () => {
    setMobileMenuOpen(false);
    await signOut();
    navigate('/login');
  };

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: Monitor },
    { to: '/services', label: 'Services', icon: Wrench },
    { to: '/products', label: 'Products', icon: Package },
    {
      to: '/checkout',
      label: 'Checkout',
      icon: ShoppingCart,
      badge: cartCount > 0 ? cartCount : null,
    },
    { to: '/transactions', label: 'Transactions', icon: Receipt },
    { to: '/expenses', label: 'Expenses', icon: TrendingDown },
    { to: '/admin', label: 'Admin', icon: Shield },
  ];

  const renderSidebarContent = (isCompact: boolean, isMobile = false) => (
    <div className="relative flex flex-col h-full rounded-2xl border border-slate-200/80 dark:border-white/15 ring-1 ring-inset ring-white/70 dark:ring-white/10 bg-white/88 dark:bg-slate-900/82 backdrop-blur-md shadow-[0_8px_28px_rgba(15,23,42,0.08)] dark:shadow-[0_8px_28px_rgba(0,0,0,0.45)] overflow-hidden">
      {/* Subtle glass top specular sheen */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white dark:via-white/30 to-transparent"
      />

      {/* Brand Header */}
      <div
        className={`flex items-center ${
          isCompact ? 'justify-center px-2' : 'justify-between px-4'
        } py-4 border-b border-slate-200/80 dark:border-white/10`}
      >
        <Link
          to="/"
          onClick={() => isMobile && setMobileMenuOpen(false)}
          className="flex items-center gap-2.5 min-w-0"
          title="S.S.T POS"
        >
          <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs border border-white/25 shrink-0">
            <Monitor className="h-5 w-5" />
          </div>
          {!isCompact && (
            <div className="min-w-0">
              <span className="block text-base font-bold tracking-tight text-foreground leading-tight truncate">
                S.S.T POS
              </span>
              <span className="block text-[11px] text-muted-foreground truncate">
                Sanyali School of Tech
              </span>
            </div>
          )}
        </Link>

        {isMobile ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close sidebar"
            className="text-foreground/70 hover:text-foreground hover:bg-slate-200/50 dark:hover:bg-white/10 rounded-xl shrink-0"
          >
            <X className="h-5 w-5" />
          </Button>
        ) : (
          !isCompact && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapsed}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
              className="h-8 w-8 text-foreground/70 hover:text-foreground hover:bg-slate-200/50 dark:hover:bg-white/10 rounded-lg shrink-0"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )
        )}
      </div>

      {/* Expand trigger when collapsed */}
      {isCompact && !isMobile && (
        <div className="flex justify-center pt-2 px-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            title="Expand sidebar"
            aria-label="Expand sidebar"
            className="h-8 w-full text-foreground/70 hover:text-foreground hover:bg-slate-200/50 dark:hover:bg-white/10 rounded-lg"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1.5">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              title={isCompact ? link.label : undefined}
              onClick={() => isMobile && setMobileMenuOpen(false)}
              className={`group relative flex items-center ${
                isCompact ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2.5'
              } rounded-xl text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-primary/15 dark:bg-sky-400/15 text-primary dark:text-sky-300 border border-primary/40 dark:border-sky-400/35 shadow-xs font-semibold'
                  : 'border border-transparent text-slate-700 dark:text-slate-200 hover:text-foreground hover:bg-slate-200/55 dark:hover:bg-white/10 hover:border-slate-300/60 dark:hover:border-white/15'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? 'text-primary dark:text-sky-300' : 'text-slate-600 dark:text-slate-300'
                  }`}
                />
                {!isCompact && <span className="truncate">{link.label}</span>}
              </div>

              {link.badge !== null && link.badge !== undefined && (
                <span
                  className={`${
                    isCompact ? 'absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]' : 'h-5 min-w-5 px-1.5 text-xs'
                  } inline-flex items-center justify-center font-bold leading-none text-white bg-primary rounded-full tabular-nums shadow-xs`}
                >
                  {link.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom User, Theme & Logout Glass Controls */}
      <div className="p-3 border-t border-slate-200/80 dark:border-white/10 space-y-2.5 bg-slate-50/60 dark:bg-black/25">
        {user ? (
          <div
            className={`flex items-center ${
              isCompact ? 'justify-center p-2' : 'justify-between px-3 py-2'
            } rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-white/5`}
            title={isCompact ? `${user.username} (${profile?.role || 'Staff'})` : undefined}
          >
            {isCompact ? (
              <span className="h-7 w-7 rounded-full bg-primary/20 text-primary dark:text-sky-300 flex items-center justify-center text-xs font-bold uppercase">
                {user.username.slice(0, 2)}
              </span>
            ) : (
              <>
                <div className="min-w-0 pr-2">
                  <span className="block text-sm font-semibold text-foreground leading-tight truncate">
                    {user.username}
                  </span>
                  <span className="block text-[11px] text-muted-foreground capitalize">
                    {profile?.role || 'Staff'}
                  </span>
                </div>
                {profile?.role === 'admin' ? (
                  <Badge variant="default" className="bg-primary text-[11px] shrink-0">
                    Admin
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[11px] shrink-0">
                    Staff
                  </Badge>
                )}
              </>
            )}
          </div>
        ) : (
          <Button
            size="sm"
            onClick={() => navigate('/login')}
            className="w-full rounded-xl cursor-pointer"
          >
            Sign In
          </Button>
        )}

        <div className={`flex ${isCompact ? 'flex-col' : 'flex-row'} gap-2`}>
          <Button
            variant="ghost"
            size={isCompact ? 'icon' : 'sm'}
            onClick={toggleDarkMode}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className={`${
              isCompact ? 'w-full h-9' : 'flex-1 justify-start gap-2'
            } rounded-xl border border-slate-200/80 dark:border-white/15 bg-white/75 dark:bg-white/5 hover:bg-white dark:hover:bg-white/15 text-foreground cursor-pointer`}
          >
            {isDark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
            {!isCompact && <span className="text-xs">{isDark ? 'Light' : 'Dark'}</span>}
          </Button>

          {user && (
            <Button
              variant="ghost"
              size={isCompact ? 'icon' : 'sm'}
              onClick={handleSignOut}
              title="Sign Out"
              className={`${
                isCompact ? 'w-full h-9' : 'flex-1 justify-start gap-2'
              } rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 cursor-pointer`}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!isCompact && <span className="text-xs font-semibold">Logout</span>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Floating Glass Sidebar */}
      <aside
        className={`hidden lg:flex flex-col sticky top-0 h-screen p-3 pr-0 shrink-0 z-40 transition-[width] duration-200 ${
          collapsed ? 'w-[84px]' : 'w-[272px]'
        }`}
      >
        {renderSidebarContent(collapsed, false)}
      </aside>

      {/* Mobile Glass Header Bar */}
      <header className="lg:hidden sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md shadow-xs">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation sidebar"
              className="rounded-xl hover:bg-slate-200/50 dark:hover:bg-white/10"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                <Monitor className="h-4 w-4" />
              </div>
              <span className="text-base font-bold tracking-tight text-foreground">
                S.S.T POS
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {cartCount > 0 && (
              <Link
                to="/checkout"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/35 text-primary dark:text-sky-300 text-xs font-semibold"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                <span className="tabular-nums">{cartCount}</span>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="rounded-xl text-foreground/70 hover:text-foreground"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Glass Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/45 transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] h-full p-3">
            {renderSidebarContent(false, true)}
          </aside>
        </div>
      )}
    </>
  );
}
