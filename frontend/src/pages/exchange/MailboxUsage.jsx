import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Download, Search, Inbox, Users, HardDrive, Share2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { Progress } from '../../components/ui/progress';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function exportCSV(data, filename) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(','), ...data.map(r => keys.map(k => `"${r[k] ?? ''}"`).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `${filename}.csv`;
  a.click();
}

const typeColors = { UserMailbox: 'bg-primary/10 text-primary', SharedMailbox: 'bg-purple-500/10 text-purple-500', RoomMailbox: 'bg-green-500/10 text-green-500' };

export default function MailboxUsage() {
  const { authHeaders } = useAuth();
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    axios.get(`${API}/exchange/mailbox-usage`, { headers: authHeaders })
      .then(r => setRaw(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authHeaders]);

  const filtered = useMemo(() => {
    if (!raw?.data) return [];
    const q = search.toLowerCase();
    return raw.data.filter(r =>
      r.display_name.toLowerCase().includes(q) || r.user.toLowerCase().includes(q) || r.mailbox_type.toLowerCase().includes(q)
    );
  }, [raw, search]);

  const pages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  if (loading) return <div className="space-y-4"><Skeleton className="h-24 rounded-lg" /><Skeleton className="h-96 rounded-lg" /></div>;

  const { summary } = raw;

  return (
    <div className="space-y-4" data-testid="mailbox-usage-page">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Mailboxes', value: summary.total_mailboxes.toLocaleString(), icon: Inbox, color: 'text-primary bg-primary/10' },
          { label: 'Active', value: summary.active.toLocaleString(), icon: Users, color: 'text-green-500 bg-green-500/10' },
          { label: 'Inactive', value: summary.inactive.toLocaleString(), icon: Users, color: 'text-yellow-600 bg-yellow-500/10' },
          { label: 'Total Storage', value: `${(summary.total_storage_gb / 1024).toFixed(1)} TB`, icon: HardDrive, color: 'text-purple-500 bg-purple-500/10' },
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
          <CardTitle className="text-sm font-semibold">Mailbox Details</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search mailboxes..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="h-8 pl-8 text-xs w-48"
                data-testid="mailbox-search"
              />
            </div>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => exportCSV(filtered, 'mailbox-usage')} data-testid="export-csv-btn">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs" data-testid="mailbox-table">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['Display Name', 'Email', 'Type', 'Storage', 'Items', 'Last Logon', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((row, i) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-foreground">{row.display_name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground font-mono">{row.user}</td>
                    <td className="px-4 py-2.5">
                      <Badge className={`text-xs ${typeColors[row.mailbox_type] || 'bg-muted text-muted-foreground'}`}>{row.mailbox_type}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2 min-w-24">
                        <span className="text-foreground">{(row.storage_mb / 1024).toFixed(1)} GB</span>
                        <Progress value={(row.storage_mb / row.quota_mb) * 100} className="h-1 w-12" />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-foreground">{row.item_count.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.last_logon}</td>
                    <td className="px-4 py-2.5">
                      <Badge className={row.status === 'Active' ? 'bg-green-500/10 text-green-500 border-green-500/20 text-xs' : 'bg-muted text-muted-foreground text-xs'}>
                        {row.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
            <p className="text-xs text-muted-foreground">{filtered.length} mailboxes</p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} data-testid="prev-page-btn">Prev</Button>
              <span className="text-xs text-muted-foreground px-2">{page} / {pages || 1}</span>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages} data-testid="next-page-btn">Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
