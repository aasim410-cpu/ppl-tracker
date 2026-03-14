import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dumbbell, LogIn, UserPlus } from "lucide-react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const err = isLogin
      ? await login(username, password)
      : await signup(username, password);

    setLoading(false);
    if (err) setError(err);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground mx-auto">
            <Dumbbell className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">PPL Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Log your push, pull, and leg workouts
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <button
                type="button"
                className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${
                  isLogin ? "bg-background shadow-sm" : "text-muted-foreground"
                }`}
                onClick={() => { setIsLogin(true); setError(null); }}
                data-testid="tab-login"
              >
                Log in
              </button>
              <button
                type="button"
                className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${
                  !isLogin ? "bg-background shadow-sm" : "text-muted-foreground"
                }`}
                onClick={() => { setIsLogin(false); setError(null); }}
                data-testid="tab-signup"
              >
                Sign up
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="username" className="text-xs text-muted-foreground">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoComplete="username"
                  className="mt-1"
                  data-testid="input-username"
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-xs text-muted-foreground">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  className="mt-1"
                  data-testid="input-password"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-destructive font-medium" data-testid="auth-error">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={loading || !username || !password}
              data-testid="auth-submit"
            >
              {loading ? (
                "Please wait..."
              ) : isLogin ? (
                <>
                  <LogIn className="w-4 h-4" /> Log in
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Create account
                </>
              )}
            </Button>
          </form>
        </Card>

        <p className="text-center text-[10px] text-muted-foreground">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            className="text-primary underline-offset-2 hover:underline"
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
          >
            {isLogin ? "Sign up" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
}
