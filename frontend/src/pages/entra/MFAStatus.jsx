import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Download, Search, Smartphone, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Skeleton } from '../../components/ui/skeleton';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const stateConfig = {
  Enforced: 'bg-green-500/10 text-green-500 border-green-500/20',
  Enabled: 'bg-primary/10 text-primary border-primary/20',
  Disabled: 'bg-destructive/10 text-destructive border-destructive/20',
};

const COLORS = ['#10B981', '#3B82F6', '#EF4444'];

function exportCSV(data, filename) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(','), ...data.map(r => keys.map(k => `"${String(r[k] ?? '')}"`).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `${filename}.csv`;
  a.click();
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-md p-2 shadow-sm text-xs">
      <p style={{ color: payload[0].payload.fill }}>{payload[0].name}: <strong>{payload[0].value} users</strong></p>
    </div>
  );
};

export default function MFAStatus() {
  const { authHeaders } = useAuth();
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('all');

  useEffect(() => {
    axios.get(`${API}/entra/mfa-status`, { headers: authHeaders })
      .then(r => setRaw(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authHeaders]);

  const filtered = useMemo(() => {
    if (!raw?.data) return [];
    return raw.data.filter(r => {
      const q = search.toLowerCase();
      const matchSearch = r.display_name.toLowerCase().includes(q) || r.department.toLowerCase().includes(q);
      const matchState = stateFilter === 'all' || r.mfa_state === stateFilter;
      return matchSearch && matchState;
    });
  }, [raw, search, stateFilter]);

  if (loading) return <Skeleton className="h-96 rounded-lg" />;

  const { summary } = raw;
  const pieData = [
    { name: 'Enforced', value: summary.enforced, fill: COLORS[0] },
    { name: 'Enabled', value: summary.enabled, fill: COLORS[1] },
    { name: 'Disabled', value: summary.disabled, fill: COLORS[2] },
  ];

  return (
    <div className="space-y-4" data-testid="mfa-status-page">
      {summary.disabled_percent > 20 && (
        <div className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg" data-testid="mfa-warning">
          <ShieldAlert className="h-4 w-4 text-yellow-600 shrink-0" />
          <p className="text-xs text-yellow-700 dark:text-yellow-500">
            <strong>{summary.disabled}</strong> users ({summary.disabled_percent}%) have MFA disabled. Consider enforcing MFA for all users.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="grid grid-cols-2 gap-3 lg:col-span-2">
          {[
            { label: 'Total Users', value: summary.total_users.toLocaleString(), icon: Smartphone, color: 'text-primary bg-primary/10' },
            { label: 'Enforced', value: `${summary.enforced} (${summary.enforced_percent}%)`, icon: ShieldCheck, color: 'text-green-500 bg-green-500/10' },
            { label: 'Enabled Only', value: `${summary.enabled} (${summary.enabled_percent}%)`, icon: Smartphone, color: 'text-primary bg-primary/10' },
            { label: 'Disabled', value: `${summary.disabled} (${summary.disabled_percent}%)`, icon: ShieldAlert, color: 'text-destructive bg-destructive/10' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${color}`}><Icon className="h-4 w-4" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-base font-bold text-foreground">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">MFA Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={0}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3 flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-sm font-semibold">User MFA Details</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-8 text-xs w-44" data-testid="mfa-search" />
            </div>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="h-8 text-xs w-36" data-testid="mfa-state-filter">
                <SelectValue placeholder="MFA State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                <SelectItem value="Enforced">Enforced</SelectItem>
                <SelectItem value="Enabled">Enabled</SelectItem>
                <SelectItem value="Disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => exportCSV(filtered, 'mfa-status')} data-testid="export-btn">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs" data-testid="mfa-table">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['User', 'Department', 'MFA State', 'Methods', 'Strong Auth', 'Last MFA Use'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-foreground">{row.display_name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.department}</td>
                    <td className="px-4 py-2.5"><Badge className={`text-xs ${stateConfig[row.mfa_state]}`}>{row.mfa_state}</Badge></td>
                    <td className="px-4 py-2.5 text-foreground">{row.mfa_methods.join(', ') || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium ${row.strong_auth ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {row.strong_auth ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.last_mfa_use || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-border">
            <p className="text-xs text-muted-foreground">{filtered.length} users shown</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
