import { useEffect, useId, useRef, type ReactNode } from 'react'
import gsap from 'gsap'
import { Icon } from './Icons'

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const dialog = ref.current!
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(dialog, { y: 40, opacity: 0, scale: 0.98 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'power3.out', clearProps: 'transform,opacity' })
    })
    return () => {
      media.revert()
      dialog.close()
      document.body.style.overflow = previousOverflow
      trigger?.focus()
    }
  }, [])

  return <dialog ref={ref} className="modal" aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); closeRef.current() }}
    onKeyDown={(event) => {
      if (event.key !== 'Tab') return
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]')).filter((element) => element.getClientRects().length > 0)
      const first = controls[0]
      const last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }}
    onClick={(event) => { if (event.target === event.currentTarget) closeRef.current() }}>
    <div className="modal-inner">
      <div className="sheet-handle" aria-hidden="true" />
      <header className="modal-header"><h2 id={titleId}>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button></header>
      {children}
    </div>
  </dialog>
}
