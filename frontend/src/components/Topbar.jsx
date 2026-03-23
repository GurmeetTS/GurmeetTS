import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Moon, Sun, Search, LogOut, User } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '../context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { Input } from './ui/input';

const routeLabels = {
  '/dashboard': { title: 'Dashboard', sub: 'Executive Overview' },
  '/exchange/mailbox-usage': { title: 'Mailbox Usage', sub: 'Exchange Online' },
  '/exchange/inactive-mailboxes': { title: 'Inactive Mailboxes', sub: 'Exchange Online' },
  '/exchange/mail-traffic': { title: 'Mail Traffic', sub: 'Exchange Online' },
  '/exchange/forwarding-rules': { title: 'Forwarding Rules', sub: 'Exchange Online' },
  '/entra/signin-logs': { title: 'Sign-in Logs', sub: 'Entra ID' },
  '/entra/risky-users': { title: 'Risky Users', sub: 'Entra ID' },
  '/entra/mfa-status': { title: 'MFA Status', sub: 'Entra ID' },
  '/entra/conditional-access': { title: 'Conditional Access', sub: 'Entra ID' },
  '/alerts': { title: 'Alerts', sub: 'Security Monitoring' },
  '/settings': { title: 'Settings', sub: 'Account & Preferences' },
};

export default function Topbar() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const page = routeLabels[location.pathname] || { title: 'M365 Analytics', sub: '' };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header
      data-testid="topbar"
      className="h-14 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10 flex items-center px-6 gap-4 shrink-0"
    >
      {/* Page title */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <h1 className="text-sm font-semibold text-foreground truncate">{page.title}</h1>
          {page.sub && (
            <span className="text-xs text-muted-foreground hidden sm:block">/ {page.sub}</span>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative hidden md:block w-48">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search..."
          className="h-8 pl-8 text-xs bg-muted border-0 focus-visible:ring-1"
          data-testid="topbar-search"
        />
      </div>

      {/* Theme Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        data-testid="theme-toggle"
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>

      {/* Notifications */}
      <Button variant="ghost" size="icon" className="h-8 w-8 relative" data-testid="notifications-btn">
        <Bell className="h-4 w-4" />
        <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
      </Button>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 px-2 gap-2" data-testid="user-menu-trigger">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs text-primary-foreground font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <span className="text-xs font-medium hidden sm:block">{user?.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5">
            <p className="text-xs font-medium">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            <p className="text-xs text-primary mt-0.5">{user?.role}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/settings')} data-testid="menu-settings">
            <User className="mr-2 h-3.5 w-3.5" />
            <span className="text-xs">Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} data-testid="menu-logout" className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-3.5 w-3.5" />
            <span className="text-xs">Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
