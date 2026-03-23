import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Search, Bell, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const severityConfig = {
  Critical: { badge: 'bg-destructive text-destructive-foreground border-destructive', icon: 'text-destructive', border: 'border-l-destructive' },
  High: { badge: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: 'text-orange-500', border: 'border-l-orange-500' },
  Medium: { badge: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: 'text-yellow-600', border: 'border-l-yellow-500' },
  Low: { badge: 'bg-muted text-muted-foreground border-border', icon: 'text-muted-foreground', border: 'border-l-border' },
};

const categoryConfig = {
  Identity: 'bg-primary/10 text-primary',
  Exchange: 'bg-purple-500/10 text-purple-500',
  Security: 'bg-orange-500/10 text-orange-500',
  Compliance: 'bg-yellow-500/10 text-yellow-600',
};

export default function Alerts() {
  const { authHeaders } = useAuth();
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    axios.get(`${API}/alerts`, { headers: authHeaders })
      .then(r => setRaw(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authHeaders]);

  const filtered = useMemo(() => {
    if (!raw?.alerts) return [];
    return raw.alerts.filter(a => {
      const q = search.toLowerCase();
      const matchSearch = a.title.toLowerCase().includes(q) || a.user.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
      const matchSev = severityFilter === 'all' || a.severity === severityFilter;
      const matchCat = categoryFilter === 'all' || a.category === categoryFilter;
      return matchSearch && matchSev && matchCat;
    });
  }, [raw, search, severityFilter, categoryFilter]);

  if (loading) return <Skeleton className="h-96 rounded-lg" />;

  const { summary } = raw;

  return (
    <div className="space-y-4" data-testid="alerts-page">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Active', value: summary.active, color: 'text-foreground' },
          { label: 'Critical', value: summary.critical, color: 'text-destructive' },
          { label: 'High', value: summary.high, color: 'text-orange-500' },
          { label: 'Medium', value: summary.medium, color: 'text-yellow-600' },
          { label: 'Resolved', value: summary.resolved, color: 'text-green-500' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="border-border">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts List */}
      <Card className="border-border">
        <CardHeader className="pb-3 flex-row items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Active Alerts ({filtered.length})</CardTitle>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search alerts..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-8 text-xs w-44" data-testid="alert-search" />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="h-8 text-xs w-32" data-testid="severity-filter">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 text-xs w-32" data-testid="category-filter">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Identity">Identity</SelectItem>
                <SelectItem value="Exchange">Exchange</SelectItem>
                <SelectItem value="Security">Security</SelectItem>
                <SelectItem value="Compliance">Compliance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-0 divide-y divide-border" data-testid="alerts-list">
            {filtered.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No alerts match your filters</p>
              </div>
            ) : (
              filtered.map(alert => {
                const cfg = severityConfig[alert.severity] || severityConfig.Low;
                return (
                  <div
                    key={alert.id}
                    data-testid={`alert-${alert.id}`}
                    className={`flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors border-l-2 ${cfg.border}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-semibold text-foreground">{alert.title}</p>
                        <Badge className={`text-xs ${cfg.badge}`}>{alert.severity}</Badge>
                        <Badge className={`text-xs ${categoryConfig[alert.category] || 'bg-muted text-muted-foreground'}`}>{alert.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{alert.description}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span className="font-mono">{alert.user}</span>
                        <span>·</span>
                        <span>{alert.source}</span>
                        <span>·</span>
                        <span>{alert.timestamp}</span>
                      </div>
                    </div>
                    <Badge className="shrink-0 text-xs bg-muted text-muted-foreground">{alert.status}</Badge>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
