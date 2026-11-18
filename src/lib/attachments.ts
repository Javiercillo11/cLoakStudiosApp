import { supabase } from './supabase'
import type { Attachment } from './types'

/**
 * Ficheros adjuntos (proyectos y secciones de Documentación).
 * El binario se guarda en Supabase Storage (bucket privado "attachments"); en la tabla
 * public.attachments solo van los metadatos. Rutas: {uid}/projects/{id}/{uuid}.{ext}
 * y {uid}/sections/{id}/{uuid}.{ext}. Las políticas de RLS y Storage están en
 * supabase/migrations/003_project_extras.sql.
 */
export const BUCKET = 'attachments'

/** Límite por fichero en MB (VITE_MAX_FILE_MB). El bucket rechaza igualmente > 20 MB. */
const SERVER_MAX_MB = 20
const envMax = Number((import.meta.env?.VITE_MAX_FILE_MB as string | undefined) ?? '')
export const MAX_FILE_MB = envMax > 0 ? Math.min(envMax, SERVER_MAX_MB) : SERVER_MAX_MB
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024

export type FileKind = 'image' | 'pdf' | 'excel'

/** Extensión → tipo MIME canónico y familia */
export const ALLOWED: Record<string, { mime: string; kind: FileKind; label: string }> = {
  jpg: { mime: 'image/jpeg', kind: 'image', label: 'JPG' },
  jpeg: { mime: 'image/jpeg', kind: 'image', label: 'JPEG' },
  png: { mime: 'image/png', kind: 'image', label: 'PNG' },
  webp: { mime: 'image/webp', kind: 'image', label: 'WEBP' },
  pdf: { mime: 'application/pdf', kind: 'pdf', label: 'PDF' },
  xls: { mime: 'application/vnd.ms-excel', kind: 'excel', label: 'XLS' },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', kind: 'excel', label: 'XLSX' },
}

/** Valor para <input type="file" accept> */
export const ACCEPT = Object.keys(ALLOWED).map((e) => `.${e}`).join(',') + ',' +
  [...new Set(Object.values(ALLOWED).map((a) => a.mime))].join(',')

/** MIME que algunos navegadores/sistemas dan a estos ficheros y aceptamos como equivalentes */
const MIME_ALIASES: Record<string, string[]> = {
  'image/jpeg': ['image/jpg', 'image/pjpeg'],
  'application/vnd.ms-excel': ['application/msexcel', 'application/x-msexcel', 'application/x-excel', 'application/excel', 'application/x-ms-excel'],
  'application/pdf': ['application/x-pdf'],
}
/** MIME genéricos con los que se decide solo por la extensión */
const GENERIC_MIME = ['', 'application/octet-stream', 'binary/octet-stream', 'application/zip', 'application/x-zip-compressed']

export function extensionOf(name: string) {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

export function kindOfMime(mime: string): FileKind | null {
  return Object.values(ALLOWED).find((a) => a.mime === mime)?.kind ?? null
}

export const isImage = (a: Pick<Attachment, 'mime_type'>) => kindOfMime(a.mime_type) === 'image'

export function typeLabel(a: Pick<Attachment, 'file_name' | 'mime_type'>) {
  return ALLOWED[extensionOf(a.file_name)]?.label ?? a.mime_type
}

export type FileCheck = { ok: true; mime: string; kind: FileKind } | { ok: false; error: string }

/** Valida extensión, tipo MIME declarado y tamaño. Devuelve el MIME canónico a usar al subir. */
export function validateFile(file: { name: string; type: string; size: number }): FileCheck {
  const ext = extensionOf(file.name)
  const rule = ALLOWED[ext]
  if (!rule) return { ok: false, error: `Formato no admitido (.${ext || '?'}). Usa JPG, PNG, WEBP, PDF, XLS o XLSX.` }
  const declared = (file.type || '').toLowerCase()
  const matches = declared === rule.mime || (MIME_ALIASES[rule.mime] ?? []).includes(declared) || GENERIC_MIME.includes(declared)
  if (!matches) return { ok: false, error: `El contenido (${declared}) no corresponde a un fichero .${ext}.` }
  if (file.size <= 0) return { ok: false, error: 'El fichero está vacío.' }
  if (file.size > MAX_FILE_BYTES) return { ok: false, error: `Supera el tamaño máximo de ${MAX_FILE_MB} MB.` }
  return { ok: true, mime: rule.mime, kind: rule.kind }
}

export type Owner = { kind: 'project' | 'section'; id: string }

const ownerColumn = (o: Owner) => (o.kind === 'project' ? 'project_id' : 'section_id')
const ownerFolder = (o: Owner) => (o.kind === 'project' ? 'projects' : 'sections')

async function currentUserId() {
  const { data } = await supabase.auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new Error('La sesión ha caducado. Vuelve a iniciar sesión.')
  return id
}

export async function listAttachments(owner: Owner) {
  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq(ownerColumn(owner), owner.id)
    .order('uploaded_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Attachment[]
}

/** Sube el fichero a Storage y crea sus metadatos. Si falla lo segundo, borra el fichero subido. */
export async function uploadAttachment(owner: Owner, file: File): Promise<Attachment> {
  const check = validateFile(file)
  if (!check.ok) throw new Error(check.error)
  const uid = await currentUserId()
  const id = crypto.randomUUID()
  const path = `${uid}/${ownerFolder(owner)}/${owner.id}/${id}.${extensionOf(file.name)}`

  const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: check.mime, upsert: false })
  if (up.error) throw new Error(up.error.message)

  const { data, error } = await supabase
    .from('attachments')
    .insert({
      id,
      [ownerColumn(owner)]: owner.id,
      file_name: file.name,
      storage_path: path,
      mime_type: check.mime,
      size: file.size,
    })
    .select('*')
    .single()
  if (error) {
    await supabase.storage.from(BUCKET).remove([path])
    throw new Error(error.message)
  }
  return data as Attachment
}

/** Borra el fichero de Storage y después sus metadatos. */
export async function deleteAttachment(a: Attachment) {
  const rm = await supabase.storage.from(BUCKET).remove([a.storage_path])
  if (rm.error) throw new Error(rm.error.message)
  const { error } = await supabase.from('attachments').delete().eq('id', a.id)
  if (error) throw new Error(error.message)
}

/**
 * Borra de Storage todos los ficheros de un proyecto o sección (antes de borrarlo:
 * sus metadatos caen después por ON DELETE CASCADE).
 */
export async function removeAttachmentsFor(owner: Owner) {
  const list = await listAttachments(owner)
  if (!list.length) return
  const rm = await supabase.storage.from(BUCKET).remove(list.map((a) => a.storage_path))
  if (rm.error) throw new Error(rm.error.message)
}

/** URL firmada (60 s) que fuerza la descarga con el nombre original. */
export async function downloadUrl(a: Attachment) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(a.storage_path, 60, { download: a.file_name })
  if (error) throw new Error(error.message)
  return data.signedUrl
}

/** Descarga el fichero conservando su nombre original. */
export async function downloadAttachment(a: Attachment) {
  const url = await downloadUrl(a)
  const link = document.createElement('a')
  link.href = url
  link.download = a.file_name
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

/** URLs firmadas (1 h) para ver imágenes dentro de la app. Solo imágenes. */
export async function imageUrls(list: Attachment[]): Promise<Record<string, string>> {
  const images = list.filter(isImage)
  if (!images.length) return {}
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(images.map((a) => a.storage_path), 3600)
  if (error) throw new Error(error.message)
  const byPath = new Map((data ?? []).map((d) => [d.path, d.signedUrl]))
  return Object.fromEntries(images.map((a) => [a.id, byPath.get(a.storage_path) ?? '']).filter(([, u]) => u))
}

/** Bytes ocupados por todos los adjuntos del usuario (para el aviso de almacenamiento). */
export async function storageUsedBytes() {
  const { data, error } = await supabase.rpc('attachments_total_size')
  if (error) throw new Error(error.message)
  return Number(data ?? 0)
}

/** Cuota de almacenamiento en bytes (VITE_STORAGE_QUOTA_MB, 1 GB por defecto = plan gratuito de Supabase). */
const envQuota = Number((import.meta.env?.VITE_STORAGE_QUOTA_MB as string | undefined) ?? '')
export const STORAGE_QUOTA_BYTES = (envQuota > 0 ? envQuota : 1024) * 1024 * 1024
export const STORAGE_WARN_RATIO = 0.8
