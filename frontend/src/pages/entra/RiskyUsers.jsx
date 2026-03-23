import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Download, Search, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Skeleton } from '../../components/ui/skeleton';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const riskConfig = {
  High: 'bg-destructive/10 text-destructive border-destructive/20',
  Medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  Low: 'bg-muted text-muted-foreground border-border',
};

const statusConfig = {
  'At Risk': 'bg-destructive/10 text-destructive border-destructive/20',
  'Confirmed Compromised': 'bg-destructive text-destructive-foreground border-destructive',
  'Remediated': 'bg-green-500/10 text-green-500 border-green-500/20',
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

export default function RiskyUsers() {
  const { authHeaders } = useAuth();
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');

  useEffect(() => {
    axios.get(`${API}/entra/risky-users`, { headers: authHeaders })
      .then(r => setRaw(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authHeaders]);

  const filtered = useMemo(() => {
    if (!raw?.data) return [];
    return raw.data.filter(r => {
      const q = search.toLowerCase();
      const matchSearch = r.display_name.toLowerCase().includes(q) || r.department.toLowerCase().includes(q) || r.risk_detail.toLowerCase().includes(q);
      const matchRisk = riskFilter === 'all' || r.risk_level === riskFilter;
      return matchSearch && matchRisk;
    });
  }, [raw, search, riskFilter]);

  if (loading) return <Skeleton className="h-96 rounded-lg" />;

  const { summary } = raw;

  return (
    <div className="space-y-4" data-testid="risky-users-page">
      {summary.confirmed_compromised > 0 && (
        <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg" data-testid="compromised-alert">
          <ShieldAlert className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-xs text-destructive">
            <strong>{summary.confirmed_compromised} account(s)</strong> confirmed compromised. Immediate action required.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Risky', value: summary.total_risky, icon: AlertTriangle, color: 'text-primary bg-primary/10' },
          { label: 'High Risk', value: summary.high_risk, icon: ShieldAlert, color: 'text-destructive bg-destructive/10' },
          { label: 'Medium Risk', value: summary.medium_risk, icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-500/10' },
          { label: 'Confirmed Compromised', value: summary.confirmed_compromised, icon: ShieldAlert, color: 'text-destructive bg-destructive/10' },
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
          <CardTitle className="text-sm font-semibold">Risky User Details</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-8 text-xs w-44" data-testid="risky-search" />
            </div>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="h-8 text-xs w-32" data-testid="risk-filter">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risks</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => exportCSV(filtered, 'risky-users')} data-testid="export-btn">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs" data-testid="risky-users-table">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['User', 'Department', 'Risk Level', 'Risk Detail', 'Location', 'MFA', 'Last Event', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-foreground">{row.display_name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.department}</td>
                    <td className="px-4 py-2.5"><Badge className={`text-xs ${riskConfig[row.risk_level]}`}>{row.risk_level}</Badge></td>
                    <td className="px-4 py-2.5 text-foreground max-w-48 truncate">{row.risk_detail}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.sign_in_location}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium ${row.mfa_enabled ? 'text-green-500' : 'text-destructive'}`}>
                        {row.mfa_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.last_risk_event}</td>
                    <td className="px-4 py-2.5">
                      <Badge className={`text-xs ${statusConfig[row.status] || 'bg-muted text-muted-foreground'}`}>{row.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-border">
            <p className="text-xs text-muted-foreground">{filtered.length} risky users shown</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
