import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Store } from 'lucide-react';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { signInWithUsername, signUpWithUsername } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: string })?.from || '/';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const cleanUsername = loginUsername.trim();
    if (!cleanUsername || !loginPassword) {
      const msg = 'Please fill in all fields';
      setAuthError(msg);
      toast.error(msg);
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      const msg = 'Username can only contain letters, numbers, underscores, dots, or hyphens';
      setAuthError(msg);
      toast.error(msg);
      return;
    }

    setIsLoading(true);
    const { error } = await signInWithUsername(cleanUsername, loginPassword);
    setIsLoading(false);

    if (error) {
      const msg = error.message || 'Login failed';
      setAuthError(msg);
      toast.error(msg);
    } else {
      toast.success('Login successful!');
      navigate(from, { replace: true });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const cleanUsername = signupUsername.trim();
    if (!cleanUsername || !signupPassword || !confirmPassword) {
      const msg = 'Please fill in all fields';
      setAuthError(msg);
      toast.error(msg);
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      const msg = 'Username can only contain letters, numbers, underscores, dots, or hyphens';
      setAuthError(msg);
      toast.error(msg);
      return;
    }

    if (signupPassword !== confirmPassword) {
      const msg = 'Passwords do not match';
      setAuthError(msg);
      toast.error(msg);
      return;
    }

    if (signupPassword.length < 6) {
      const msg = 'Password must be at least 6 characters';
      setAuthError(msg);
      toast.error(msg);
      return;
    }

    setIsLoading(true);
    const { error } = await signUpWithUsername(cleanUsername, signupPassword);
    setIsLoading(false);

    if (error) {
      const msg = error.message || 'Signup failed';
      setAuthError(msg);
      toast.error(msg);
    } else {
      toast.success('Account created successfully! You are now logged in.');
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md shadow-xl border-2 border-primary/40 dark:border-primary/40 rounded-2xl bg-card">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-full shadow-sm">
              <Store className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">S.S.T POS</CardTitle>
          <CardDescription>Sanyali School of Technology — Sign in to access the system</CardDescription>
        </CardHeader>
        <CardContent>
          {authError && (
            <div className="mb-4 rounded-lg border-2 border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {authError}
            </div>
          )}
          <Tabs defaultValue="login" className="w-full" onValueChange={() => setAuthError(null)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">Username</Label>
                  <Input
                    id="login-username"
                    type="text"
                    placeholder="Enter your username (e.g. admin)"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Login
                </Button>
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground text-center">
                    Default credentials: <span className="font-semibold text-foreground">admin</span> / <span className="font-mono font-semibold text-foreground">admin123</span> or <span className="font-semibold text-foreground">sarah_pos</span> / <span className="font-mono font-semibold text-foreground">staff123</span>
                  </p>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-username">Username</Label>
                  <Input
                    id="signup-username"
                    type="text"
                    placeholder="Choose a username"
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Letters, numbers, underscores, dots, or hyphens allowed
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password (min 6 chars)"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign Up
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  First user will be assigned as admin
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
