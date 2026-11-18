import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Download, FileSpreadsheet, FileText, Image as ImageIcon, Loader2, Trash2, Upload, X } from 'lucide-react'
import type { Attachment } from '../lib/types'
import {
  ACCEPT, MAX_FILE_MB, deleteAttachment, downloadAttachment, imageUrls, isImage, kindOfMime, listAttachments,
  typeLabel, uploadAttachment, validateFile, type Owner,
} from '../lib/attachments'
import { formatBytes, formatDate } from '../lib/format'
import { ConfirmDialog } from './ConfirmDialog'
import { ImageLightbox } from './ImageLightbox'

export function FileTypeIcon({ mime, size = 20 }: { mime: string; size?: number }) {
  const kind = kindOfMime(mime)
  if (kind === 'excel') return <FileSpreadsheet size={size} className="shrink-0 text-success" aria-hidden />
  if (kind === 'pdf') return <FileText size={size} className="shrink-0 text-danger" aria-hidden />
  return <ImageIcon size={size} className="shrink-0 text-violet-soft" aria-hidden />
}

const pendingMime = (f: File) => {
  const c = validateFile(f)
  return c.ok ? c.mime : f.type
}

type Props = {
  /** Proyecto o sección ya guardados. Si es null, los ficheros quedan en cola hasta guardar. */
  owner: Owner | null
  /** Cola de ficheros (modo sin guardar) */
  pending?: File[]
  onPendingChange?: (files: File[]) => void
  /** Avisa del número de ficheros (para insignias) */
  onCount?: (n: number) => void
  /** Prefijo para ids únicos en la página */
  idPrefix: string
}

/**
 * Ficheros adjuntos: subir varios, descargar (nombre original), eliminar con confirmación.
 * Solo las imágenes tienen miniatura y vista ampliada; PDF y Excel solo se descargan.
 */
export function AttachmentsPanel({ owner, pending = [], onPendingChange, onCount, idPrefix }: Props) {
  const [items, setItems] = useState<Attachment[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(!!owner)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string[]>([])
  const [errors, setErrors] = useState<{ name: string; error: string }[]>([])
  const [toDelete, setToDelete] = useState<Attachment | null>(null)
  const [viewing, setViewing] = useState<Attachment | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const ownerKey = owner ? `${owner.kind}:${owner.id}` : ''

  const load = useCallback(async () => {
    if (!owner) return
    try {
      const list = await listAttachments(owner)
      setItems(list)
      setLoadError(null)
      setUrls(await imageUrls(list))
    } catch (err) {
      setLoadError((err as Error).message)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerKey])

  useEffect(() => { load() }, [load])

  const count = owner ? items.length : pending.length
  useEffect(() => { onCount?.(count) }, [count, onCount])

  const addFiles = async (files: File[]) => {
    const bad: { name: string; error: string }[] = []
    const good: File[] = []
    for (const f of files) {
      const check = validateFile(f)
      if (check.ok) good.push(f)
      else bad.push({ name: f.name, error: check.error })
    }
    setErrors(bad)
    if (!good.length) return
    if (!owner) {
      onPendingChange?.([...pending, ...good])
      return
    }
    setUploading(good.map((f) => f.name))
    // Subidas en paralelo; cada fichero es independiente
    const results = await Promise.allSettled(good.map((f) => uploadAttachment(owner, f)))
    results.forEach((r, i) => {
      if (r.status === 'rejected') bad.push({ name: good[i].name, error: (r.reason as Error).message })
    })
    setErrors([...bad])
    setUploading([])
    await load()
  }

  const remove = async () => {
    const a = toDelete
    setToDelete(null)
    if (!a) return
    try {
      await deleteAttachment(a)
      setItems((cur) => cur.filter((x) => x.id !== a.id))
    } catch (err) {
      setErrors([{ name: a.file_name, error: (err as Error).message }])
      await load()
    }
  }

  const download = async (a: Attachment) => {
    try {
      await downloadAttachment(a)
    } catch (err) {
      setErrors([{ name: a.file_name, error: (err as Error).message }])
    }
  }

  const images = items.filter(isImage)
  const docs = items.filter((a) => !isImage(a))

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input ref={inputRef} id={`${idPrefix}-file`} type="file" multiple accept={ACCEPT} className="sr-only"
          onChange={(e) => { const files = Array.from(e.target.files ?? []); e.target.value = ''; addFiles(files) }} />
        <button type="button" onClick={() => inputRef.current?.click()} className="btn-ghost border border-dashed border-white/15"
          disabled={uploading.length > 0}>
          {uploading.length ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading.length ? `Subiendo ${uploading.length}…` : 'Subir ficheros'}
        </button>
        <p className="text-xs text-muted">JPG, PNG, WEBP, PDF, XLS o XLSX · máx. {MAX_FILE_MB} MB</p>
      </div>

      {errors.length > 0 && (
        <ul role="alert" className="mt-3 flex flex-col gap-1 rounded-control bg-danger/10 p-3 text-xs text-danger">
          {errors.map((e, i) => (
            <li key={i} className="flex gap-1.5"><AlertCircle size={14} className="mt-px shrink-0" />
              <span className="min-w-0 [overflow-wrap:anywhere]"><strong className="font-medium">{e.name}</strong>: {e.error}</span></li>
          ))}
        </ul>
      )}

      {!owner ? (
        pending.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Sin ficheros. Se subirán al guardar.</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/5 rounded-control border border-white/5">
            {pending.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center gap-3 px-3 py-2">
                <FileTypeIcon mime={pendingMime(f)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{f.name}</span>
                  <span className="block text-xs text-muted">{formatBytes(f.size)} · pendiente de subir</span>
                </span>
                <button type="button" className="btn-icon hover:text-danger" aria-label={`Quitar ${f.name}`}
                  onClick={() => onPendingChange?.(pending.filter((_, j) => j !== i))}><X size={16} /></button>
              </li>
            ))}
          </ul>
        )
      ) : loadError ? (
        <p className="mt-3 text-sm text-danger">No se pudieron cargar los ficheros: {loadError}</p>
      ) : loading ? (
        <p className="mt-3 text-sm text-muted">Cargando ficheros…</p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Todavía no hay ficheros.</p>
      ) : (
        <>
          {images.length > 0 && (
            <ul className="mt-4 grid grid-cols-2 gap-3 min-[480px]:grid-cols-3" aria-label="Imágenes">
              {images.map((a) => (
                <li key={a.id} className="min-w-0 overflow-hidden rounded-control border border-white/5 bg-obsidian">
                  <button type="button" onClick={() => setViewing(a)} aria-label={`Ver ${a.file_name} ampliada`}
                    className="block aspect-[4/3] w-full overflow-hidden bg-white/5">
                    {urls[a.id] ? (
                      <img src={urls[a.id]} alt="" loading="lazy" className="h-full w-full object-cover transition-transform hover:scale-105" />
                    ) : (
                      <span className="grid h-full place-items-center"><ImageIcon size={24} className="text-muted" /></span>
                    )}
                  </button>
                  <div className="flex items-start gap-1 p-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium" title={a.file_name}>{a.file_name}</p>
                      <p className="truncate text-[11px] text-muted">{typeLabel(a)} · {formatBytes(a.size)} · {formatDate(a.uploaded_at)}</p>
                    </div>
                    <button type="button" onClick={() => download(a)} className="btn-icon -my-1 h-8 w-8 sm:h-8 sm:w-8" aria-label={`Descargar ${a.file_name}`} title="Descargar"><Download size={15} /></button>
                    <button type="button" onClick={() => setToDelete(a)} className="btn-icon -my-1 -mr-1 h-8 w-8 hover:text-danger sm:h-8 sm:w-8" aria-label={`Eliminar ${a.file_name}`} title="Eliminar"><Trash2 size={15} /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {docs.length > 0 && (
            <ul className="mt-4 divide-y divide-white/5 rounded-control border border-white/5" aria-label="Documentos">
              {docs.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-white/5">
                    <FileTypeIcon mime={a.mime_type} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm" title={a.file_name}>{a.file_name}</span>
                    <span className="block truncate text-xs text-muted">{typeLabel(a)} · {formatBytes(a.size)} · {formatDate(a.uploaded_at)}</span>
                  </span>
                  <button type="button" onClick={() => download(a)} className="btn-icon" aria-label={`Descargar ${a.file_name}`} title="Descargar"><Download size={16} /></button>
                  <button type="button" onClick={() => setToDelete(a)} className="btn-icon -mr-2 hover:text-danger" aria-label={`Eliminar ${a.file_name}`} title="Eliminar"><Trash2 size={16} /></button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <ImageLightbox url={viewing ? urls[viewing.id] ?? null : null} name={viewing?.file_name ?? ''}
        onClose={() => setViewing(null)} onDownload={() => viewing && download(viewing)} />

      <ConfirmDialog open={!!toDelete} title="Eliminar fichero"
        message={`¿Eliminar "${toDelete?.file_name}"? Esta acción no se puede deshacer.`}
        onCancel={() => setToDelete(null)} onConfirm={remove} />
    </div>
  )
}

/** Sube la cola de ficheros tras crear el proyecto o la sección. Devuelve los errores. */
export async function uploadPending(owner: Owner, files: File[]) {
  const results = await Promise.allSettled(files.map((f) => uploadAttachment(owner, f)))
  return results
    .map((r, i) => (r.status === 'rejected' ? `${files[i].name}: ${(r.reason as Error).message}` : null))
    .filter((x): x is string => !!x)
}
