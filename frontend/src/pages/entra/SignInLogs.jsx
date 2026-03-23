import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Download, Search, LogIn, CheckCircle2, XCircle, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Skeleton } from '../../components/ui/skeleton';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusConfig = {
  Success: 'bg-green-500/10 text-green-500 border-green-500/20',
  Failed: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  Blocked: 'bg-destructive/10 text-destructive border-destructive/20',
};

const riskConfig = {
  None: 'bg-muted text-muted-foreground border-border',
  Low: 'bg-muted text-muted-foreground border-border',
  Medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  High: 'bg-destructive/10 text-destructive border-destructive/20',
};

function exportCSV(data, filename) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(','), ...data.map(r => keys.map(k => `"${r[k] ?? ''}"`).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `${filename}.csv`;
  a.click();
}

export default function SignInLogs() {
  const { authHeaders } = useAuth();
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    axios.get(`${API}/entra/signin-logs`, { headers: authHeaders })
      .then(r => setRaw(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authHeaders]);

  const filtered = useMemo(() => {
    if (!raw?.data) return [];
    return raw.data.filter(r => {
      const q = search.toLowerCase();
      const matchSearch = r.display_name.toLowerCase().includes(q) || r.location.toLowerCase().includes(q) || r.app.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [raw, search, statusFilter]);

  if (loading) return <Skeleton className="h-96 rounded-lg" />;

  const { summary } = raw;

  return (
    <div className="space-y-4" data-testid="signin-logs-page">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Sign-ins', value: summary.total_signins.toLocaleString(), icon: LogIn, color: 'text-primary bg-primary/10' },
          { label: 'Successful', value: summary.successful.toLocaleString(), icon: CheckCircle2, color: 'text-green-500 bg-green-500/10' },
          { label: 'Failed', value: summary.failed.toLocaleString(), icon: XCircle, color: 'text-yellow-600 bg-yellow-500/10' },
          { label: 'Blocked', value: summary.blocked.toLocaleString(), icon: ShieldAlert, color: 'text-destructive bg-destructive/10' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${color}`}><Icon className="h-4 w-4" /></div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-bold text-foreground">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3 flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-sm font-semibold">Recent Sign-in Activity</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search users, location..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-8 text-xs w-48" data-testid="signin-search" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-32" data-testid="status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Success">Success</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
                <SelectItem value="Blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => exportCSV(filtered, 'signin-logs')} data-testid="export-btn">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs" data-testid="signin-table">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['User', 'IP Address', 'Location', 'Device/App', 'Application', 'Status', 'Risk', 'Time'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-foreground">{row.display_name}</td>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">{row.ip_address}</td>
                    <td className="px-4 py-2.5 text-foreground">{row.location}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.device}</td>
                    <td className="px-4 py-2.5 text-foreground">{row.app}</td>
                    <td className="px-4 py-2.5"><Badge className={`text-xs ${statusConfig[row.status]}`}>{row.status}</Badge></td>
                    <td className="px-4 py-2.5"><Badge className={`text-xs ${riskConfig[row.risk_level]}`}>{row.risk_level}</Badge></td>
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{row.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-border">
            <p className="text-xs text-muted-foreground">{filtered.length} sign-in events shown · {summary.suspicious_locations} suspicious locations detected</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
