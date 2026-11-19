import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Briefcase, FileSignature, MapPin, Paperclip, Plus, StickyNote, UserRound } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Note, PaymentMethod, Project, Service } from '../lib/types'
import { ServiceIcon } from '../lib/serviceIcons'
import { formatEUR, formatPct } from '../lib/format'
import {
  assignedHundredths, toDraft, toStored, validateMilestones, type MilestoneDraft,
} from '../lib/milestones'
import { Modal } from './Modal'
import { Dropdown } from './Dropdown'
import { NoteCard } from './NoteCard'
import { AccordionSection, FieldError } from './Accordion'
import { MilestonesEditor } from './MilestonesEditor'
import { AttachmentsPanel, uploadPending } from './AttachmentsPanel'
import { PricingEditor } from './PricingEditor'
import { UnsavedChangesDialog, useWarnOnUnload } from './UnsavedChangesDialog'
import {
  discountToStored, extraToDraft, extrasToStored, priceBreakdown, validatePricing, type ExtraDraft,
} from '../lib/pricing'

type SectionKey = 'general' | 'business' | 'contract' | 'notes' | 'files'

type Draft = {
  client_name: string
  business_name: string
  description: string
  serviceIds: string[]
  extras: ExtraDraft[]
  /** % de descuento tal cual se escribe */
  discount: string
  phone: string
  province: string
  city: string
  postal_code: string
  address: string
  payment_method: PaymentMethod | ''
  milestones: MilestoneDraft[]
}

const EMPTY: Draft = {
  client_name: '', business_name: '', description: '', serviceIds: [], extras: [], discount: '',
  phone: '', province: '', city: '', postal_code: '', address: '', payment_method: '', milestones: [],
}

/** Foto comparable del formulario para detectar cambios sin guardar */
const snapshot = (d: Draft, pendingFiles: number, newNote: string) =>
  JSON.stringify({ d, pendingFiles, newNote: newNote.trim() })

/** Campo → sección e id del input (para abrir la sección y enfocar el error) */
const FIELD: Record<string, { section: SectionKey; input: string }> = {
  client_name: { section: 'general', input: 'p-client' },
  pricing: { section: 'business', input: 'p-discount' },
  phone: { section: 'general', input: 'p-phone' },
  postal_code: { section: 'general', input: 'p-postal' },
  payment_method: { section: 'contract', input: 'p-method' },
  milestones: { section: 'contract', input: 'p-milestones-total' },
}

interface Props {
  open: boolean
  /** Proyecto a editar; null = alta */
  project: Project | null
  services: Service[]
  notes: Note[]
  onClose: () => void
  onSaved: () => Promise<void>
  onNoteSave: (id: string, values: Partial<Note>) => Promise<void>
  onNoteDelete: (n: Note) => void
  onNoteCreate: (values: Partial<Note>) => Promise<void>
  /** Solo en altas: datos de partida (p. ej. al convertir una solicitud de la web) */
  prefill?: Partial<Pick<Draft, 'client_name' | 'business_name' | 'phone' | 'description'>>
  /** Solo en altas: se llama en cuanto el proyecto existe en la base de datos */
  onCreated?: (id: string) => Promise<void>
}

export function ProjectForm({ open, project, services, notes, onClose, onSaved, onNoteSave, onNoteDelete, onNoteCreate, prefill, onCreated }: Props) {
  const serviceById = useMemo(() => new Map(services.map((s) => [s.id, s])), [services])
  const servicesSum = (ids: string[]) => ids.reduce((sum, id) => sum + Number(serviceById.get(id)?.price ?? 0), 0)

  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [sections, setSections] = useState<Record<SectionKey, boolean>>({ general: true, business: false, contract: false, notes: false, files: false })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showErrors, setShowErrors] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [newNote, setNewNote] = useState('')
  const [fileCount, setFileCount] = useState(0)
  /** Id del proyecto si se creó en este formulario pero falló algo después (p. ej. una subida) */
  const [createdId, setCreatedId] = useState<string | null>(null)
  const projectId = project?.id ?? createdId

  // Inicializa el borrador al abrir
  useEffect(() => {
    if (!open) return
    if (project) {
      const ids = project.project_services.map((x) => x.service_id)
      const initial: Draft = {
        client_name: project.client_name,
        business_name: project.business_name,
        description: project.description,
        serviceIds: ids,
        extras: (project.extra_charges ?? []).map(extraToDraft),
        discount: Number(project.discount_pct) ? String(Number(project.discount_pct)).replace('.', ',') : '',
        phone: project.phone ?? '',
        province: project.province ?? '',
        city: project.city ?? '',
        postal_code: project.postal_code ?? '',
        address: project.address ?? '',
        payment_method: project.payment_method ?? '',
        milestones: (project.payment_milestones ?? []).map(toDraft),
      }
      setDraft(initial)
      setSaved(snapshot(initial, 0, ''))
    } else {
      const initial: Draft = { ...EMPTY, ...prefill }
      setDraft(initial)
      setSaved(snapshot(initial, 0, ''))
    }
    setAskSave(false)
    setSections({ general: true, business: false, contract: false, notes: false, files: false })
    setErrors({})
    setShowErrors(false)
    setFormError(null)
    setPendingFiles([])
    setNewNote('')
    setCreatedId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project?.id])

  /** Cambios sin guardar: se compara con la foto del formulario al abrirlo (o tras el último guardado) */
  const [saved, setSaved] = useState('')
  const [askSave, setAskSave] = useState(false)
  const dirty = open && snapshot(draft, pendingFiles.length, newNote) !== saved
  useWarnOnUnload(dirty)
  const requestClose = () => (dirty ? setAskSave(true) : onClose())

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))

  const setServices = (serviceIds: string[]) => setDraft((d) => ({ ...d, serviceIds }))

  /** Precio total calculado: (servicios + cargos) − descuento */
  const breakdown = priceBreakdown(servicesSum(draft.serviceIds), draft.extras, draft.discount)
  const toggle = (k: SectionKey) => setSections((s) => ({ ...s, [k]: !s[k] }))

  const validate = (d: Draft) => {
    const e: Record<string, string> = {}
    if (!d.client_name.trim()) e.client_name = 'El nombre del cliente es obligatorio.'
    const pv = validatePricing(d.extras, d.discount)
    if (!pv.valid) {
      e.pricing = pv.discount ?? 'Revisa los cargos adicionales.'
      const firstExtra = d.extras.find((x) => pv.extras[x.id])
      if (firstExtra) FIELD.pricing.input = `x-${firstExtra.id}-${pv.extras[firstExtra.id].description ? 'desc' : 'amount'}`
      else FIELD.pricing.input = 'p-discount'
    }
    if (d.phone.trim() && !/^\+?[\d\s().-]{6,20}$/.test(d.phone.trim())) e.phone = 'Teléfono no válido.'
    if (d.postal_code.trim() && !/^\d{5}$/.test(d.postal_code.trim())) e.postal_code = 'El código postal debe tener 5 dígitos.'
    if (!d.payment_method) e.payment_method = 'Elige el método de pago.'
    const mv = validateMilestones(d.milestones)
    if (!mv.valid) e.milestones = mv.total ?? 'Revisa los hitos de pago.'
    return e
  }

  // Tras el primer intento de guardar, los errores se recalculan al escribir
  useEffect(() => {
    if (showErrors) setErrors(validate(draft))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, showErrors])

  const sectionHasError = (k: SectionKey) => showErrors && Object.keys(errors).some((f) => FIELD[f]?.section === k)

  const save = async (e?: FormEvent) => {
    e?.preventDefault()
    const errs = validate(draft)
    setErrors(errs)
    setShowErrors(true)
    const fields = Object.keys(errs)
    if (fields.length) {
      // Abre las secciones con errores (aunque estuvieran cerradas) y enfoca el primero
      setSections((s) => {
        const next = { ...s }
        for (const f of fields) next[FIELD[f].section] = true
        return next
      })
      setFormError('Revisa los campos marcados antes de guardar.')
      setTimeout(() => {
        const el = document.getElementById(FIELD[fields[0]].input)
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        if (el && 'focus' in el && el.tabIndex >= 0) el.focus({ preventScroll: true })
      }, 320) // tras la animación de apertura
      return
    }

    setSaving(true)
    setFormError(null)
    try {
      const values = {
        client_name: draft.client_name.trim(),
        business_name: draft.business_name.trim(),
        description: draft.description.trim(),
        phone: draft.phone.trim(),
        province: draft.province.trim(),
        city: draft.city.trim(),
        postal_code: draft.postal_code.trim(),
        address: draft.address.trim(),
        payment_method: draft.payment_method || null,
        payment_milestones: toStored(draft.milestones),
        extra_charges: extrasToStored(draft.extras),
        discount_pct: discountToStored(draft.discount),
        total_price: breakdown.total,
      }
      let id = projectId
      if (id) {
        const { error } = await supabase.from('projects').update(values).eq('id', id)
        if (error) throw error
        const del = await supabase.from('project_services').delete().eq('project_id', id)
        if (del.error) throw del.error
      } else {
        // Los proyectos nuevos siempre empiezan en estado "Nuevo"
        const { data, error } = await supabase.from('projects').insert({ ...values, status: 'nuevo' }).select('id').single()
        if (error) throw error
        id = data.id as string
        setCreatedId(id)
        await onCreated?.(id)
      }
      if (draft.serviceIds.length) {
        const { error } = await supabase
          .from('project_services')
          .insert(draft.serviceIds.map((service_id) => ({ project_id: id, service_id })))
        if (error) throw error
      }
      const problems: string[] = []
      if (newNote.trim()) {
        try {
          await onNoteCreate({ project_id: id, content: newNote.trim(), color: 'violet' })
          setNewNote('')
        } catch (err) {
          problems.push(`Nota: ${(err as Error).message}`)
        }
      }
      if (pendingFiles.length) {
        const failed = await uploadPending({ kind: 'project', id: id! }, pendingFiles)
        problems.push(...failed)
        setPendingFiles([])
      }
      await onSaved()
      setSaved(snapshot(draft, 0, problems.some((x) => x.startsWith('Nota:')) ? newNote : ''))
      if (problems.length) {
        // El proyecto ya está guardado: el formulario sigue abierto en modo edición para reintentar
        setSections((s) => ({ ...s, files: true }))
        setFormError(`Proyecto guardado, pero hubo problemas:\n${problems.join('\n')}`)
        return
      }
      onClose()
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const assigned = assignedHundredths(draft.milestones)
  const projectNotes = projectId ? notes.filter((n) => n.project_id === projectId) : []
  const err = (f: string) => (showErrors ? errors[f] : undefined)

  return (
    <Modal open={open} title={project ? 'Editar proyecto' : 'Nuevo proyecto'} onClose={requestClose}>
      <form onSubmit={save} noValidate className="flex flex-col gap-3">
        <AccordionSection id="sec-general" title="Información general" icon={<UserRound size={18} />}
          open={sections.general} onToggle={() => toggle('general')} error={sectionHasError('general')}
          badge={[draft.city, draft.province].filter((x) => x.trim()).join(', ') || undefined}>
          <div className="grid grid-cols-6 gap-x-3 gap-y-4">
            <div className="col-span-6 sm:col-span-2">
              <label className="label" htmlFor="p-client">Cliente <span className="text-danger">*</span></label>
              <input id="p-client" className="input" value={draft.client_name} autoCapitalize="words"
                aria-invalid={!!err('client_name')} aria-describedby={err('client_name') ? 'p-client-err' : undefined}
                onChange={(e) => set('client_name', e.target.value)} />
              <FieldError id="p-client-err" message={err('client_name')} />
            </div>
            <div className="col-span-6 sm:col-span-2">
              <label className="label" htmlFor="p-business">Nombre del negocio</label>
              <input id="p-business" className="input" value={draft.business_name}
                onChange={(e) => set('business_name', e.target.value)} />
            </div>
            <div className="col-span-6 sm:col-span-2">
              <label className="label" htmlFor="p-phone">Teléfono</label>
              <input id="p-phone" type="tel" inputMode="tel" autoComplete="tel" className="input" placeholder="600 123 456"
                value={draft.phone} aria-invalid={!!err('phone')} aria-describedby={err('phone') ? 'p-phone-err' : undefined}
                onChange={(e) => set('phone', e.target.value)} />
              <FieldError id="p-phone-err" message={err('phone')} />
            </div>

            <p className="eyebrow col-span-6 -mb-2 mt-1 flex items-center gap-1.5"><MapPin size={12} /> Dirección</p>
            <div className="col-span-6">
              <label className="label" htmlFor="p-address">Calle y número</label>
              <input id="p-address" autoComplete="street-address" className="input" placeholder="Calle, número, piso…"
                value={draft.address} onChange={(e) => set('address', e.target.value)} />
            </div>
            <div className="col-span-6 sm:col-span-2">
              <label className="label" htmlFor="p-province">Provincia</label>
              <input id="p-province" autoComplete="address-level1" className="input" value={draft.province}
                onChange={(e) => set('province', e.target.value)} />
            </div>
            {/* Pantallas muy estrechas: ciudad y C. P. a medias para que el código quepa entero */}
            <div className="col-span-3 min-[400px]:col-span-4 sm:col-span-2">
              <label className="label" htmlFor="p-city">Ciudad</label>
              <input id="p-city" autoComplete="address-level2" className="input" value={draft.city}
                onChange={(e) => set('city', e.target.value)} />
            </div>
            <div className="col-span-3 min-[400px]:col-span-2">
              <label className="label" htmlFor="p-postal">C. postal</label>
              <input id="p-postal" inputMode="numeric" autoComplete="postal-code" maxLength={5} className="input font-mono"
                placeholder="28001" value={draft.postal_code} aria-invalid={!!err('postal_code')}
                aria-describedby={err('postal_code') ? 'p-postal-err' : undefined}
                onChange={(e) => set('postal_code', e.target.value.replace(/\D/g, ''))} />
            </div>
            {err('postal_code') && <div className="col-span-6 -mt-3"><FieldError id="p-postal-err" message={err('postal_code')} /></div>}
          </div>
        </AccordionSection>

        <AccordionSection id="sec-business" title="Negocio" icon={<Briefcase size={18} />}
          open={sections.business} onToggle={() => toggle('business')} error={sectionHasError('business')}
          badge={formatEUR(breakdown.total)}>
          <label id="p-services-label" className="label" htmlFor="p-services">Servicios</label>
          {services.length === 0 ? (
            <p className="text-sm text-muted">No hay servicios. Créalos en la pantalla Servicios.</p>
          ) : (
            <Dropdown id="p-services" labelId="p-services-label" multiple placeholder="Selecciona uno o varios servicios"
              options={services.map((s) => ({
                value: s.id, label: s.name, hint: formatEUR(Number(s.price)),
                icon: <ServiceIcon name={s.icon} size={16} className="text-violet-soft" />,
                chipIcon: <ServiceIcon name={s.icon} size={12} className="text-violet-soft" />,
              }))}
              value={draft.serviceIds} onChange={setServices} />
          )}

          <label className="label mt-4" htmlFor="p-desc">Descripción</label>
          <textarea id="p-desc" rows={3} className="input resize-y" value={draft.description}
            onChange={(e) => set('description', e.target.value)} />

          <div className="mt-5">
            <PricingEditor extras={draft.extras} onExtrasChange={(x) => set('extras', x)}
              discount={draft.discount} onDiscountChange={(x) => set('discount', x)}
              breakdown={breakdown} showErrors={showErrors} />
          </div>
        </AccordionSection>

        <AccordionSection id="sec-contract" title="Condiciones contractuales" icon={<FileSignature size={18} />}
          open={sections.contract} onToggle={() => toggle('contract')} error={sectionHasError('contract')}
          badge={draft.milestones.length ? `${draft.milestones.length} hitos · ${formatPct(assigned / 100)}` : undefined}>
          <MilestonesEditor method={draft.payment_method} onMethodChange={(m) => set('payment_method', m)}
            methodError={err('payment_method')} milestones={draft.milestones} onChange={(m) => set('milestones', m)}
            totalPrice={breakdown.total} showErrors={showErrors} />
        </AccordionSection>

        <AccordionSection id="sec-notes" title="Notas" icon={<StickyNote size={18} />}
          open={sections.notes} onToggle={() => toggle('notes')} badge={projectNotes.length || undefined}>
          {projectNotes.length > 0 && (
            <ul className="mb-4 grid gap-3 sm:grid-cols-2">
              {projectNotes.map((n) => (
                <li key={n.id}>
                  <NoteCard note={n} compact onSave={(v) => onNoteSave(n.id, v)} onDelete={() => onNoteDelete(n)} />
                </li>
              ))}
            </ul>
          )}
          <label className="label" htmlFor="p-new-note">Nueva nota</label>
          <textarea id="p-new-note" rows={2} className="input resize-y" placeholder="Escribe una nota para este proyecto…"
            value={newNote} onChange={(e) => setNewNote(e.target.value)} />
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-xs text-muted">{projectId ? 'Se crea al pulsar «Añadir» o al guardar.' : 'Se creará al guardar el proyecto.'}</p>
            {projectId && (
              <button type="button" className="btn-ghost min-h-9 px-3 text-violet-soft" disabled={!newNote.trim()}
                onClick={async () => {
                  try { await onNoteCreate({ project_id: projectId, content: newNote.trim(), color: 'violet' }); setNewNote('') }
                  catch (e) { setFormError((e as Error).message) }
                }}>
                <Plus size={16} /> Añadir
              </button>
            )}
          </div>
        </AccordionSection>

        <AccordionSection id="sec-files" title="Ficheros adjuntos" icon={<Paperclip size={18} />}
          open={sections.files} onToggle={() => toggle('files')}
          badge={(projectId ? fileCount : pendingFiles.length) || undefined}>
          <AttachmentsPanel idPrefix="p-files" owner={projectId ? { kind: 'project', id: projectId } : null}
            pending={pendingFiles} onPendingChange={setPendingFiles} onCount={setFileCount} />
        </AccordionSection>

        {formError && <p className="whitespace-pre-line text-sm text-danger" role="alert">{formError}</p>}
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={requestClose} className="btn-ghost flex-1 sm:flex-none">{createdId ? 'Cerrar' : 'Cancelar'}</button>
          <button type="submit" className="btn-primary flex-1 sm:flex-none" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>

      <UnsavedChangesDialog open={askSave} saving={saving}
        onCancel={() => setAskSave(false)}
        onDiscard={() => { setAskSave(false); onClose() }}
        onSave={() => { setAskSave(false); save() }} />
    </Modal>
  )
}
