import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider, useAuth } from "./lib/auth";
import { Toaster } from "@/components/ui/toaster";
import { Dumbbell, ArrowUp, ArrowDown, Footprints, BarChart3, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import PushDay from "./pages/push-day";
import PullDay from "./pages/pull-day";
import LegsDay from "./pages/legs-day";
import Aggregate from "./pages/aggregate";
import AuthPage from "./pages/auth-page";
import NotFound from "./pages/not-found";
import { PerplexityAttribution } from "@/components/PerplexityAttribution";

function Navigation() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Push", icon: ArrowUp, color: "text-violet-500" },
    { href: "/pull", label: "Pull", icon: ArrowDown, color: "text-emerald-500" },
    { href: "/legs", label: "Legs", icon: Footprints, color: "text-pink-500" },
    { href: "/stats", label: "Stats", icon: BarChart3, color: "text-amber-500" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80" data-testid="bottom-nav">
      <div className="flex items-center justify-around max-w-lg mx-auto h-16">
        {navItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <button
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? `${item.color} bg-muted font-semibold`
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function AppHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center justify-between max-w-4xl mx-auto px-4 h-14">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
            <Dumbbell className="w-4 h-4" />
          </div>
          <h1 className="text-base font-semibold tracking-tight">PPL Tracker</h1>
        </div>
        {user && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="w-3 h-3" />
              {user.username}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={logout}
              data-testid="logout-btn"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}

function AuthenticatedApp() {
  return (
    <div className="min-h-screen pb-20">
      <AppHeader />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Switch>
          <Route path="/" component={PushDay} />
          <Route path="/pull" component={PullDay} />
          <Route path="/legs" component={LegsDay} />
          <Route path="/stats" component={Aggregate} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <div className="max-w-4xl mx-auto px-4 pb-20">
        <PerplexityAttribution />
      </div>
      <Navigation />
      <Toaster />
    </div>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Dumbbell className="w-5 h-5 animate-pulse" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router hook={useHashLocation}>
          <AppContent />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
