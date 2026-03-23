import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Dashboard from '../pages/Dashboard';
import MailboxUsage from '../pages/exchange/MailboxUsage';
import InactiveMailboxes from '../pages/exchange/InactiveMailboxes';
import MailTraffic from '../pages/exchange/MailTraffic';
import ForwardingRules from '../pages/exchange/ForwardingRules';
import SignInLogs from '../pages/entra/SignInLogs';
import RiskyUsers from '../pages/entra/RiskyUsers';
import MFAStatus from '../pages/entra/MFAStatus';
import ConditionalAccess from '../pages/entra/ConditionalAccess';
import Alerts from '../pages/Alerts';
import Settings from '../pages/Settings';
import Tenants from '../pages/Tenants';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const { token } = useAuth();
  const { loadTenants } = useTenant();

  useEffect(() => {
    if (token) loadTenants();
  }, [token, loadTenants]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/exchange/mailbox-usage" element={<MailboxUsage />} />
            <Route path="/exchange/inactive-mailboxes" element={<InactiveMailboxes />} />
            <Route path="/exchange/mail-traffic" element={<MailTraffic />} />
            <Route path="/exchange/forwarding-rules" element={<ForwardingRules />} />
            <Route path="/entra/signin-logs" element={<SignInLogs />} />
            <Route path="/entra/risky-users" element={<RiskyUsers />} />
            <Route path="/entra/mfa-status" element={<MFAStatus />} />
            <Route path="/entra/conditional-access" element={<ConditionalAccess />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/tenants" element={<Tenants />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
