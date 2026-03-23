import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const [tenants, setTenants] = useState([]);
  const [activeTenantId, setActiveTenantId] = useState(
    () => localStorage.getItem('m365_active_tenant_id') || null
  );

  // Global axios interceptor: adds tenantId query param to all requests automatically
  useEffect(() => {
    const interceptorId = axios.interceptors.request.use((config) => {
      const tid = localStorage.getItem('m365_active_tenant_id');
      if (tid) {
        config.params = { ...config.params, tenantId: tid };
      }
      return config;
    });
    return () => axios.interceptors.request.eject(interceptorId);
  }, []);

  const loadTenants = useCallback(async () => {
    const token = localStorage.getItem('m365_token');
    if (!token) return;
    try {
      const { data } = await axios.get(`${API}/tenants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTenants(data);
    } catch (e) {
      console.error('Failed to load tenants', e);
    }
  }, []);

  const activeTenant = tenants.find(t => t.id === activeTenantId) || null;

  const switchTenant = useCallback((tenantId) => {
    if (tenantId) {
      localStorage.setItem('m365_active_tenant_id', tenantId);
    } else {
      localStorage.removeItem('m365_active_tenant_id');
    }
    setActiveTenantId(tenantId || null);
  }, []);

  return (
    <TenantContext.Provider value={{ tenants, setTenants, activeTenant, activeTenantId, switchTenant, loadTenants }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext);
