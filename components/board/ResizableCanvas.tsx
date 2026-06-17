'use client'

import { useRef, useState, useCallback, useEffect, forwardRef } from 'react'
import { StickyNote as StickyNoteType, CanvasElement as CEType, CanvasTool, SectionId, SectionConfig } from '@/types'
import Section from './Section'
import StickyNote from './StickyNote'
import CanvasElement from './CanvasElement'

interface ResizableCanvasProps {
  notes: StickyNoteType[]
  canvasElements: CEType[]
  sectionConfigs: SectionConfig[]
  splitX: number
  splitY: number
  onSplitXChange: (v: number) => void
  onSplitYChange: (v: number) => void
  onAddNote: (sectionId: string) => void
  onEditNote: (note: StickyNoteType) => void
  onDeleteNote: (noteId: string) => void
  onReaction: (noteId: string, emoji: string) => void
  onComment: (note: StickyNoteType) => void
  onActionItem: (note: StickyNoteType) => void
  currentUserId: string
  activeTool: CanvasTool
  dragOverSection: SectionId | null
  onCreateElement: (el: Omit<CEType, 'id' | 'board_id' | 'created_at' | 'updated_at'>) => void
  onUpdateElement: (id: string, updates: Partial<CEType>) => void
  onDeleteElement: (id: string) => void
  onHoverNote: (note: StickyNoteType | null) => void
  pendingEditNoteId?: string | null
  onElementReaction: (elementId: string, emoji: string) => void
  onElementComment: (element: CEType) => void
  onElementActionItem: (element: CEType) => void
}

// Section layout
const POSITIONS = [
  { col: 'left',  row: 'top'    }, // continue
  { col: 'right', row: 'top'    }, // stop
  { col: 'left',  row: 'bottom' }, // invent
  { col: 'right', row: 'bottom' }, // act
]

const DIVIDER = 6

const ResizableCanvas = forwardRef<HTMLDivElement, ResizableCanvasProps>(function ResizableCanvas(
  {
    notes, canvasElements, sectionConfigs, splitX, splitY, onSplitXChange, onSplitYChange,
    onAddNote, onEditNote, onDeleteNote, onReaction, onComment, onActionItem,
    currentUserId, activeTool, dragOverSection,
    onCreateElement, onUpdateElement, onDeleteElement, onHoverNote,
    pendingEditNoteId,
    onElementReaction, onElementComment, onElementActionItem,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null)

  // Arrow drawing state
  const [arrowStart, setArrowStart] = useState<{ x: number; y: number } | null>(null)
  const [arrowPreview, setArrowPreview] = useState<{ x: number; y: number } | null>(null)

  // Drag-to-size preview for text / rect / circle
  const [dragPreview, setDragPreview] = useState<{ start: { x: number; y: number }; cur: { x: number; y: number } } | null>(null)

  const setRefs = (el: HTMLDivElement | null) => {
    containerRef.current = el
    if (typeof ref === 'function') ref(el)
    else if (ref) ref.current = el
  }

  // --- Split divider drag ---
  const handleXDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const container = containerRef.current
    if (!container) return
    const startX = e.clientX
    const startSplit = splitX
    const rect = container.getBoundingClientRect()
    const onMove = (ev: MouseEvent) => {
      onSplitXChange(Math.max(20, Math.min(80, startSplit + ((ev.clientX - startX) / rect.width) * 100)))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [splitX, onSplitXChange])

  const handleYDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const container = containerRef.current
    if (!container) return
    const startY = e.clientY
    const startSplit = splitY
    const rect = container.getBoundingClientRect()
    const onMove = (ev: MouseEvent) => {
      onSplitYChange(Math.max(20, Math.min(80, startSplit + ((ev.clientY - startY) / rect.height) * 100)))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [splitY, onSplitYChange])

  const handleCenterDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const container = containerRef.current
    if (!container) return
    const startX = e.clientX, startY = e.clientY
    const startSX = splitX, startSY = splitY
    const rect = container.getBoundingClientRect()
    const onMove = (ev: MouseEvent) => {
      onSplitXChange(Math.max(20, Math.min(80, startSX + ((ev.clientX - startX) / rect.width) * 100)))
      onSplitYChange(Math.max(20, Math.min(80, startSY + ((ev.clientY - startY) / rect.height) * 100)))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [splitX, splitY, onSplitXChange, onSplitYChange])

  const getCellStyle = (col: 'left' | 'right', row: 'top' | 'bottom') => ({
    position: 'absolute' as const,
    left:   col === 'left'   ? 0 : `calc(${splitX}% + ${DIVIDER / 2}px)`,
    top:    row === 'top'    ? 0 : `calc(${splitY}% + ${DIVIDER / 2}px)`,
    width:  col === 'left'   ? `calc(${splitX}% - ${DIVIDER / 2}px)` : `calc(${100 - splitX}% - ${DIVIDER / 2}px)`,
    height: row === 'top'    ? `calc(${splitY}% - ${DIVIDER / 2}px)` : `calc(${100 - splitY}% - ${DIVIDER / 2}px)`,
    padding: '6px',
  })

  // --- Canvas element creation ---
  const getCanvasPos = (e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  // Returns true if the pointer hit an interactive element that should NOT trigger creation
  const isInteractiveTarget = (e: React.PointerEvent) =>
    !!(e.target as HTMLElement).closest('button, [data-no-draw]')

  const handleCreationPointerDown = (e: React.PointerEvent) => {
    if (activeTool === 'select') return
    if (isInteractiveTarget(e)) return
    e.preventDefault()
    const pos = getCanvasPos(e)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

    if (activeTool === 'arrow') {
      setArrowStart(pos)
      setArrowPreview(pos)
      return
    }

    // text / rect / circle：開始拖拉預覽
    setDragPreview({ start: pos, cur: pos })
  }

  const handleCreationPointerMove = (e: React.PointerEvent) => {
    const pos = getCanvasPos(e)
    if (activeTool === 'arrow' && arrowStart) {
      setArrowPreview(pos)
      return
    }
    if (dragPreview) {
      setDragPreview(prev => prev ? { ...prev, cur: pos } : null)
    }
  }

  const handleCreationPointerUp = (e: React.PointerEvent) => {
    // Arrow
    if (activeTool === 'arrow' && arrowStart) {
      const end = getCanvasPos(e)
      if (Math.abs(end.x - arrowStart.x) > 5 || Math.abs(end.y - arrowStart.y) > 5) {
        onCreateElement({
          type: 'arrow',
          pos_x: arrowStart.x, pos_y: arrowStart.y,
          x2: end.x, y2: end.y,
          width: 0, height: 0,
          fill_color: 'transparent',
          stroke_color: '#374151',
          stroke_width: 2,
          text_content: '',
          text_color: '#111827',
          font_size: 14,
          created_by: '',
        })
      }
      setArrowStart(null)
      setArrowPreview(null)
      return
    }

    // text / rect / circle：用拖拉的範圍建立元素
    if (dragPreview && activeTool !== 'select') {
      const { start, cur } = dragPreview
      const x = Math.min(start.x, cur.x)
      const y = Math.min(start.y, cur.y)
      const rawW = Math.abs(cur.x - start.x)
      const rawH = Math.abs(cur.y - start.y)
      // 若幾乎沒移動，使用預設大小
      const defaults: Record<string, { w: number; h: number }> = {
        text: { w: 160, h: 60 }, rect: { w: 120, h: 80 }, circle: { w: 100, h: 100 },
      }
      const def = defaults[activeTool] ?? { w: 120, h: 80 }
      const w = rawW < 10 ? def.w : Math.max(40, rawW)
      const h = rawH < 10 ? def.h : Math.max(30, rawH)
      onCreateElement({
        type: activeTool as CEType['type'],
        pos_x: rawW < 10 ? start.x : x,
        pos_y: rawH < 10 ? start.y : y,
        width: w, height: h,
        fill_color: '#ffffff',
        stroke_color: '#374151',
        stroke_width: 2,
        text_content: '',
        text_color: '#111827',
        font_size: 14,
        created_by: '',
      } as Omit<CEType, 'id' | 'board_id' | 'created_at' | 'updated_at'>)
      setDragPreview(null)
    }
  }

  const isTool = activeTool !== 'select'
  const toolCursor = activeTool === 'text' ? 'text' : isTool ? 'crosshair' : 'default'

  // Delete 鍵刪除已選取的 canvas 元素
  useEffect(() => {
    if (!selectedElementId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (tag === 'TEXTAREA' || tag === 'INPUT') return
      onDeleteElement(selectedElementId)
      setSelectedElementId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedElementId, onDeleteElement])

  return (
    <div
      ref={setRefs}
      className="relative select-none"
      style={{ minWidth: 768, height: 'calc(100dvh - 56px)', cursor: toolCursor }}
      onClick={() => { if (!isTool) { setSelectedElementId(null); setSelectedNoteId(null) } }}
      onPointerDown={handleCreationPointerDown}
      onPointerMove={handleCreationPointerMove}
      onPointerUp={handleCreationPointerUp}
    >
      {/* Section backgrounds (z-0) */}
      {sectionConfigs.map((config, i) => {
        const pos = POSITIONS[i]
        return (
          <div key={config.id} style={{ ...getCellStyle(pos.col as 'left' | 'right', pos.row as 'top' | 'bottom'), zIndex: 0 }}>
            <Section
              config={config}
              noteCount={notes.filter(n => n.section_id === config.id).length}
              isHighlighted={dragOverSection === config.id}
              onAddNote={onAddNote}
            />
          </div>
        )
      })}

      {/* Canvas elements layer (z-5) */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
        {canvasElements.map((el) => (
          <div key={el.id} className="pointer-events-auto" data-no-draw="true">
            <CanvasElement
              element={el}
              selected={selectedElementId === el.id}
              onSelect={() => setSelectedElementId(el.id)}
              onUpdate={(updates) => onUpdateElement(el.id, updates)}
              onDelete={() => { onDeleteElement(el.id); setSelectedElementId(null) }}
              currentUserId={currentUserId}
              onReaction={onElementReaction}
              onComment={() => onElementComment(el)}
              onActionItem={() => onElementActionItem(el)}
            />
          </div>
        ))}
      </div>

      {/* Sticky notes overlay — raised to z-22 when a note is hovered/selected so
           the toolbar appears above the section dividers (z-20) */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: hoveredNoteId || selectedNoteId ? 22 : 10 }}>
        {notes.map((note) => (
          <div
            key={note.id}
            className="absolute pointer-events-auto"
            data-no-draw="true"
            style={{ left: `${note.pos_x * 100}%`, top: `${note.pos_y * 100}%` }}
          >
            <StickyNote
              note={note}
              currentUserId={currentUserId}
              onEdit={onEditNote}
              onDelete={onDeleteNote}
              onReaction={onReaction}
              onComment={onComment}
              onActionItem={onActionItem}
              activeTool={activeTool}
              onHover={(hoveredNote) => { setHoveredNoteId(hoveredNote?.id ?? null); onHoverNote(hoveredNote) }}
              selected={selectedNoteId === note.id}
              onSelect={() => setSelectedNoteId(note.id)}
              canvasRef={containerRef}
              autoEdit={pendingEditNoteId === note.id}
            />
          </div>
        ))}
      </div>

      {/* Section dividers (z-20) */}
      <div
        className="absolute top-0 bottom-0 flex items-center justify-center cursor-col-resize group"
        style={{ left: `calc(${splitX}% - ${DIVIDER / 2}px)`, width: `${DIVIDER}px`, zIndex: 20 }}
        data-no-draw="true"
        onMouseDown={handleXDragStart}
      >
        <div className="w-1 h-12 rounded-full bg-gray-300 group-hover:bg-blue-400 transition-colors" />
      </div>
      <div
        className="absolute left-0 right-0 flex items-center justify-center cursor-row-resize group"
        style={{ top: `calc(${splitY}% - ${DIVIDER / 2}px)`, height: `${DIVIDER}px`, zIndex: 20 }}
        data-no-draw="true"
        onMouseDown={handleYDragStart}
      >
        <div className="h-1 w-12 rounded-full bg-gray-300 group-hover:bg-blue-400 transition-colors" />
      </div>
      <div
        className="absolute cursor-move flex items-center justify-center group"
        style={{ left: `calc(${splitX}% - 12px)`, top: `calc(${splitY}% - 12px)`, width: 24, height: 24, zIndex: 21 }}
        data-no-draw="true"
        onMouseDown={handleCenterDragStart}
      >
        <div className="w-3 h-3 rounded-full bg-gray-400 group-hover:bg-blue-500 transition-colors shadow" />
      </div>

      {/* Drag-to-size preview for text / rect / circle */}
      {dragPreview && activeTool !== 'arrow' && activeTool !== 'select' && (() => {
        const { start, cur } = dragPreview
        const x = Math.min(start.x, cur.x)
        const y = Math.min(start.y, cur.y)
        const w = Math.max(2, Math.abs(cur.x - start.x))
        const h = Math.max(2, Math.abs(cur.y - start.y))
        return (
          <div
            className="absolute pointer-events-none"
            style={{
              left: x, top: y, width: w, height: h, zIndex: 28,
              border: '2px dashed #3b82f6',
              borderRadius: activeTool === 'circle' ? '50%' : 4,
              background: 'rgba(59,130,246,0.06)',
            }}
          />
        )
      })()}

      {/* Arrow preview while drawing */}
      {arrowStart && arrowPreview && (
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: '100%', height: '100%', zIndex: 26 }}
        >
          <defs>
            <marker id="preview-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#3b82f6" />
            </marker>
          </defs>
          <line
            x1={arrowStart.x} y1={arrowStart.y}
            x2={arrowPreview.x} y2={arrowPreview.y}
            stroke="#3b82f6" strokeWidth="2" strokeDasharray="6 3"
            markerEnd="url(#preview-arrow)"
          />
        </svg>
      )}
    </div>
  )
})

export default ResizableCanvas
