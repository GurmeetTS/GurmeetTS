import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Download, Search, Lock, ShieldCheck, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const stateConfig = {
  On: 'bg-green-500/10 text-green-500 border-green-500/20',
  'Report-Only': 'bg-primary/10 text-primary border-primary/20',
  Off: 'bg-muted text-muted-foreground border-border',
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

export default function ConditionalAccess() {
  const { authHeaders } = useAuth();
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    axios.get(`${API}/entra/conditional-access`, { headers: authHeaders })
      .then(r => setRaw(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authHeaders]);

  const filtered = useMemo(() => {
    if (!raw?.policies) return [];
    const q = search.toLowerCase();
    return raw.policies.filter(r =>
      r.name.toLowerCase().includes(q) || r.users.toLowerCase().includes(q) || r.apps.toLowerCase().includes(q)
    );
  }, [raw, search]);

  if (loading) return <Skeleton className="h-96 rounded-lg" />;

  const { summary } = raw;

  return (
    <div className="space-y-4" data-testid="conditional-access-page">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Policies', value: summary.total_policies, icon: Lock, color: 'text-primary bg-primary/10' },
          { label: 'Enabled (On)', value: summary.enabled, icon: ShieldCheck, color: 'text-green-500 bg-green-500/10' },
          { label: 'Report-Only', value: summary.report_only, icon: Eye, color: 'text-primary bg-primary/10' },
          { label: 'Disabled', value: summary.disabled, icon: Lock, color: 'text-muted-foreground bg-muted' },
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
        <CardHeader className="pb-3 flex-row items-center justify-between gap-4">
          <CardTitle className="text-sm font-semibold">Conditional Access Policies</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search policies..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-8 text-xs w-48" data-testid="ca-search" />
            </div>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => exportCSV(filtered, 'conditional-access-policies')} data-testid="export-btn">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs" data-testid="ca-table">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['Policy Name', 'State', 'Users', 'Applications', 'Conditions', 'Grant Controls', 'Last Modified'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-foreground">{row.name}</td>
                    <td className="px-4 py-2.5"><Badge className={`text-xs ${stateConfig[row.state]}`}>{row.state}</Badge></td>
                    <td className="px-4 py-2.5 text-foreground">{row.users}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.apps}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.conditions}</td>
                    <td className="px-4 py-2.5 text-foreground">{row.grant_controls}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.last_modified}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-border">
            <p className="text-xs text-muted-foreground">{filtered.length} policies</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
