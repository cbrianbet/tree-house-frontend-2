import api from "./client";
import type {
  SystemMetric,
  AlertRule,
  AlertRuleCreateRequest,
  AlertInstance,
  AlertInstanceStatus,
  MonitoringDashboard,
  ImpersonationLog,
} from "@/types/api";

// ── Metrics ──

export async function listMetrics(params?: {
  metric_type?: string;
  hours?: number;
}): Promise<SystemMetric[]> {
  const query = new URLSearchParams();
  if (params?.metric_type) query.set("metric_type", params.metric_type);
  if (params?.hours != null) query.set("hours", String(params.hours));
  const qs = query.toString();
  const res = await api.get<SystemMetric[]>(
    `/api/monitoring/metrics/${qs ? `?${qs}` : ""}`,
  );
  return res.data;
}

// ── Alert Rules ──

export async function listAlertRules(): Promise<AlertRule[]> {
  const res = await api.get<AlertRule[]>("/api/monitoring/alert-rules/");
  return res.data;
}

export async function createAlertRule(
  data: AlertRuleCreateRequest,
): Promise<AlertRule> {
  const res = await api.post<AlertRule>("/api/monitoring/alert-rules/", data);
  return res.data;
}

export async function updateAlertRule(
  id: number,
  data: Partial<AlertRuleCreateRequest>,
): Promise<AlertRule> {
  const res = await api.patch<AlertRule>(
    `/api/monitoring/alert-rules/${id}/`,
    data,
  );
  return res.data;
}

export async function deleteAlertRule(id: number): Promise<void> {
  await api.delete(`/api/monitoring/alert-rules/${id}/`);
}

// ── Alert Instances ──

export async function listAlerts(params?: {
  status?: AlertInstanceStatus;
  severity?: string;
  hours?: number;
}): Promise<AlertInstance[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.severity) query.set("severity", params.severity);
  if (params?.hours != null) query.set("hours", String(params.hours));
  const qs = query.toString();
  const res = await api.get<AlertInstance[]>(
    `/api/monitoring/alerts/${qs ? `?${qs}` : ""}`,
  );
  return res.data;
}

export async function updateAlert(
  id: number,
  data: { status: AlertInstanceStatus; note?: string },
): Promise<AlertInstance> {
  const res = await api.patch<AlertInstance>(
    `/api/monitoring/alerts/${id}/`,
    data,
  );
  return res.data;
}

// ── Dashboard ──

export async function getMonitoringDashboard(): Promise<MonitoringDashboard> {
  const res = await api.get<MonitoringDashboard>(
    "/api/monitoring/dashboard/",
  );
  return res.data;
}

// ── Impersonation Logs ──

export async function listImpersonationLogs(params?: {
  target_user?: number;
  hours?: number;
}): Promise<ImpersonationLog[]> {
  const query = new URLSearchParams();
  if (params?.target_user != null)
    query.set("target_user", String(params.target_user));
  if (params?.hours != null) query.set("hours", String(params.hours));
  const qs = query.toString();
  const res = await api.get<ImpersonationLog[]>(
    `/api/monitoring/impersonation-logs/${qs ? `?${qs}` : ""}`,
  );
  return res.data;
}
