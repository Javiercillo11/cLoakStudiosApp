export type ProjectStatus = 'nuevo' | 'en_desarrollo' | 'desplegado'

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  nuevo: 'Nuevo',
  en_desarrollo: 'En desarrollo',
  desplegado: 'Desplegado',
}
export const STATUSES = Object.keys(STATUS_LABEL) as ProjectStatus[]

export interface Service {
  id: string
  name: string
  description: string
  icon: string
  price: number
  created_at: string
}

export type PaymentMethod = 'efectivo' | 'bizum' | 'transferencia'

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  bizum: 'Bizum',
  transferencia: 'Transferencia',
}
export const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]

/** Hito de pago (se guarda en projects.payment_milestones, jsonb). */
export interface PaymentMilestone {
  id: string
  description: string
  /** Porcentaje del precio total, con 2 decimales como máximo. */
  percentage: number
  /** Fecha prevista (YYYY-MM-DD) o null */
  dueDate: string | null
  paid: boolean
  /** Momento en que se marcó como pagado (ISO) */
  paidAt?: string | null
}

/** Cargo adicional del proyecto (dietas, kilometraje…), en projects.extra_charges (jsonb) */
export interface ExtraCharge {
  id: string
  description: string
  /** Importe en euros, > 0 */
  amount: number
}

export interface Project {
  id: string
  client_name: string
  business_name: string
  description: string
  status: ProjectStatus
  created_at: string
  updated_at: string
  project_services: { service_id: string }[]
  // Contacto
  phone: string
  province: string
  city: string
  postal_code: string
  address: string
  // Condiciones contractuales
  payment_method: PaymentMethod | null
  payment_milestones: PaymentMilestone[]
  /** Precio final calculado: (servicios + cargos) − descuento. No se edita a mano. */
  total_price: number
  extra_charges: ExtraCharge[]
  /** % de descuento sobre servicios + cargos (0–100, 2 decimales) */
  discount_pct: number
}

export interface DocSection {
  id: string
  title: string
  description: string
  position: number
  created_at: string
  updated_at: string
}

export interface Attachment {
  id: string
  project_id: string | null
  section_id: string | null
  file_name: string
  storage_path: string
  mime_type: string
  size: number
  uploaded_at: string
}

export type NoteColor = 'violet' | 'lavender' | 'amber' | 'emerald' | 'rose' | 'sky'

export interface Note {
  id: string
  project_id: string | null
  content: string
  color: NoteColor
  created_at: string
}

// ───────────── Solicitudes de la web (tabla leads) ─────────────

export type LeadStatus = 'nuevo' | 'contactado' | 'convertido' | 'descartado'

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  nuevo: 'Nueva',
  contactado: 'Contactada',
  convertido: 'Convertida',
  descartado: 'Descartada',
}
export const LEAD_STATUSES = Object.keys(LEAD_STATUS_LABEL) as LeadStatus[]

export type LeadService = 'web' | 'app' | 'qr' | 'otro'

/** Mismos textos que el formulario de la web (SERVICE_LABELS) */
export const LEAD_SERVICE_LABEL: Record<LeadService, string> = {
  web: 'Página web para negocio',
  app: 'Aplicación de gestión',
  qr: 'QR para reseñas',
  otro: 'Otro / No estoy seguro',
}

/** Respuesta propia del servicio, en el orden del formulario */
export interface LeadDetail {
  label: string
  value: string
}

export interface Lead {
  id: string
  created_at: string
  updated_at: string
  status: LeadStatus
  service: LeadService
  name: string
  business: string
  email: string
  phone: string
  message: string
  details: LeadDetail[]
  project_id: string | null
}
