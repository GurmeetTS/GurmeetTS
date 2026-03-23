import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Download, Search, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const riskConfig = {
  Critical: 'bg-destructive/10 text-destructive border-destructive/20',
  High: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  Low: 'bg-muted text-muted-foreground border-border',
};

const typeConfig = {
  External: 'bg-destructive/10 text-destructive border-destructive/20',
  Internal: 'bg-green-500/10 text-green-500 border-green-500/20',
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

export default function ForwardingRules() {
  const { authHeaders } = useAuth();
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    axios.get(`${API}/exchange/forwarding-rules`, { headers: authHeaders })
      .then(r => setRaw(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authHeaders]);

  const filtered = useMemo(() => {
    if (!raw?.data) return [];
    const q = search.toLowerCase();
    return raw.data.filter(r =>
      r.display_name.toLowerCase().includes(q) || r.forward_to.toLowerCase().includes(q) || r.rule_name.toLowerCase().includes(q)
    );
  }, [raw, search]);

  if (loading) return <Skeleton className="h-96 rounded-lg" />;

  const { summary } = raw;

  return (
    <div className="space-y-4" data-testid="forwarding-rules-page">
      {/* Alert Banner */}
      {summary.critical_risk > 0 && (
        <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg" data-testid="critical-alert-banner">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-xs text-destructive">
            <strong>{summary.critical_risk} critical</strong> and <strong>{summary.high_risk} high risk</strong> external forwarding rules detected. Review immediately.
          </p>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Rules', value: summary.total_rules, icon: ArrowRightLeft, color: 'text-primary bg-primary/10' },
          { label: 'External Rules', value: summary.external_rules, icon: AlertTriangle, color: 'text-destructive bg-destructive/10' },
          { label: 'Internal Rules', value: summary.internal_rules, icon: ArrowRightLeft, color: 'text-green-500 bg-green-500/10' },
          { label: 'Critical Risk', value: summary.critical_risk, icon: AlertTriangle, color: 'text-destructive bg-destructive/10' },
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

      {/* Table */}
      <Card className="border-border">
        <CardHeader className="pb-3 flex-row items-center justify-between gap-4">
          <CardTitle className="text-sm font-semibold">Forwarding Rules</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search rules..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-8 text-xs w-44" data-testid="forwarding-search" />
            </div>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => exportCSV(filtered, 'forwarding-rules')} data-testid="export-btn">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs" data-testid="forwarding-table">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['User', 'Rule Name', 'Forward To', 'Type', 'Created', 'Status', 'Risk'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-foreground">{row.display_name}</td>
                    <td className="px-4 py-2.5 text-foreground">{row.rule_name}</td>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">{row.forward_to}</td>
                    <td className="px-4 py-2.5">
                      <Badge className={`text-xs ${typeConfig[row.rule_type]}`}>{row.rule_type}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.created_date}</td>
                    <td className="px-4 py-2.5">
                      <Badge className={`text-xs ${row.status === 'Active' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-muted text-muted-foreground'}`}>
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge className={`text-xs ${riskConfig[row.risk_level]}`}>{row.risk_level}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-border">
            <p className="text-xs text-muted-foreground">{filtered.length} rules found</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
