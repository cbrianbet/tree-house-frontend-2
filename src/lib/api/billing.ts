import api from "./client";
import type {
  BillingConfig,
  Invoice,
  PayInvoiceResponse,
  Receipt,
  ChargeType,
  AdditionalIncome,
  AdditionalIncomeCreateRequest,
  Expense,
  ExpenseCreateRequest,
  FinancialReport,
} from "@/types/api";

// ── Billing Config ──

export async function getBillingConfig(
  propertyId: number,
): Promise<BillingConfig> {
  const res = await api.get<BillingConfig>(
    `/api/billing/config/${propertyId}/`,
  );
  return res.data;
}

export async function saveBillingConfig(
  propertyId: number,
  data: BillingConfig,
): Promise<BillingConfig> {
  const res = await api.post<BillingConfig>(
    `/api/billing/config/${propertyId}/`,
    data,
  );
  return res.data;
}

// ── Invoices ──

export async function listInvoices(): Promise<Invoice[]> {
  const res = await api.get<Invoice[]>("/api/billing/invoices/");
  return res.data;
}

export async function getInvoice(id: number): Promise<Invoice> {
  const res = await api.get<Invoice>(`/api/billing/invoices/${id}/`);
  return res.data;
}

export async function payInvoice(
  id: number,
  amount?: string,
): Promise<PayInvoiceResponse> {
  const res = await api.post<PayInvoiceResponse>(
    `/api/billing/invoices/${id}/pay/`,
    amount ? { amount } : undefined,
  );
  return res.data;
}

// ── Receipts ──

export async function listReceipts(): Promise<Receipt[]> {
  const res = await api.get<Receipt[]>("/api/billing/receipts/");
  return res.data;
}

export async function getReceipt(id: number): Promise<Receipt> {
  const res = await api.get<Receipt>(`/api/billing/receipts/${id}/`);
  return res.data;
}

// ── Charge Types ──

export async function listChargeTypes(
  propertyId: number,
): Promise<ChargeType[]> {
  const res = await api.get<ChargeType[]>(
    `/api/billing/properties/${propertyId}/charge-types/`,
  );
  return res.data;
}

export async function createChargeType(
  propertyId: number,
  name: string,
): Promise<ChargeType> {
  const res = await api.post<ChargeType>(
    `/api/billing/properties/${propertyId}/charge-types/`,
    { name },
  );
  return res.data;
}

export async function updateChargeType(
  propertyId: number,
  id: number,
  name: string,
): Promise<ChargeType> {
  const res = await api.put<ChargeType>(
    `/api/billing/properties/${propertyId}/charge-types/${id}/`,
    { name },
  );
  return res.data;
}

export async function deleteChargeType(
  propertyId: number,
  id: number,
): Promise<void> {
  await api.delete(
    `/api/billing/properties/${propertyId}/charge-types/${id}/`,
  );
}

// ── Additional Income ──

export async function listAdditionalIncome(
  propertyId: number,
): Promise<AdditionalIncome[]> {
  const res = await api.get<AdditionalIncome[]>(
    `/api/billing/properties/${propertyId}/additional-income/`,
  );
  return res.data;
}

export async function createAdditionalIncome(
  propertyId: number,
  data: AdditionalIncomeCreateRequest,
): Promise<AdditionalIncome> {
  const res = await api.post<AdditionalIncome>(
    `/api/billing/properties/${propertyId}/additional-income/`,
    data,
  );
  return res.data;
}

export async function deleteAdditionalIncome(
  propertyId: number,
  id: number,
): Promise<void> {
  await api.delete(
    `/api/billing/properties/${propertyId}/additional-income/${id}/`,
  );
}

// ── Expenses ──

export async function listExpenses(propertyId: number): Promise<Expense[]> {
  const res = await api.get<Expense[]>(
    `/api/billing/properties/${propertyId}/expenses/`,
  );
  return res.data;
}

export async function createExpense(
  propertyId: number,
  data: ExpenseCreateRequest,
): Promise<Expense> {
  const res = await api.post<Expense>(
    `/api/billing/properties/${propertyId}/expenses/`,
    data,
  );
  return res.data;
}

export async function deleteExpense(
  propertyId: number,
  id: number,
): Promise<void> {
  await api.delete(
    `/api/billing/properties/${propertyId}/expenses/${id}/`,
  );
}

// ── Financial Reports ──

export async function getFinancialReport(
  propertyId: number,
  year: number,
  month?: number,
): Promise<FinancialReport> {
  const params = new URLSearchParams({ year: String(year) });
  if (month) params.set("month", String(month));
  const res = await api.get<FinancialReport>(
    `/api/billing/reports/${propertyId}/?${params}`,
  );
  return res.data;
}
