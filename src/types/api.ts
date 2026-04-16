// ── Auth ──

export interface Role {
  id: number;
  name: string;
  description: string;
}

export interface User {
  pk: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: number;
  is_staff: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password1: string;
  password2: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: number;
}

export interface AuthTokenResponse {
  key: string;
}

// ── Profiles ──

export interface TenantProfile {
  id?: number;
  user: number;
  national_id: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

export interface LandlordProfile {
  id?: number;
  user: number;
  company_name: string;
  tax_id: string;
  verified?: boolean;
}

export interface AgentProfile {
  id?: number;
  user: number;
  agency_name: string;
  license_number: string;
  commission_rate: string;
}

export type ArtisanTrade =
  | "plumbing"
  | "electrical"
  | "carpentry"
  | "painting"
  | "masonry"
  | "other";

export interface ArtisanProfile {
  id?: number;
  user: number;
  trade: ArtisanTrade;
  bio: string;
  rating?: number;
  verified?: boolean;
}

export interface MovingCompanyProfile {
  id?: number;
  user: number;
  company_name: string;
  description: string;
  phone: string;
  address: string;
  city: string;
  service_areas: string[];
  base_price: string;
  price_per_km: string;
  is_verified?: boolean;
  is_active?: boolean;
}

// ── Properties ──

export type PropertyType =
  | "house"
  | "apartment"
  | "commercial"
  | "land"
  | "bungalow"
  | "duplex"
  | "townhouse"
  | "studio"
  | "cottage"
  | "penthouse"
  | "other";

export interface Property {
  id: number;
  name: string;
  description: string;
  property_type: PropertyType;
  longitude: number;
  latitude: number;
  owner: number;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number | null;
  deleted_by: number | null;
}

export interface PropertyCreateRequest {
  name: string;
  description: string;
  property_type: PropertyType;
  longitude: number;
  latitude: number;
}

export interface Unit {
  id: number;
  property: number;
  name: string;
  floor: string;
  description: string;
  bedrooms: number;
  bathrooms: number;
  price: string;
  service_charge: string;
  security_deposit: string;
  amenities: string;
  parking_space: boolean;
  parking_slots: number;
  is_public: boolean;
  is_occupied: boolean;
  tour_url?: string;
}

/** `GET/POST /api/property/units/<id>/images/` — multipart field name: `image` */
export interface UnitImage {
  id: number;
  property: number;
  image: string;
  uploaded_at: string;
}

export interface UnitCreateRequest {
  name: string;
  floor: string;
  description: string;
  bedrooms: number;
  bathrooms: number;
  price: string;
  service_charge: string;
  security_deposit: string;
  amenities: string;
  parking_space: boolean;
  parking_slots: number;
  is_public: boolean;
  tour_url?: string;
}

export interface Lease {
  id: number;
  unit: number;
  tenant: number;
  start_date: string;
  end_date: string;
  rent_amount: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// ── Tenant invitations (landlord/agent → new tenant email) ──

export interface TenantInvitation {
  id: number;
  unit: number;
  email: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  start_date: string;
  end_date?: string | null;
  rent_amount: string;
  invited_by: number;
  status: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_user: number | null;
  created_at: string;
  /** Present only on create / resend responses (dev/testing). */
  invite_token?: string;
}

export interface TenantInvitationCreateRequest {
  email: string;
  start_date: string;
  rent_amount: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  end_date?: string;
}

/** `POST .../units/{id}/tenant-invitations/` — new email, pending invite. */
export type TenantInvitationCreatedResponse = TenantInvitation & {
  invite_token: string;
};

/** Same POST when email is already a registered tenant — lease created immediately. */
export interface TenantInvitationLeaseCreatedResponse {
  lease_created: true;
  lease: Lease;
}

export type CreateTenantInvitationResult =
  | TenantInvitationCreatedResponse
  | TenantInvitationLeaseCreatedResponse;

export interface TenantInviteAcceptRequest {
  token: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  national_id?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

export interface TenantInviteAcceptResponse {
  key: string;
  user: User;
}

export interface LeaseCreateRequest {
  tenant: number;
  start_date: string;
  end_date: string;
  rent_amount: string;
  is_active: boolean;
}

export interface PropertyAgent {
  id: number;
  property: number;
  agent: number;
  appointed_by: number;
  appointed_at: string;
}

// ── Billing ──

export type LateFeeMode = "percentage" | "fixed";

/** Nested object on billing config GET/POST (writable via config payload). */
export interface PropertyBillingNotificationSettings {
  remind_before_due_days: number | null;
  remind_after_overdue_days: number | null;
  send_receipt_on_payment: boolean;
}

/** Writable billing fields (POST `/api/billing/config/<property_id>/`). */
export interface BillingConfigPayload {
  rent_due_day: number;
  grace_period_days: number;
  late_fee_percentage: string;
  late_fee_max_percentage: string | null;
  invoice_lead_days: number;
  late_fee_mode: LateFeeMode;
  late_fee_fixed_amount: string | null;
  mpesa_paybill: string;
  mpesa_account_label: string;
  bank_name: string;
  bank_account: string;
  payment_notes: string;
  notification_settings: PropertyBillingNotificationSettings | null;
}

/** GET `/api/billing/config/<property_id>/` — includes read-only metadata when configured. */
export interface BillingConfig extends BillingConfigPayload {
  configured?: boolean;
  id?: number;
  property?: number;
  updated_at?: string;
  updated_by?: number | null;
}

/** GET `/api/billing/properties/<pk>/billing-preview/` */
export interface BillingPreview {
  configured: boolean;
  property: number;
  invoice_lead_days: number;
  rent_due_day: number;
  grace_period_days: number;
  next_invoice_generation_date: string | null;
  next_rent_due_date: string | null;
  active_lease_count?: number;
  estimated_monthly_rent_total?: string;
}

export type PaymentStatus = "pending" | "completed" | "failed" | string;

export interface Payment {
  id: number;
  invoice: number;
  amount: string;
  stripe_payment_intent_id: string;
  stripe_charge_id: string;
  status: PaymentStatus;
  paid_at: string | null;
  created_at: string;
}

export interface ManualPaymentResponse {
  payment: Payment;
  receipt: Receipt;
}

export type InvoiceStatus =
  | "pending"
  | "paid"
  | "partial"
  | "overdue"
  | "cancelled";

export interface Invoice {
  id: number;
  lease: number;
  period_start: string;
  period_end: string;
  due_date: string;
  rent_amount: string;
  late_fee_amount: string;
  total_amount: string;
  amount_paid?: string;
  status: InvoiceStatus;
  created_at?: string;
}

/** `POST /api/billing/invoices/` — manual invoice (admin / owner / assigned agent). */
export interface InvoiceCreateRequest {
  lease: number;
  period_start: string;
  period_end: string;
  due_date: string;
  /** Omit to use the lease’s default rent. */
  rent_amount?: string;
}

export interface PayInvoiceResponse {
  client_secret: string;
  payment_id: number;
  amount: string;
}

export interface Receipt {
  id: number;
  payment: number;
  receipt_number: string;
  issued_at: string;
}

// ── Maintenance ──

export type MaintenanceCategory =
  | "plumbing"
  | "electrical"
  | "carpentry"
  | "painting"
  | "masonry"
  | "other";

export type MaintenancePriority = "low" | "medium" | "high" | "urgent";

export type MaintenanceStatus =
  | "submitted"
  | "open"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "rejected";

export interface MaintenanceRequest {
  id: number;
  property: number;
  unit: number | null;
  submitted_by: number;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assigned_to: number | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRequestCreate {
  property: number;
  unit?: number;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
}

export type BidStatus = "pending" | "accepted" | "rejected";

export interface Bid {
  id: number;
  request: number;
  artisan: number;
  artisan_name?: string;
  artisan_rating?: string;
  artisan_trade?: string;
  artisan_job_count?: number;
  proposed_price: string;
  message: string;
  status: BidStatus;
  created_at: string;
}

export interface Note {
  id: number;
  request: number;
  author: number;
  note: string;
  created_at: string;
}

export interface MaintenanceImage {
  id: number;
  request: number;
  image: string;
  uploaded_by: number;
  uploaded_at: string;
}

// ── Tenant Applications ──

export type ApplicationStatus = "pending" | "approved" | "rejected" | "withdrawn";

export interface Application {
  id: number;
  unit: number;
  applicant: number;
  status: ApplicationStatus;
  message: string;
  reviewed_by: number | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface ApplicationCreateRequest {
  unit: number;
  message: string;
  documents?: string[];
}

export interface ApplicationApproveRequest {
  status: "approved";
  start_date: string;
  end_date?: string;
  rent_amount: string;
}

// ── Landlord Dashboard ──

export interface DashboardData {
  properties: {
    total: number;
    total_units: number;
    occupied_units: number;
    vacant_units: number;
    occupancy_rate: string;
  };
  adverts: {
    count: number;
    units: { id: number; name: string; property: string; price: string }[];
  };
  applications: {
    pending: number;
    approved_this_month: number;
  };
  leases_ending_soon: {
    id: number;
    unit: string;
    property: string;
    tenant: string;
    end_date: string;
    days_remaining: number;
  }[];
  billing: {
    overdue_invoices: number;
    collected_this_month: string;
    outstanding: string;
  };
  maintenance: {
    submitted: number;
    open: number;
    in_progress: number;
    assigned: number;
  };
  performance: {
    period: string;
    by_property: {
      id: number;
      name: string;
      net_income: string;
      total_units: number;
      occupied_units: number;
      occupancy_rate: string;
    }[];
  };
}

// ── Charge Types ──

export type ChargeKind = "fixed" | "variable" | "per_unit";

export interface ChargeType {
  id: number;
  property: number;
  name: string;
  /** Present on newer API responses; UI defaults to `variable`. */
  charge_kind?: ChargeKind;
  default_amount?: string | null;
  description?: string;
  display_order?: number;
  is_active?: boolean;
  created_by: number;
  created_at: string;
}

export interface ChargeTypeCreateRequest {
  name: string;
  charge_kind?: ChargeKind;
  default_amount?: string | null;
  description?: string;
  display_order?: number;
  is_active?: boolean;
}

// ── Additional Income ──

export interface AdditionalIncome {
  id: number;
  unit: number;
  charge_type: number;
  amount: string;
  date: string;
  description: string;
  recorded_by: number;
  created_at: string;
}

export interface AdditionalIncomeCreateRequest {
  unit: number;
  charge_type: number;
  amount: string;
  date: string;
  description: string;
}

// ── Expenses ──

export type ExpenseCategory =
  | "maintenance"
  | "utility"
  | "insurance"
  | "tax"
  | "repair"
  | "management_fee"
  | "other";

export interface Expense {
  id: number;
  property: number;
  unit: number | null;
  maintenance_request: number | null;
  category: ExpenseCategory;
  amount: string;
  description: string;
  date: string;
  recorded_by: number;
  created_at: string;
}

export interface ExpenseCreateRequest {
  category: ExpenseCategory;
  amount: string;
  date: string;
  description: string;
  unit?: number;
  maintenance_request?: number;
}

// ── Financial Reports ──

export interface OccupancySnapshot {
  period: string;
  occupied_units: number;
  total_units: number;
  occupancy_pct: string | null;
}

export interface FinancialReport {
  property: number;
  period: string;
  income: {
    rent_invoiced: string;
    late_fees_invoiced: string;
    total_invoiced: string;
    total_collected: string;
    additional_income: string;
    additional_income_by_type: Record<string, string>;
    total_income: string;
  };
  expenses: {
    total: string;
    by_category: Record<string, string>;
  };
  net_income: string;
  invoices: {
    paid: number;
    pending: number;
    overdue: number;
    partial: number;
    cancelled: number;
  };
  occupancy: {
    occupied_units: number;
    total_units: number;
    occupancy_pct: string | null;
  } | null;
  occupancy_series: OccupancySnapshot[];
  occupancy_avg_pct: string | null;
}

// ── Account Self-Service ──

export interface AccountInfo {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: number;
}

export type RoleProfile =
  | TenantProfile
  | LandlordProfile
  | AgentProfile
  | ArtisanProfile
  | MovingCompanyProfile;

export interface NotificationPreferences {
  email_notifications: boolean;
  payment_due_reminder: boolean;
  payment_received: boolean;
  maintenance_updates: boolean;
  new_maintenance_request: boolean;
  new_application: boolean;
  application_status_change: boolean;
  lease_expiry_notice: boolean;
  updated_at: string;
}

// ── Lease Documents ──

export type DocumentType =
  | "lease_agreement"
  | "addendum"
  | "notice"
  | "inspection_report"
  | "other";

export interface LeaseDocument {
  id: number;
  lease: number;
  document_type: DocumentType;
  title: string;
  file_url: string;
  uploaded_by: number;
  signed_by: number | null;
  signed_at: string | null;
  created_at: string;
}

export interface LeaseDocumentCreateRequest {
  document_type: DocumentType;
  title: string;
  file_url: string;
}

// ── Property Reviews ──

export interface PropertyReview {
  id: number;
  reviewer: number;
  reviewer_name: string;
  property: number;
  rating: number;
  comment: string;
  created_at: string;
}

export interface PropertyReviewCreateRequest {
  rating: number;
  comment: string;
}

// ── Tenant Reviews ──

export interface TenantReview {
  id: number;
  reviewer: number;
  reviewer_name: string;
  tenant: number;
  tenant_name: string;
  property: number;
  rating: number;
  comment: string;
  created_at: string;
}

export interface TenantReviewCreateRequest {
  tenant: number;
  rating: number;
  comment: string;
}

// ── Notifications ──

export type NotificationType =
  | "message"
  | "maintenance"
  | "payment"
  | "payment_reminder"
  | "lease"
  | "dispute"
  | "application"
  | "new_listing"
  | "moving"
  | "account";

export interface Notification {
  id: number;
  notification_type: NotificationType;
  title: string;
  body: string;
  action_url: string;
  is_read: boolean;
  created_at: string;
}

// ── Messaging ──

export interface ConversationParticipant {
  id: number;
  conversation: number;
  user: number;
  last_read_at: string | null;
  joined_at: string;
}

export interface Message {
  id: number;
  sender: number;
  sender_name: string;
  body: string;
  created_at: string;
}

export interface Conversation {
  id: number;
  property: number | null;
  subject: string;
  created_by: number;
  created_at: string;
  participants: ConversationParticipant[];
  unread_count: number;
  last_message: Message | null;
}

export interface ConversationCreateRequest {
  subject: string;
  property?: number;
  participant_ids: number[];
}

// ── Disputes ──

export type DisputeType =
  | "rent"
  | "maintenance"
  | "noise"
  | "damage"
  | "lease"
  | "other";

export type DisputeStatus = "open" | "under_review" | "resolved" | "closed";

export interface Dispute {
  id: number;
  created_by: number;
  property: number;
  unit: number | null;
  dispute_type: DisputeType;
  status: DisputeStatus;
  title: string;
  description: string;
  resolved_by: number | null;
  resolved_at: string | null;
  created_at: string;
}

export interface DisputeCreateRequest {
  property: number;
  unit?: number;
  dispute_type: DisputeType;
  title: string;
  description: string;
}

export interface DisputeMessage {
  id: number;
  dispute: number;
  sender: number;
  sender_name: string;
  body: string;
  created_at: string;
}

// ── Moving Companies ──

export interface MovingCompany {
  id: number;
  user: number;
  company_name: string;
  description: string;
  phone: string;
  city: string;
  service_areas: string[];
  base_price: string;
  price_per_km: string;
  is_verified: boolean;
  is_active: boolean;
  average_rating: number;
  review_count: number;
}

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface MovingBooking {
  id: number;
  company: number;
  customer: number;
  customer_name: string;
  moving_date: string;
  moving_time: string;
  pickup_address: string;
  delivery_address: string;
  status: BookingStatus;
  estimated_price: string | null;
  notes: string;
  created_at: string;
}

export interface MovingBookingCreateRequest {
  company: number;
  moving_date: string;
  moving_time: string;
  pickup_address: string;
  delivery_address: string;
  notes?: string;
}

export interface MovingCompanyReview {
  id: number;
  company: number;
  reviewer: number;
  reviewer_name: string;
  booking: number | null;
  rating: number;
  comment: string;
  created_at: string;
}

export interface MovingCompanyReviewCreateRequest {
  rating: number;
  comment: string;
  booking?: number;
}

// ── Neighborhood Insights ──

export type InsightType =
  | "school"
  | "hospital"
  | "safety"
  | "transit"
  | "restaurant"
  | "other";

export interface NeighborhoodInsight {
  id: number;
  property: number;
  insight_type: InsightType;
  name: string;
  address: string;
  distance_km: string;
  rating: string;
  lat: string;
  lng: string;
  notes: string;
  added_by: number;
  added_by_name: string;
  created_at: string;
}

export interface NeighborhoodInsightCreateRequest {
  insight_type: InsightType;
  name: string;
  address?: string;
  distance_km?: string;
  rating?: string;
  lat?: string;
  lng?: string;
  notes?: string;
}

// ── Saved Searches ──

export interface SavedSearchFilters {
  price_min?: number;
  price_max?: number;
  bedrooms?: number;
  bathrooms?: number;
  property_type?: string;
  amenities?: string;
  parking?: boolean;
  lat?: number;
  lng?: number;
  radius_km?: number;
}

export interface SavedSearch {
  id: number;
  name: string;
  filters: SavedSearchFilters;
  notify_on_match: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavedSearchCreateRequest {
  name: string;
  filters: SavedSearchFilters;
  notify_on_match: boolean;
}

// ── Public Unit Search Params ──

export interface PublicUnitSearchParams {
  price_min?: number;
  price_max?: number;
  bedrooms?: number;
  bathrooms?: number;
  property_type?: string;
  amenities?: string;
  parking_space?: boolean;
  lat?: number;
  lng?: number;
  radius_km?: number;
}

// ── Role-Specific Dashboards ──

export interface AdminDashboard {
  users: {
    total: number;
    by_role: Record<string, number>;
    new_last_30_days: number;
  };
  properties: {
    total: number;
    total_units: number;
    occupied: number;
    vacant: number;
    occupancy_rate: string;
  };
  billing: {
    revenue_this_month: string;
    outstanding: string;
    overdue_invoices: number;
  };
  maintenance: {
    submitted: number;
    open: number;
    assigned: number;
    in_progress: number;
    completed_this_month: number;
  };
  disputes: {
    open: number;
    under_review: number;
  };
  moving: {
    total_companies: number;
    pending_bookings: number;
    completed_this_month: number;
  };
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: number;
  role_name: string;
  is_active: boolean;
  is_staff: boolean;
  date_joined: string;
}

export interface RoleChangeLog {
  id: number;
  user: number;
  user_username: string;
  changed_by: number;
  changed_by_username: string;
  old_role: number;
  old_role_name: string;
  new_role: number;
  new_role_name: string;
  changed_at: string;
  reason: string;
}

export interface AdminUserDetail {
  user: AdminUser;
  role_change_history: RoleChangeLog[];
}

export interface ModerationReview {
  id: number;
  type: "property" | "tenant";
  reviewer: number;
  reviewer_name: string;
  subject_id: number;
  subject_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface TenantDashboard {
  active_lease: {
    id: number;
    unit: string;
    property: string;
    rent_amount: string;
    start_date: string;
    end_date: string;
    days_remaining: number;
  } | null;
  invoices: {
    pending: number;
    overdue: number;
    next_due: {
      id: number;
      due_date: string;
      amount: string;
      status: string;
    } | null;
  };
  maintenance: {
    open_requests: number;
  };
  notifications: {
    unread: number;
  };
}

export interface ArtisanDashboard {
  trade: string;
  open_jobs: {
    count: number;
    items: {
      id: number;
      title: string;
      category: string;
      priority: string;
      property: number;
      created_at: string;
    }[];
  };
  active_bids: {
    count: number;
    items: {
      id: number;
      request_id: number;
      request_title: string;
      proposed_price: string;
      status: string;
      created_at: string;
    }[];
  };
  completed_this_month: number;
}

export interface AgentDashboard {
  assigned_properties: {
    count: number;
    total_units: number;
    occupied_units: number;
    occupancy_rate: string;
    items: {
      id: number;
      name: string;
      property_type: string;
      total_units: number;
      occupied_units: number;
    }[];
  };
  pending_applications: number;
  open_maintenance_requests: number;
  active_disputes: number;
}

export interface MovingCompanyDashboard {
  company_name: string;
  is_verified: boolean;
  bookings: {
    pending: number;
    confirmed: number;
    in_progress: number;
    completed_this_month: number;
    cancelled: number;
    total: number;
  };
  reviews: {
    total: number;
    average_rating: number;
    recent: {
      id: number;
      reviewer_name: string;
      rating: number;
      comment: string;
      created_at: string;
    }[];
  };
}

// ── Tenant Application (nested shape returned by /api/property/applications/ for tenants) ──

export interface TenantApplicationItem {
  id: number;
  unit: {
    unit_number: string;
    property: { name: string };
  };
  status: ApplicationStatus;
  message: string;
  created_at: string;
}

// ── Public Unit Search (shape returned by /api/property/units/public/) ──

export interface PublicUnit {
  id: number;
  property: number;
  name: string;
  floor?: string;
  description?: string;
  bedrooms: number;
  bathrooms: number;
  price: string;
  service_charge?: string;
  security_deposit?: string;
  amenities: string;
  parking_space: boolean;
  parking_slots?: number;
  is_occupied: boolean;
  is_public?: boolean;
  tour_url?: string;
  created_at?: string;
  updated_at?: string;
  /** Present when API embeds unit images on public listing responses */
  images?: UnitImage[];
}

// ── Lightweight User Profile Lookup ──

export interface UserProfile {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
}

// ── Maintenance Timeline ──

export interface MaintenanceTimelineEvent {
  event_type: string;
  description: string;
  actor: string;
  created_at: string;
}

// ── Monitoring (Admin only) ──

export type MetricType =
  | "overdue_invoice_count"
  | "monthly_revenue"
  | "occupancy_rate"
  | "open_maintenance_count"
  | "open_dispute_count"
  | "pending_application_count"
  | "payment_success_rate";

export interface SystemMetric {
  id: number;
  metric_type: MetricType;
  value: string;
  recorded_at: string;
}

export type AlertCondition = "gt" | "gte" | "lt" | "lte";
export type AlertSeverity = "info" | "warning" | "critical";
export type AlertInstanceStatus = "triggered" | "acknowledged" | "resolved";

export interface AlertRule {
  id: number;
  name: string;
  description: string;
  metric_type: MetricType;
  condition: AlertCondition;
  threshold_value: string;
  severity: AlertSeverity;
  enabled: boolean;
  created_by: number | null;
  created_at: string;
}

export interface AlertRuleCreateRequest {
  name: string;
  description?: string;
  metric_type: MetricType;
  condition: AlertCondition;
  threshold_value: string;
  severity: AlertSeverity;
  enabled?: boolean;
}

export interface AlertInstance {
  id: number;
  rule: number;
  rule_name: string;
  rule_severity: AlertSeverity;
  rule_metric_type: MetricType;
  status: AlertInstanceStatus;
  triggered_at: string;
  triggered_value: string;
  acknowledged_by: number | null;
  acknowledged_by_username: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  note: string;
}

export interface MonitoringDashboard {
  health_status: "healthy" | "warning" | "critical";
  active_alert_counts: {
    critical: number;
    warning: number;
    info: number;
  };
  latest_metrics: Record<string, { value: string; recorded_at: string }>;
  top_active_alerts: AlertInstance[];
  trends: Record<string, { value: string; recorded_at: string }[]>;
}

export interface ImpersonationLog {
  id: number;
  admin: number;
  admin_username: string;
  target_user: number;
  target_username: string;
  target_role: string;
  path: string;
  method: string;
  timestamp: string;
}

// ── Errors ──

export interface ApiErrorDetail {
  detail?: string;
  [field: string]: string | string[] | undefined;
}
