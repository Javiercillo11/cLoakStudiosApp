import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, BookOpen, ChevronRight, Paperclip, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useTable } from '../hooks/useTable'
import { supabase } from '../lib/supabase'
import type { DocSection } from '../lib/types'
import { removeAttachmentsFor } from '../lib/attachments'
import { formatDate } from '../lib/format'
import { PageHeader } from '../components/PageHeader'
import { StateMessage } from '../components/StateMessage'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { FieldError } from '../components/Accordion'
import { UnsavedChangesDialog, useWarnOnUnload } from '../components/UnsavedChangesDialog'
import { AttachmentsPanel, uploadPending } from '../components/AttachmentsPanel'

type Row = DocSection & { attachments: { count: number }[] }

const fileCount = (s: Row) => s.attachments?.[0]?.count ?? 0
const plural = (n: number) => `${n} ${n === 1 ? 'fichero' : 'ficheros'}`

function SectionForm({ open, section, nextPosition, onClose, onSaved }: {
  open: boolean
  section: Row | null
  nextPosition: number
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [pending, setPending] = useState<File[]>([])
  const [titleError, setTitleError] = useState<string>()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const id = section?.id ?? createdId
  /** Cambios sin guardar respecto a lo último guardado */
  const [saved, setSaved] = useState('')
  const [askSave, setAskSave] = useState(false)
  const snap = (t: string, d: string, files: number) => JSON.stringify([t.trim(), d.trim(), files])
  const dirty = open && snap(title, description, pending.length) !== saved
  useWarnOnUnload(dirty)
  const requestClose = () => (dirty ? setAskSave(true) : onClose())

  useEffect(() => {
    if (!open) return
    setTitle(section?.title ?? '')
    setDescription(section?.description ?? '')
    setPending([])
    setTitleError(undefined)
    setError(null)
    setCreatedId(null)
    setSaved(snap(section?.title ?? '', section?.description ?? '', 0))
    setAskSave(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, section])

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!title.trim()) {
      setTitleError('El título es obligatorio.')
      document.getElementById('s-title')?.focus()
      return
    }
    setTitleError(undefined)
    setSaving(true)
    setError(null)
    try {
      const values = { title: title.trim(), description: description.trim() }
      const savedSnap = snap(title, description, 0)
      let sid = id
      if (sid) {
        const { error } = await supabase.from('doc_sections').update(values).eq('id', sid)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('doc_sections').insert({ ...values, position: nextPosition }).select('id').single()
        if (error) throw error
        sid = data.id as string
        setCreatedId(sid)
      }
      if (pending.length) {
        const failed = await uploadPending({ kind: 'section', id: sid! }, pending)
        setPending([])
        if (failed.length) {
          setSaved(savedSnap)
          await onSaved()
          setError(`Sección guardada, pero algunos ficheros no se subieron:\n${failed.join('\n')}`)
          return
        }
      }
      setSaved(savedSnap)
      await onSaved()
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title={section ? 'Editar sección' : 'Nueva sección'} onClose={requestClose}>
      <form onSubmit={submit} noValidate>
        <label className="label" htmlFor="s-title">Título <span className="text-danger">*</span></label>
        <input id="s-title" className="input" value={title} aria-invalid={!!titleError}
          aria-describedby={titleError ? 's-title-err' : undefined} onChange={(e) => setTitle(e.target.value)} />
        <FieldError id="s-title-err" message={titleError} />

        <label className="label mt-4" htmlFor="s-desc">Descripción <span className="text-muted">(opcional)</span></label>
        <textarea id="s-desc" rows={3} className="input resize-y" value={description}
          onChange={(e) => setDescription(e.target.value)} />

        <p className="label mt-4">Archivos adjuntos</p>
        <AttachmentsPanel idPrefix="s-files" owner={id ? { kind: 'section', id } : null}
          pending={pending} onPendingChange={setPending} />

        {error && <p className="mt-4 whitespace-pre-line text-sm text-danger" role="alert">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={requestClose} className="btn-ghost flex-1 sm:flex-none">{createdId ? 'Cerrar' : 'Cancelar'}</button>
          <button type="submit" className="btn-primary flex-1 sm:flex-none" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>

      <UnsavedChangesDialog open={askSave} saving={saving}
        onCancel={() => setAskSave(false)}
        onDiscard={() => { setAskSave(false); onClose() }}
        onSave={() => { setAskSave(false); submit() }} />
    </Modal>
  )
}

export function Documentation() {
  const sections = useTable<Row>('doc_sections', '*, attachments(count)')
  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<Row | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  /** Orden manual (position) y, a igualdad, por fecha de alta */
  const ordered = useMemo(
    () => [...sections.rows].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at)),
    [sections.rows],
  )
  const q = query.trim().toLowerCase()
  const visible = q ? ordered.filter((s) => [s.title, s.description].some((v) => v.toLowerCase().includes(q))) : ordered
  const viewing = sections.rows.find((s) => s.id === viewingId) ?? null
  const nextPosition = ordered.length ? Math.max(...ordered.map((s) => s.position)) + 1 : 0

  const openNew = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (s: Row) => { setViewingId(null); setEditing(s); setFormOpen(true) }

  /** Mueve una sección arriba/abajo y renumera las posiciones */
  const move = async (s: Row, dir: -1 | 1) => {
    const list = [...ordered]
    const i = list.findIndex((x) => x.id === s.id)
    const j = i + dir
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    const changes = list.map((x, pos) => ({ id: x.id, pos })).filter(({ id, pos }) => sections.rows.find((r) => r.id === id)?.position !== pos)
    try {
      const results = await Promise.all(changes.map(({ id, pos }) => supabase.from('doc_sections').update({ position: pos }).eq('id', id)))
      const failed = results.find((r) => r.error)
      if (failed?.error) throw failed.error
      setActionError(null)
    } catch (err) {
      setActionError((err as Error).message)
    }
    await sections.reload()
  }

  const remove = async (s: Row) => {
    try {
      await removeAttachmentsFor({ kind: 'section', id: s.id })
      await sections.remove(s.id)
      setToDelete(null)
      setViewingId(null)
      setActionError(null)
    } catch (err) {
      setToDelete(null)
      setActionError((err as Error).message)
    }
  }

  return (
    <>
      <PageHeader eyebrow="Recursos" title="Documentación"
        action={<button onClick={openNew} className="btn-primary"><Plus size={16} /> Nueva sección</button>} />

      {sections.rows.length > 0 && (
        <div className="relative mb-4 sm:mb-5">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input type="search" placeholder="Buscar sección…" aria-label="Buscar secciones"
            className="input pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      )}

      {actionError && <p className="mb-4 text-sm text-danger" role="alert">{actionError}</p>}

      {sections.error ? (
        <StateMessage title="No se pudo cargar la documentación" tone="error">{sections.error}</StateMessage>
      ) : sections.loading ? (
        <StateMessage title="Cargando…" />
      ) : visible.length === 0 ? (
        <StateMessage title={sections.rows.length ? 'Sin resultados' : 'Aún no hay secciones'}>
          {sections.rows.length ? 'Prueba con otra búsqueda.' : 'Organiza tu documentación en secciones con el botón «Nueva sección».'}
        </StateMessage>
      ) : (
        <ol className="grid gap-3 sm:gap-4 lg:grid-cols-2">
          {visible.map((s) => {
            const idx = ordered.findIndex((x) => x.id === s.id)
            return (
              <li key={s.id} className="card relative flex flex-col p-4 transition-colors hover:bg-white/[0.02] sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-violet/15 text-violet-soft">
                    <BookOpen size={17} />
                  </span>
                  <button type="button" onClick={() => setViewingId(s.id)}
                    className="min-w-0 flex-1 text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
                    <span className="block break-words font-semibold">{s.title}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      <Paperclip size={12} /> {plural(fileCount(s))} · {formatDate(s.updated_at)}
                    </span>
                  </button>
                  <ChevronRight size={18} className="mt-2 shrink-0 text-muted" aria-hidden />
                </div>
                {s.description && <p className="mt-3 line-clamp-2 whitespace-pre-line text-sm text-muted">{s.description}</p>}
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/5 pt-2">
                  <div className="relative z-10 -ml-2 flex">
                    <button type="button" onClick={() => move(s, -1)} disabled={!!q || idx === 0} className="btn-icon"
                      aria-label={`Subir ${s.title}`} title="Subir"><ArrowUp size={16} /></button>
                    <button type="button" onClick={() => move(s, 1)} disabled={!!q || idx === ordered.length - 1} className="btn-icon"
                      aria-label={`Bajar ${s.title}`} title="Bajar"><ArrowDown size={16} /></button>
                  </div>
                  <div className="relative z-10 -mr-2 flex">
                    <button type="button" onClick={() => openEdit(s)} className="btn-icon" aria-label={`Editar ${s.title}`}><Pencil size={16} /></button>
                    <button type="button" onClick={() => setToDelete(s)} className="btn-icon hover:text-danger" aria-label={`Eliminar ${s.title}`}><Trash2 size={16} /></button>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      <SectionForm open={formOpen} section={editing} nextPosition={nextPosition}
        onClose={() => { setFormOpen(false); sections.reload() }} onSaved={sections.reload} />

      <Modal open={!!viewing} title={viewing?.title ?? ''} onClose={() => { setViewingId(null); sections.reload() }}>
        {viewing && (
          <>
            {viewing.description ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-ghost/90 [overflow-wrap:anywhere]">{viewing.description}</p>
            ) : (
              <p className="text-sm text-muted">Sin descripción.</p>
            )}
            <section className="mt-5 border-t border-white/5 pt-5" aria-labelledby="section-files">
              <h3 id="section-files" className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Paperclip size={16} className="text-violet-soft" /> Archivos adjuntos
              </h3>
              <AttachmentsPanel idPrefix="sv-files" owner={{ kind: 'section', id: viewing.id }} />
            </section>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button onClick={() => setToDelete(viewing)} className="btn-danger mr-auto"><Trash2 size={16} /> Eliminar</button>
              <button onClick={() => { setViewingId(null); sections.reload() }} className="btn-ghost">Cerrar</button>
              <button onClick={() => openEdit(viewing)} className="btn-primary"><Pencil size={16} /> Editar</button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog open={!!toDelete} title="Eliminar sección"
        message={`¿Eliminar la sección "${toDelete?.title}" y sus ${plural(toDelete ? fileCount(toDelete) : 0)}? Esta acción no se puede deshacer.`}
        onCancel={() => setToDelete(null)} onConfirm={() => { if (toDelete) remove(toDelete) }} />
    </>
  )
}
