import { useTheme } from 'next-themes';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, Monitor, LogOut, User, Building2, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  return (
    <div className="space-y-5 max-w-2xl" data-testid="settings-page">
      {/* Profile */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Profile Information</CardTitle>
          </div>
          <CardDescription className="text-xs">Your admin account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-lg text-primary-foreground font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div>
              <p className="font-semibold text-foreground">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge className="text-xs mt-1 bg-primary/10 text-primary border-primary/20">{user?.role}</Badge>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Tenant</p>
              <p className="font-medium text-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                {user?.tenant || 'Contoso Corporation'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Access Level</p>
              <p className="font-medium text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
                Full Admin Access
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Appearance</CardTitle>
          </div>
          <CardDescription className="text-xs">Choose your preferred theme</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'light', label: 'Light', icon: Sun },
              { value: 'dark', label: 'Dark', icon: Moon },
              { value: 'system', label: 'System', icon: Monitor },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                data-testid={`theme-${value}`}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border text-xs font-medium transition-colors ${
                  theme === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Notification Preferences</CardTitle>
          <CardDescription className="text-xs">Configure alert notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'Critical Security Alerts', sub: 'Immediate notification for high-severity events', defaultChecked: true },
            { label: 'Daily Summary Report', sub: 'Receive a daily digest of key metrics', defaultChecked: true },
            { label: 'MFA Compliance Alerts', sub: 'Alert when users disable MFA', defaultChecked: false },
            { label: 'Suspicious Login Alerts', sub: 'Notify on risky sign-in events', defaultChecked: true },
          ].map(({ label, sub, defaultChecked }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <Label className="text-sm font-medium text-foreground">{label}</Label>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
              <Switch defaultChecked={defaultChecked} data-testid={`switch-${label.toLowerCase().replace(/\s+/g, '-')}`} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Platform Info */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Platform Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {[
            { label: 'Platform', value: 'M365 Analytics v1.0' },
            { label: 'Data Source', value: 'Microsoft Graph API (Simulated)' },
            { label: 'Modules Active', value: 'Dashboard, Exchange Online, Entra ID' },
            { label: 'Last Sync', value: 'Feb 11, 2025 09:30 UTC' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-1.5 border-b border-border last:border-0">
              <span className="text-muted-foreground">{label}</span>
              <span className="text-foreground font-medium">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-destructive">Account Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Sign Out</p>
              <p className="text-xs text-muted-foreground">End your current session</p>
            </div>
            <Button variant="destructive" size="sm" onClick={handleLogout} className="gap-1.5" data-testid="settings-logout-btn">
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
