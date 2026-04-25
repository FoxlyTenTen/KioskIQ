"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Package,
  MapPin,
  Settings,
  Search,
  Bell,
  Menu,
  X,
  RefreshCw,
  LogOut,
  Calculator,
  Moon,
  Sun,
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Input } from './ui/input';
import dynamic from 'next/dynamic';
import { FinancialDataProvider, useFinancialData } from './FinancialDataContext';

const TravelChat = dynamic(() => import('@/components/travel-chat'), { ssr: false });

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard Overview', path: '/' },
  { icon: Calculator, label: 'Planning Assistant', path: '/planning', highlight: true },
  { icon: Users, label: 'Labour Scheduling', path: '/labour' },
  { icon: TrendingUp, label: 'Demand Forecasting', path: '/demand' },
  { icon: Package, label: 'Inventory & Waste', path: '/inventory' },
  { icon: MapPin, label: 'Location & Strategy', path: '/location' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

function LayoutInner({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    setSyncDone(false);
    try {
      await fetch('/api/rag/embed', { method: 'POST' });
      setSyncDone(true);
      setTimeout(() => setSyncDone(false), 3000);
    } finally {
      setSyncing(false);
    }
  };
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const {
    financialPlanData,
    summaryPlanData,
    feasibilityData,
    investmentData,
    setProductData,
    setFinancialPlanData,
    setMasterPlanData,
    setSummaryPlanData,
    setFeasibilityData,
    setInvestmentData,
  } = useFinancialData();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } transition-all duration-300 border-r border-border bg-card flex flex-col overflow-hidden shrink-0`}
      >
        <div className="p-6 border-b border-border">
          <h1 className="font-semibold text-foreground text-lg truncate">KioskIQ</h1>
          <p className="text-xs text-muted-foreground mt-1 truncate">AI-Powered Planning</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : item.highlight
                    ? 'bg-accent/50 text-accent-foreground hover:bg-accent'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Admin User</p>
              <p className="text-xs text-muted-foreground truncate">admin@kioskiq.com</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Center: header + main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {!sidebarOpen ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
            </Button>
            <div className="relative w-64 md:w-96 hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search insights..."
                className="pl-9 h-9"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              title="Sync latest data to vector DB for RAG"
              className="text-xs hidden sm:flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : syncDone ? '✓ Synced' : 'Sync to AI'}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Toggle theme"
            >
              {mounted && (theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />)}
              {!mounted && <Sun className="h-5 w-5" />}
            </Button>

            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-destructive rounded-full" />
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Right: Persistent Chat Panel */}
      <div className="w-[400px] shrink-0 border-l border-border bg-card flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30 shrink-0">
          <h2 className="text-base font-semibold">Planning Assistant</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="text-primary font-medium">Orchestrator</span> + <span className="text-primary/70 font-medium">Specialists</span>
          </p>
        </div>
        <div className="flex-1 overflow-hidden">
          <TravelChat
            financialPlanData={financialPlanData}
            summaryPlanData={summaryPlanData}
            feasibilityData={feasibilityData}
            investmentData={investmentData}
            onProductUpdate={setProductData}
            onFinancialPlanUpdate={setFinancialPlanData}
            onMasterPlanUpdate={setMasterPlanData}
            onSummaryPlanUpdate={setSummaryPlanData}
            onFeasibilityUpdate={setFeasibilityData}
            onInvestmentUpdate={setInvestmentData}
          />
        </div>
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <FinancialDataProvider>
      <LayoutInner>{children}</LayoutInner>
    </FinancialDataProvider>
  );
}
