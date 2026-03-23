import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Mail, Shield, Bell, Settings, ChevronDown, ChevronRight,
  Inbox, UserX, TrendingUp, ArrowRightLeft, LogIn, AlertTriangle,
  Smartphone, Lock, ChevronLeft, ShieldCheck
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

const navConfig = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
  },
  {
    label: 'Exchange Online',
    icon: Mail,
    children: [
      { label: 'Mailbox Usage', path: '/exchange/mailbox-usage', icon: Inbox },
      { label: 'Inactive Mailboxes', path: '/exchange/inactive-mailboxes', icon: UserX },
      { label: 'Mail Traffic', path: '/exchange/mail-traffic', icon: TrendingUp },
      { label: 'Forwarding Rules', path: '/exchange/forwarding-rules', icon: ArrowRightLeft },
    ],
  },
  {
    label: 'Entra ID',
    icon: Shield,
    children: [
      { label: 'Sign-in Logs', path: '/entra/signin-logs', icon: LogIn },
      { label: 'Risky Users', path: '/entra/risky-users', icon: AlertTriangle },
      { label: 'MFA Status', path: '/entra/mfa-status', icon: Smartphone },
      { label: 'Conditional Access', path: '/entra/conditional-access', icon: Lock },
    ],
  },
  { label: 'Alerts', icon: Bell, path: '/alerts', badge: 7 },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

function NavSection({ item, collapsed }) {
  const location = useLocation();
  const isChildActive = item.children?.some(c => location.pathname === c.path);
  const [open, setOpen] = useState(isChildActive);

  if (!item.children) {
    return (
      <NavLink
        to={item.path}
        data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150',
            'hover:bg-accent hover:text-accent-foreground',
            isActive
              ? 'bg-primary/10 text-primary font-semibold'
              : 'text-muted-foreground'
          )
        }
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full font-bold">
                {item.badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        data-testid={`nav-section-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150',
          'hover:bg-accent hover:text-accent-foreground',
          isChildActive ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            {open ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </>
        )}
      </button>
      {!collapsed && open && (
        <div className="ml-4 mt-0.5 border-l border-border pl-3 space-y-0.5">
          {item.children.map((child) => (
            <NavLink
              key={child.path}
              to={child.path}
              data-testid={`nav-${child.label.toLowerCase().replace(/\s+/g, '-')}`}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors duration-150',
                  'hover:bg-accent hover:text-accent-foreground',
                  isActive
                    ? 'text-primary font-semibold bg-primary/10'
                    : 'text-muted-foreground'
                )
              }
            >
              <child.icon className="h-3.5 w-3.5 shrink-0" />
              <span>{child.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuth();

  return (
    <aside
      data-testid="sidebar"
      className={cn(
        'bg-card border-r border-border flex flex-col h-full sidebar-transition shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Brand */}
      <div className={cn('flex items-center h-16 border-b border-border px-3 gap-3', collapsed && 'justify-center')}>
        <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-md shrink-0">
          <ShieldCheck className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-foreground leading-tight">M365 Analytics</p>
            <p className="text-xs text-muted-foreground">{user?.tenant || 'Contoso Corp'}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        {navConfig.map((item) => (
          <NavSection key={item.label} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-2">
        {!collapsed && user && (
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs text-primary-foreground font-bold shrink-0">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={onToggle}
          data-testid="sidebar-toggle"
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-150"
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform duration-200', collapsed && 'rotate-180')} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
