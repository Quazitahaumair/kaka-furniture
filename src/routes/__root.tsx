import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Toaster } from "@/components/ui/sonner";
import { apiService } from "@/lib/api";
import { Loader2 } from "lucide-react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <a href="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "KSC SOFA ND CHAIR HOUSE — Business Dashboard" },
      { name: "description", content: "KSC SOFA ND CHAIR HOUSE admin dashboard for orders, inventory, customers and khaata." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700;9..144,900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { AppStateProvider } from "@/context/AppStateContext";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        await apiService.checkSession();
        setIsAuthenticated(true);
      } catch (err) {
        setIsAuthenticated(false);
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuthStatus();
  }, [location.pathname]);

  // Handle redirects
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated && location.pathname !== "/login") {
        navigate({ to: "/login" });
      } else if (isAuthenticated && location.pathname === "/login") {
        navigate({ to: "/" });
      }
    }
  }, [authLoading, isAuthenticated, location.pathname, navigate]);

  // Bypass layout for login screen
  if (location.pathname === "/login") {
    return (
      <QueryClientProvider client={queryClient}>
        <AppStateProvider>
          <Outlet />
          <Toaster richColors position="top-right" />
        </AppStateProvider>
      </QueryClientProvider>
    );
  }

  // Show secure loading screen for private routes while verifying session
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
          <span className="font-serif text-slate-400 text-sm tracking-wide">Securing Console...</span>
        </div>
      </div>
    );
  }

  // If unauthenticated, render nothing while redirect takes place
  if (!isAuthenticated) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppStateProvider>
        <SidebarProvider>
          <div className="flex min-h-screen w-full bg-background">
            <AppSidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
                <SidebarTrigger />
                <span className="font-serif text-sm font-semibold tracking-tight text-muted-foreground">
                  KSC SOFA ND &mdash; Admin Console
                </span>
              </header>
              <main className="flex-1 p-6">
                <Outlet />
              </main>
            </div>
          </div>
          <Toaster richColors position="top-right" />
        </SidebarProvider>
      </AppStateProvider>
    </QueryClientProvider>
  );
}
