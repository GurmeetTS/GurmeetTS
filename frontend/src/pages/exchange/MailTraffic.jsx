import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Download, Send, Inbox, ShieldAlert, Bug } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-md p-2 shadow-sm text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: <strong>{p.value?.toLocaleString()}</strong></p>
      ))}
    </div>
  );
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

export default function MailTraffic() {
  const { authHeaders } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/exchange/mail-traffic`, { headers: authHeaders })
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authHeaders]);

  if (loading) return <Skeleton className="h-96 rounded-lg" />;

  const { summary, trend, top_senders } = data;

  return (
    <div className="space-y-4" data-testid="mail-traffic-page">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Sent', value: summary.total_sent.toLocaleString(), icon: Send, color: 'text-primary bg-primary/10' },
          { label: 'Total Received', value: summary.total_received.toLocaleString(), icon: Inbox, color: 'text-green-500 bg-green-500/10' },
          { label: 'Spam Blocked', value: summary.total_spam.toLocaleString(), icon: ShieldAlert, color: 'text-yellow-600 bg-yellow-500/10' },
          { label: 'Malware Blocked', value: summary.total_malware.toLocaleString(), icon: Bug, color: 'text-destructive bg-destructive/10' },
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

      {/* Traffic Chart */}
      <Card className="border-border">
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Daily Mail Traffic (Feb 2025)</CardTitle>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => exportCSV(trend, 'mail-traffic')} data-testid="export-btn">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="sent" name="Sent" stroke="#3B82F6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="received" name="Received" stroke="#10B981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="spam" name="Spam" stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              <Line type="monotone" dataKey="malware" name="Malware" stroke="#EF4444" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Senders */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Top Senders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-xs" data-testid="top-senders-table">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['User', 'Sent', 'Received'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {top_senders.map((s, i) => (
                <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors last:border-0">
                  <td className="px-4 py-2.5 font-mono text-foreground">{s.user}</td>
                  <td className="px-4 py-2.5 text-foreground font-medium">{s.sent.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-foreground">{s.received.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="bg-muted/50 rounded-lg p-3 border border-border">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-green-500">Spam filter effectiveness: {summary.spam_filter_rate}%</span>
          {' '}· All mail traffic data sourced from Exchange Online Protection logs.
        </p>
      </div>
    </div>
  );
}
