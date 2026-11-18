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
  price: number
  created_at: string
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
}

export type NoteColor = 'violet' | 'lavender' | 'amber' | 'emerald' | 'rose' | 'sky'

export interface Note {
  id: string
  content: string
  color: NoteColor
  created_at: string
}
