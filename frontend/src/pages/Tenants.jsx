import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { toast } from 'sonner';
import {
  Building2, Plus, Wifi, WifiOff, RefreshCw, Trash2,
  CheckCircle2, AlertCircle, Clock, TestTube2, Info, ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '../components/ui/alert-dialog';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusConfig = {
  connected: { label: 'Connected', icon: CheckCircle2, color: 'text-green-500', badge: 'bg-green-500/10 text-green-500 border-green-500/20' },
  demo: { label: 'Demo Mode', icon: TestTube2, color: 'text-primary', badge: 'bg-primary/10 text-primary border-primary/20' },
  error: { label: 'Error', icon: AlertCircle, color: 'text-destructive', badge: 'bg-destructive/10 text-destructive border-destructive/20' },
  pending: { label: 'Not Tested', icon: Clock, color: 'text-muted-foreground', badge: 'bg-muted text-muted-foreground border-border' },
};

const REQUIRED_PERMISSIONS = [
  'User.Read.All', 'AuditLog.Read.All', 'IdentityRiskyUser.Read.All',
  'Policy.Read.All', 'Reports.Read.All', 'UserAuthenticationMethod.Read.All', 'Directory.Read.All',
];

const emptyForm = { name: '', mode: 'demo', azure_tenant_id: '', client_id: '', client_secret: '', description: '' };

export default function Tenants() {
  const { authHeaders } = useAuth();
  const { tenants, setTenants, activeTenantId, switchTenant, loadTenants } = useTenant();
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTenant, setEditTenant] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [syncingId, setSyncingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [showPermissions, setShowPermissions] = useState(false);

  useEffect(() => {
    loadTenants().finally(() => setLoading(false));
  }, [loadTenants]);

  const openAdd = () => { setEditTenant(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (t) => {
    setEditTenant(t);
    setForm({ name: t.name, mode: t.mode, azure_tenant_id: t.azure_tenant_id || '', client_id: t.client_id || '', client_secret: '', description: t.description || '' });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Tenant name is required'); return; }
    if (form.mode === 'real' && (!form.azure_tenant_id || !form.client_id || (!editTenant && !form.client_secret))) {
      toast.error('Real tenant requires Tenant ID, Client ID, and Client Secret');
      return;
    }
    setSubmitting(true);
    try {
      if (editTenant) {
        const { data } = await axios.put(`${API}/tenants/${editTenant.id}`, form, { headers: authHeaders });
        setTenants(prev => prev.map(t => t.id === editTenant.id ? data : t));
        toast.success('Tenant updated');
      } else {
        const { data } = await axios.post(`${API}/tenants`, form, { headers: authHeaders });
        setTenants(prev => [...prev, data]);
        toast.success('Tenant added successfully');
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save tenant');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestConnection = async (tenantId) => {
    setTestingId(tenantId);
    try {
      const { data } = await axios.post(`${API}/tenants/${tenantId}/test-connection`, {}, { headers: authHeaders });
      if (data.success) {
        toast.success(`Connected! Tenant: ${data.org_name || 'OK'}`);
      } else {
        toast.error(`Connection failed: ${data.error}`);
      }
      await loadTenants();
    } catch (err) {
      toast.error('Test failed — check your credentials');
    } finally {
      setTestingId(null);
    }
  };

  const handleSync = async (tenantId) => {
    setSyncingId(tenantId);
    try {
      const { data } = await axios.post(`${API}/tenants/${tenantId}/sync`, {}, { headers: authHeaders });
      toast.success(`Synced ${data.synced?.length || 0} datasets`);
      if (data.errors?.length) toast.warning(`${data.errors.length} dataset(s) failed to sync`);
      await loadTenants();
    } catch (err) {
      toast.error('Sync failed');
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/tenants/${deleteId}`, { headers: authHeaders });
      setTenants(prev => prev.filter(t => t.id !== deleteId));
      if (activeTenantId === deleteId) switchTenant(null);
      toast.success('Tenant deleted');
    } catch {
      toast.error('Failed to delete tenant');
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-5" data-testid="tenants-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Connect and manage Microsoft 365 tenants for live data reporting
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 text-xs h-9" data-testid="add-tenant-btn">
          <Plus className="h-3.5 w-3.5" /> Add Tenant
        </Button>
      </div>

      {/* How it works */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="text-xs space-y-1">
            <p className="font-medium text-foreground">How Tenant Connection Works</p>
            <p className="text-muted-foreground">
              <strong>Demo Mode:</strong> Uses realistic simulated M365 data — no setup required.{' '}
              <strong>Real Mode:</strong> Connects to your actual Microsoft 365 tenant via Microsoft Graph API using an Azure App Registration.
              Real data fetches Sign-in Logs, Risky Users, MFA Status, and Conditional Access policies live from your tenant.
            </p>
            <button
              onClick={() => setShowPermissions(!showPermissions)}
              className="text-primary hover:underline flex items-center gap-1 mt-1"
            >
              Required API permissions <ChevronDown className={`h-3 w-3 transition-transform ${showPermissions ? 'rotate-180' : ''}`} />
            </button>
            {showPermissions && (
              <div className="mt-1 flex flex-wrap gap-1">
                {REQUIRED_PERMISSIONS.map(p => (
                  <code key={p} className="bg-muted text-foreground px-1.5 py-0.5 rounded text-xs font-mono">{p}</code>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Default Demo */}
      <Card className={`border-border ${!activeTenantId ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}`} data-testid="default-demo-card">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <TestTube2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Default Demo Data</p>
              <p className="text-xs text-muted-foreground">Contoso Corporation — simulated M365 environment</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Demo</Badge>
            {!activeTenantId ? (
              <Badge className="text-xs bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>
            ) : (
              <Button
                size="sm" variant="outline" className="h-7 text-xs"
                onClick={() => switchTenant(null)}
                data-testid="switch-to-default-btn"
              >
                Switch to Demo
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tenant Cards */}
      {tenants.length === 0 ? (
        <Card className="border-dashed border-border">
          <CardContent className="py-12 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No custom tenants added</p>
            <p className="text-xs text-muted-foreground mb-4">Add a demo or real Microsoft 365 tenant to get started</p>
            <Button onClick={openAdd} className="gap-2 text-xs h-8" data-testid="add-first-tenant-btn">
              <Plus className="h-3.5 w-3.5" /> Add Your First Tenant
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3" data-testid="tenants-list">
          {tenants.map(tenant => {
            const status = statusConfig[tenant.status] || statusConfig.pending;
            const isActive = activeTenantId === tenant.id;
            const StatusIcon = status.icon;
            return (
              <Card
                key={tenant.id}
                data-testid={`tenant-card-${tenant.id}`}
                className={`border-border ${isActive ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tenant.mode === 'real' ? 'bg-green-500/10' : 'bg-primary/10'}`}>
                        <Building2 className={`h-4 w-4 ${tenant.mode === 'real' ? 'text-green-500' : 'text-primary'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{tenant.name}</p>
                          <Badge className={`text-xs ${tenant.mode === 'real' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
                            {tenant.mode === 'real' ? 'Live' : 'Demo'}
                          </Badge>
                          <Badge className={`text-xs ${status.badge}`}>
                            <StatusIcon className="h-2.5 w-2.5 mr-1" />{status.label}
                          </Badge>
                          {isActive && <Badge className="text-xs bg-primary text-primary-foreground">Active</Badge>}
                        </div>
                        {tenant.azure_tenant_id && (
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            Tenant ID: {tenant.azure_tenant_id}
                          </p>
                        )}
                        {tenant.status_message && (
                          <p className="text-xs text-muted-foreground mt-0.5">{tenant.status_message}</p>
                        )}
                        {tenant.last_sync_at && (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" /> Last sync: {new Date(tenant.last_sync_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {tenant.mode === 'real' && (
                        <>
                          <Button
                            size="sm" variant="outline" className="h-7 text-xs gap-1"
                            onClick={() => handleTestConnection(tenant.id)}
                            disabled={testingId === tenant.id}
                            data-testid={`test-connection-${tenant.id}`}
                          >
                            <Wifi className="h-3 w-3" />
                            {testingId === tenant.id ? 'Testing...' : 'Test'}
                          </Button>
                          <Button
                            size="sm" variant="outline" className="h-7 text-xs gap-1"
                            onClick={() => handleSync(tenant.id)}
                            disabled={syncingId === tenant.id}
                            data-testid={`sync-${tenant.id}`}
                          >
                            <RefreshCw className={`h-3 w-3 ${syncingId === tenant.id ? 'animate-spin' : ''}`} />
                            {syncingId === tenant.id ? 'Syncing...' : 'Sync'}
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => openEdit(tenant)}
                        data-testid={`edit-tenant-${tenant.id}`}
                      >
                        Edit
                      </Button>
                      {!isActive ? (
                        <Button
                          size="sm" className="h-7 text-xs gap-1"
                          onClick={() => switchTenant(tenant.id)}
                          data-testid={`switch-tenant-${tenant.id}`}
                        >
                          Switch
                        </Button>
                      ) : (
                        <Button
                          size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => switchTenant(null)}
                        >
                          Deactivate
                        </Button>
                      )}
                      <Button
                        size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(tenant.id)}
                        data-testid={`delete-tenant-${tenant.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">{editTenant ? 'Edit Tenant' : 'Add Tenant'}</DialogTitle>
            <DialogDescription className="text-xs">
              {editTenant ? 'Update tenant configuration' : 'Connect a Microsoft 365 tenant to fetch live analytics data'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Tenant Display Name *</Label>
              <Input
                placeholder="e.g. Contoso Corporation"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="h-9 text-sm"
                data-testid="tenant-name-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mode *</Label>
              <Select value={form.mode} onValueChange={v => setForm({ ...form, mode: v })}>
                <SelectTrigger className="h-9 text-sm" data-testid="tenant-mode-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="demo">Demo Mode — simulated data, no credentials needed</SelectItem>
                  <SelectItem value="real">Real Mode — live Microsoft Graph API connection</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.mode === 'real' && (
              <>
                <div className="p-3 bg-muted/50 rounded-md border border-border text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Azure App Registration Required</p>
                  <p>1. Go to <strong>Azure Portal → App Registrations → New Registration</strong></p>
                  <p>2. Add API permissions (Application type): <code className="bg-muted px-1 rounded">User.Read.All</code>, <code className="bg-muted px-1 rounded">AuditLog.Read.All</code>, <code className="bg-muted px-1 rounded">Reports.Read.All</code> + others</p>
                  <p>3. <strong>Grant admin consent</strong> for your organization</p>
                  <p>4. Create a client secret and copy the values below</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Azure Tenant ID (Directory ID) *</Label>
                  <Input
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={form.azure_tenant_id}
                    onChange={e => setForm({ ...form, azure_tenant_id: e.target.value })}
                    className="h-9 text-sm font-mono"
                    data-testid="azure-tenant-id-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Client ID (Application ID) *</Label>
                  <Input
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={form.client_id}
                    onChange={e => setForm({ ...form, client_id: e.target.value })}
                    className="h-9 text-sm font-mono"
                    data-testid="client-id-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Client Secret {editTenant && '(leave blank to keep existing)'} *</Label>
                  <Input
                    type="password"
                    placeholder={editTenant ? '••••••••••••••••' : 'Enter client secret value'}
                    value={form.client_secret}
                    onChange={e => setForm({ ...form, client_secret: e.target.value })}
                    className="h-9 text-sm"
                    data-testid="client-secret-input"
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Description (optional)</Label>
              <Input
                placeholder="e.g. Production tenant for Contoso"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={submitting} data-testid="save-tenant-btn">
              {submitting ? 'Saving...' : editTenant ? 'Update Tenant' : 'Add Tenant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tenant?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the tenant configuration. All cached data will be lost. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="confirm-delete-btn">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
