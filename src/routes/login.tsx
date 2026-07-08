import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiService } from "@/lib/api";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — KSC SOFA ND CHAIR HOUSE Admin" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if already authenticated on mount
  useEffect(() => {
    const verifySession = async () => {
      try {
        await apiService.checkSession();
        // If successful, redirect to dashboard immediately
        navigate({ to: "/" });
      } catch (err) {
        // Session is not active, remain on login page
      }
    };
    verifySession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Verifying credentials...");

    try {
      await apiService.login(email.trim(), password);
      toast.success("Welcome back! Redirecting...", { id: toastId });
      // Redirect to dashboard
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message || "Failed to log in. Please check your credentials.", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-emerald-500/10 blur-[80px]" />
      <div className="absolute bottom-1/4 right-1/4 h-[350px] w-[350px] rounded-full bg-teal-500/10 blur-[100px]" />

      <Card className="relative w-full max-w-md border-slate-800/80 bg-slate-900/60 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-slate-700/80">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/20">
            <Lock className="h-6 w-6" />
          </div>
          <CardTitle className="font-serif text-2xl font-bold tracking-tight text-white mt-4">
            KSC SOFA & CHAIR HOUSE
          </CardTitle>
          <CardDescription className="text-slate-400 text-sm">
            Please log in to access the Admin Console
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute top-3 left-3 h-4.5 w-4.5 text-slate-500 transition-colors duration-200" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="pl-10 bg-slate-950/40 border-slate-800 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/80 text-white placeholder-slate-600 transition-all duration-200"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-300 text-xs font-semibold uppercase tracking-wider">
                  Password
                </Label>
              </div>
              <div className="relative">
                <Lock className="absolute top-3 left-3 h-4.5 w-4.5 text-slate-500 transition-colors duration-200" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="pl-10 pr-10 bg-slate-950/40 border-slate-800 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/80 text-white placeholder-slate-600 transition-all duration-200"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 cursor-pointer font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] shadow-lg shadow-emerald-500/10 transition-all duration-150 py-2.5 h-auto rounded-lg border-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Log In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
