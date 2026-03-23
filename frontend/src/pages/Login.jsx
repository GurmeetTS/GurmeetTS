import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        toast.success('Welcome back!');
      } else {
        if (!form.name.trim()) { toast.error('Name is required'); setLoading(false); return; }
        await register(form.name, form.email, form.password);
        toast.success('Account created successfully!');
      }
      navigate('/dashboard');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-10 relative overflow-hidden bg-card border-r border-border"
        style={{
          backgroundImage: `url(https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&q=80)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-primary/80 dark:bg-background/85" />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight">M365 Analytics</p>
              <p className="text-white/70 text-xs">Enterprise Insights Platform</p>
            </div>
          </div>
        </div>
        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-white leading-tight">
              Deep insights for your<br />Microsoft 365 tenant.
            </h2>
            <p className="text-white/70 mt-3 text-sm leading-relaxed">
              Monitor usage, detect threats, manage compliance — all from a single, powerful dashboard.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: '100+', sub: 'Pre-built Reports' },
              { label: '1,248', sub: 'Users Monitored' },
              { label: '99.9%', sub: 'Uptime SLA' },
            ].map(({ label, sub }) => (
              <div key={sub} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                <p className="text-white font-bold text-lg">{label}</p>
                <p className="text-white/60 text-xs">{sub}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <p className="text-white/60 text-xs">Connected to Microsoft Graph API</p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-9 h-9 bg-primary rounded-lg">
              <ShieldCheck className="h-4 w-4 text-primary-foreground" />
            </div>
            <p className="font-bold text-foreground">M365 Analytics</p>
          </div>

          <Card className="border-border shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">
                {mode === 'login' ? 'Sign in to your account' : 'Create an account'}
              </CardTitle>
              <CardDescription className="text-xs">
                {mode === 'login'
                  ? 'Enter your admin credentials to access the dashboard'
                  : 'Set up your M365 Analytics admin account'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-3" data-testid="login-form">
                {mode === 'register' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="John Smith"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className="h-9 text-sm"
                      data-testid="input-name"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@contoso.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="h-9 text-sm"
                    required
                    data-testid="input-email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      className="h-9 text-sm pr-9"
                      required
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-9 text-sm font-medium"
                  disabled={loading}
                  data-testid="login-submit-btn"
                >
                  {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <p className="text-xs text-muted-foreground">
                  {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                  <button
                    onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                    className="text-primary hover:underline font-medium"
                    data-testid="toggle-auth-mode"
                  >
                    {mode === 'login' ? 'Register' : 'Sign in'}
                  </button>
                </p>
              </div>

              {mode === 'login' && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Demo Access</p>
                  <p className="text-xs text-muted-foreground">Register with any email/password to explore the platform with realistic M365 mock data.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
