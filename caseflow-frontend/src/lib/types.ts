export type Role = "OWNER" | "MANAGER" | "EMPLOYEE" | "RECEPTION" | "VIEWER";

export type CaseStatus =
  | "NEW"
  | "IN_PROGRESS"
  | "WAITING_FOR_CLIENT"
  | "WAITING_FOR_GOVERNMENT"
  | "WAITING_FOR_PAYMENT"
  | "COMPLETED"
  | "CANCELLED"
  | "ARCHIVED";

export type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type PaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID" | "REFUNDED";

export type DocumentCategory =
  | "PASSPORT"
  | "CPR"
  | "PHOTOS"
  | "MEDICAL"
  | "CONTRACTS"
  | "INVOICES"
  | "GOVERNMENT_FORMS"
  | "OTHER";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  avatarUrl?: string | null;
}

export interface StaffUser extends User {
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  role?: Role;
  isActive?: boolean;
}

export interface Customer {
  id: string;
  fullName: string;
  nationality?: string | null;
  cpr?: string | null;
  passportNumber?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  employer?: string | null;
  notes?: string | null;
  profilePicture?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { cases: number };
  cases?: Case[];
}

export interface ChecklistItem {
  id: string;
  label: string;
  isMandatory: boolean;
  isCompleted: boolean;
  completedAt?: string | null;
  order: number;
}

export interface CaseStage {
  id: string;
  name: string;
  order: number;
  color?: string | null;
  enteredAt?: string | null;
  completedAt?: string | null;
  checklistItems: ChecklistItem[];
}

export interface TemplateChecklistItem {
  label: string;
  isMandatory: boolean;
  order: number;
}

export interface TemplateStage {
  id: string;
  name: string;
  order: number;
  color?: string | null;
  checklistItems: TemplateChecklistItem[];
}

export interface ServiceTemplate {
  id: string;
  name: string;
  description?: string | null;
  estimatedDays?: number | null;
  defaultPriority: Priority;
  isActive: boolean;
  templateStages: TemplateStage[];
}

export interface ServiceTemplateStageInput {
  name: string;
  order: number;
  color: string;
  checklistItems: TemplateChecklistItem[];
}

export interface ServiceTemplateInput {
  name: string;
  description?: string;
  estimatedDays?: number;
  defaultPriority: Priority;
  stages: ServiceTemplateStageInput[];
}

export interface Document {
  id: string;
  caseId: string;
  category: DocumentCategory;
  fileName: string;
  storageKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  version: number;
  createdAt: string;
}

export interface Task {
  id: string;
  caseId: string;
  title: string;
  description?: string | null;
  assignedUserId?: string | null;
  deadline?: string | null;
  priority: Priority;
  isCompleted: boolean;
  completedAt?: string | null;
}

export interface Payment {
  id: string;
  caseId: string;
  amount: string | number;
  method: string;
  invoiceNumber?: string | null;
  paidAt?: string | null;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  caseId: string;
  type: string;
  message: string;
  createdAt: string;
  actor?: { id: string; firstName: string; lastName: string } | null;
}

export interface Case {
  id: string;
  caseNumber: string;
  customerId: string;
  customer?: Customer;
  assignedEmployeeId?: string | null;
  assignedEmployee?: { id: string; firstName: string; lastName: string } | null;
  serviceTemplateId: string;
  serviceTemplate?: { id: string; name: string };
  currentCaseStageId?: string | null;
  currentCaseStage?: CaseStage | null;
  caseStages?: CaseStage[];
  priority: Priority;
  status: CaseStatus;
  dueDate?: string | null;
  description?: string | null;
  internalNotes?: string | null;
  governmentReferenceNumber?: string | null;
  governmentTrackingNumber?: string | null;
  paymentStatus: PaymentStatus;
  caseCost?: string | number | null;
  customerPrice?: string | number | null;
  isArchived: boolean;
  archivedAt?: string | null;
  documents?: Document[];
  tasks?: Task[];
  timelineEvents?: TimelineEvent[];
  payments?: Payment[];
  createdAt: string;
  updatedAt: string;
}

export interface OfficeInfo {
  name: string;
  phone: string;
  address: string;
  // Not settable from the UI yet (deliberately deferred) — the invoice
  // template already renders these if/when they show up in the setting.
  crNumber?: string;
  logoUrl?: string;
}

export interface PaginatedMeta {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginatedMeta;
}

export interface ApiError {
  success: false;
  error: { message: string; details?: unknown };
}

export interface DashboardSummary {
  activeCases: number;
  waitingForClient: number;
  waitingForGovernment: number;
  waitingForPayment: number;
  readyToDeliver: number;
  completedToday: number;
  completedThisMonth: number;
  overdueCases: number;
  urgentCases: number;
  upcomingDeadlines: number;
}

export interface DashboardCharts {
  casesByStatus: { status: string; count: number }[];
  casesByService: { service: string; count: number }[];
  monthlyCompletedCases: { month: string; count: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
}

export interface SearchResults {
  cases: (Case & { customer: { fullName: string } })[];
  customers: Customer[];
}
