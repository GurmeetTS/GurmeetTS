import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Users, HardDrive, ShieldCheck, AlertTriangle,
  TrendingUp, ArrowRight, CheckCircle2, XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Skeleton } from '../components/ui/skeleton';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CHART_COLORS = { primary: '#3B82F6', success: '#10B981', warning: '#F59E0B', danger: '#EF4444', muted: '#475569' };

const severityConfig = {
  Critical: 'bg-destructive/10 text-destructive border-destructive/20',
  High: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  Medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  Low: 'bg-muted text-muted-foreground border-border',
};

function KPICard({ title, value, sub, icon: Icon, trend, color, testId }) {
  return (
    <Card data-testid={testId} className="border-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="h-3 w-3 text-green-500" />
            <span className="text-xs text-green-500">{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-md p-2 shadow-sm text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <strong>{p.value?.toLocaleString()}</strong>
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { authHeaders } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API}/dashboard/overview`, { headers: authHeaders })
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authHeaders]);

  if (loading) {
    return (
      <div className="space-y-4" data-testid="dashboard-loading">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  const healthColor = data.tenant_health_score >= 85 ? 'text-green-500' : data.tenant_health_score >= 70 ? 'text-yellow-500' : 'text-destructive';

  return (
    <div className="space-y-5" data-testid="dashboard-page">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Users"
          value={data.total_users.toLocaleString()}
          sub={`${data.active_users_30d.toLocaleString()} active (30d)`}
          icon={Users}
          color="bg-primary/10 text-primary"
          testId="kpi-total-users"
        />
        <KPICard
          title="Licensed Users"
          value={data.licensed_users.toLocaleString()}
          sub={`${Math.round(data.licensed_users / data.total_users * 100)}% of total`}
          icon={CheckCircle2}
          color="bg-green-500/10 text-green-500"
          testId="kpi-licensed-users"
        />
        <KPICard
          title="Storage Used"
          value={`${(data.storage_used_gb / 1024).toFixed(1)} TB`}
          sub={`${data.storage_percent}% of ${(data.storage_total_gb / 1024).toFixed(0)} TB`}
          icon={HardDrive}
          color="bg-yellow-500/10 text-yellow-600"
          testId="kpi-storage"
        />
        <KPICard
          title="Active Alerts"
          value={data.active_alerts}
          sub={`${data.risky_users_count} risky users`}
          icon={AlertTriangle}
          color="bg-destructive/10 text-destructive"
          testId="kpi-alerts"
        />
      </div>

      {/* Health + Secure Score Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card data-testid="tenant-health-card" className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Tenant Health Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="relative flex items-center justify-center w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke={data.tenant_health_score >= 85 ? '#10B981' : '#F59E0B'}
                    strokeWidth="3"
                    strokeDasharray={`${data.tenant_health_score} ${100 - data.tenant_health_score}`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className={`absolute text-xl font-bold ${healthColor}`}>{data.tenant_health_score}</span>
              </div>
              <div className="flex-1 space-y-2">
                {[
                  { label: 'MFA Coverage', value: data.mfa_enabled_percent, ok: data.mfa_enabled_percent > 70 },
                  { label: 'License Util.', value: Math.round(data.licensed_users / data.total_users * 100), ok: true },
                  { label: 'Storage', value: data.storage_percent, ok: data.storage_percent < 80 },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className={item.ok ? 'text-green-500' : 'text-yellow-500'}>{item.value}%</span>
                    </div>
                    <Progress value={item.value} className="h-1.5" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="secure-score-card" className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Microsoft Secure Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-4xl font-bold text-foreground">{data.secure_score}</span>
              <span className="text-muted-foreground text-sm mb-1">/ {data.secure_score_max}</span>
              <Badge className="mb-1 text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Moderate</Badge>
            </div>
            <Progress value={(data.secure_score / data.secure_score_max) * 100} className="h-2 mb-3" />
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Identity', score: 82 },
                { label: 'Device', score: 65 },
                { label: 'Apps', score: 74 },
              ].map(s => (
                <div key={s.label} className="bg-muted rounded p-2">
                  <p className="text-sm font-bold text-foreground">{s.score}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="license-breakdown-card" className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">License Utilization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.license_breakdown.map(l => (
              <div key={l.name}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-muted-foreground truncate">{l.name}</span>
                  <span className="text-foreground font-medium ml-2 shrink-0">{l.assigned}/{l.total}</span>
                </div>
                <Progress value={(l.assigned / l.total) * 100} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card data-testid="storage-trends-chart" className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Storage Trends (GB)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data.storage_trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="used" name="Used GB" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.1} strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card data-testid="user-activity-chart" className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">User Activity (7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.user_activity_trend} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="active" name="Active" fill={CHART_COLORS.primary} radius={[2, 2, 0, 0]} />
                <Bar dataKey="inactive" name="Inactive" fill={CHART_COLORS.muted} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Alerts */}
      <Card data-testid="recent-alerts-card" className="border-border">
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Recent Alerts</CardTitle>
          <button
            onClick={() => navigate('/alerts')}
            className="text-xs text-primary hover:underline flex items-center gap-1"
            data-testid="view-all-alerts-btn"
          >
            View all <ArrowRight className="h-3 w-3" />
          </button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.recent_alerts.map(alert => (
              <div key={alert.id} className="flex items-start justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-start gap-3 min-w-0">
                  <AlertTriangle className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${alert.severity === 'Critical' ? 'text-destructive' : alert.severity === 'High' ? 'text-orange-500' : 'text-yellow-500'}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.source} · {alert.time}</p>
                  </div>
                </div>
                <Badge className={`text-xs shrink-0 ml-2 ${severityConfig[alert.severity]}`}>{alert.severity}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
