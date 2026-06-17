'use client'

import { useState, useRef, useCallback } from 'react'
import { CanvasElement as CEType } from '@/types'
import { REACTIONS } from '@/lib/constants'

interface CanvasElementProps {
  element: CEType
  selected: boolean
  onSelect: () => void
  onUpdate: (updates: Partial<CEType>) => void
  onDelete: () => void
  currentUserId?: string
  onReaction?: (elementId: string, emoji: string) => void
  onComment?: () => void
  onActionItem?: () => void
}

const FILL_COLORS = ['transparent', '#ffffff', '#fef08a', '#bbf7d0', '#bae6fd', '#fecaca', '#e9d5ff', '#fed7aa']
const STROKE_COLORS = ['#374151', '#000000', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6']
const TEXT_COLORS = ['#111827', '#ffffff', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6']

type Corner = 'tl' | 'tr' | 'bl' | 'br'

export default function CanvasElement({
  element: el,
  selected,
  onSelect,
  onUpdate,
  onDelete,
  onReaction,
  onComment,
  onActionItem,
}: CanvasElementProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(el.text_content)
  const [showStyler, setShowStyler] = useState<'fill' | 'stroke' | 'text' | null>(null)
  const [showReactions, setShowReactions] = useState(false)
  const [floatEmoji, setFloatEmoji] = useState<string | null>(null)
  const draggingRef = useRef<{ startX: number; startY: number; startElX: number; startElY: number } | null>(null)
  const resizingRef = useRef<{ startX: number; startY: number; startEl: { x: number; y: number; w: number; h: number }; corner: Corner } | null>(null)
  const arrowDragRef = useRef<{ endpoint: 'start' | 'end'; startX: number; startY: number; startVal: number; startVal2: number } | null>(null)
  const [liveDrag, setLiveDrag] = useState<{ x: number; y: number } | null>(null)
  const [liveResize, setLiveResize] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [liveArrow, setLiveArrow] = useState<{ x: number; y: number; x2: number; y2: number } | null>(null)

  // --- Drag to move ---
  const handleDragStart = useCallback((e: React.PointerEvent) => {
    if (isEditing) return
    e.preventDefault()
    e.stopPropagation()
    onSelect()
    draggingRef.current = { startX: e.clientX, startY: e.clientY, startElX: el.pos_x, startElY: el.pos_y }

    const onMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return
      const dx = ev.clientX - draggingRef.current.startX
      const dy = ev.clientY - draggingRef.current.startY
      setLiveDrag({ x: draggingRef.current.startElX + dx, y: draggingRef.current.startElY + dy })
    }
    const onUp = (ev: PointerEvent) => {
      if (!draggingRef.current) return
      const dx = ev.clientX - draggingRef.current.startX
      const dy = ev.clientY - draggingRef.current.startY
      onUpdate({ pos_x: draggingRef.current.startElX + dx, pos_y: draggingRef.current.startElY + dy })
      draggingRef.current = null
      setLiveDrag(null)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [el.pos_x, el.pos_y, isEditing, onSelect, onUpdate])

  // --- Resize corner handles ---
  const handleResizeStart = useCallback((e: React.PointerEvent, corner: Corner) => {
    e.preventDefault()
    e.stopPropagation()
    resizingRef.current = {
      startX: e.clientX, startY: e.clientY,
      startEl: { x: el.pos_x, y: el.pos_y, w: el.width, h: el.height },
      corner,
    }

    const calc = (ev: PointerEvent) => {
      const r = resizingRef.current!
      const dx = ev.clientX - r.startX
      const dy = ev.clientY - r.startY
      let { x, y, w, h } = r.startEl
      if (corner.includes('r')) w = Math.max(40, w + dx)
      if (corner.includes('l')) { x = x + dx; w = Math.max(40, w - dx) }
      if (corner.includes('b')) h = Math.max(30, h + dy)
      if (corner.includes('t')) { y = y + dy; h = Math.max(30, h - dy) }
      return { x, y, w, h }
    }
    const onMove = (ev: PointerEvent) => {
      if (!resizingRef.current) return
      const { x, y, w, h } = calc(ev)
      setLiveResize({ x, y, w, h })
    }
    const onUp = (ev: PointerEvent) => {
      if (!resizingRef.current) return
      const { x, y, w, h } = calc(ev)
      onUpdate({ pos_x: x, pos_y: y, width: w, height: h })
      resizingRef.current = null
      setLiveResize(null)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [el.pos_x, el.pos_y, el.width, el.height, onUpdate])

  // --- Arrow endpoint drag ---
  const handleArrowEndpointStart = useCallback((e: React.PointerEvent, endpoint: 'start' | 'end') => {
    e.preventDefault()
    e.stopPropagation()
    arrowDragRef.current = {
      endpoint,
      startX: e.clientX, startY: e.clientY,
      startVal: endpoint === 'start' ? el.pos_x : (el.x2 ?? el.pos_x + 100),
      startVal2: endpoint === 'start' ? el.pos_y : (el.y2 ?? el.pos_y),
    }

    const onMove = (ev: PointerEvent) => {
      if (!arrowDragRef.current) return
      const dx = ev.clientX - arrowDragRef.current.startX
      const dy = ev.clientY - arrowDragRef.current.startY
      const newVal = arrowDragRef.current.startVal + dx
      const newVal2 = arrowDragRef.current.startVal2 + dy
      if (endpoint === 'start') setLiveArrow({ x: newVal, y: newVal2, x2: el.x2 ?? el.pos_x + 100, y2: el.y2 ?? el.pos_y })
      else setLiveArrow({ x: el.pos_x, y: el.pos_y, x2: newVal, y2: newVal2 })
    }
    const onUp = (ev: PointerEvent) => {
      if (!arrowDragRef.current) return
      const dx = ev.clientX - arrowDragRef.current.startX
      const dy = ev.clientY - arrowDragRef.current.startY
      const newVal = arrowDragRef.current.startVal + dx
      const newVal2 = arrowDragRef.current.startVal2 + dy
      if (endpoint === 'start') onUpdate({ pos_x: newVal, pos_y: newVal2 })
      else onUpdate({ x2: newVal, y2: newVal2 })
      arrowDragRef.current = null
      setLiveArrow(null)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [el, onUpdate])

  const handleReact = (emoji: string) => {
    onReaction?.(el.id, emoji)
    setShowReactions(false)
    setFloatEmoji(emoji)
    setTimeout(() => setFloatEmoji(null), 700)
  }

  // Effective values (live during interaction)
  const x = liveArrow?.x ?? liveDrag?.x ?? liveResize?.x ?? el.pos_x
  const y = liveArrow?.y ?? liveDrag?.y ?? liveResize?.y ?? el.pos_y
  const w = liveResize?.w ?? el.width
  const h = liveResize?.h ?? el.height
  const x2 = liveArrow?.x2 ?? el.x2 ?? el.pos_x + 100
  const y2 = liveArrow?.y2 ?? el.y2 ?? el.pos_y

  const commitText = () => {
    setIsEditing(false)
    if (editText !== el.text_content) onUpdate({ text_content: editText })
  }

  const reactionMap = (el.reactions ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] ?? 0) + 1
    return acc
  }, {})

  const commentCount = el.comments?.length ?? 0

  // --- Render helpers ---
  const resizeHandles = selected && el.type !== 'arrow' && (
    <>
      {(['tl', 'tr', 'bl', 'br'] as Corner[]).map((corner) => (
        <div
          key={corner}
          className="absolute w-3 h-3 bg-white dark:bg-gray-700 border-2 border-blue-500 rounded-sm z-20"
          style={{
            left: corner.includes('l') ? -6 : w - 6,
            top: corner.includes('t') ? -6 : h - 6,
            cursor: corner === 'tl' || corner === 'br' ? 'nwse-resize' : 'nesw-resize',
          }}
          onPointerDown={(e) => handleResizeStart(e, corner)}
        />
      ))}
    </>
  )

  const actionBar = selected && !isEditing && (
    <div
      className="absolute -top-10 left-0 flex items-center gap-1 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 px-2 py-1 z-30 whitespace-nowrap"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Fill color (rect / circle only) */}
      {(el.type === 'rect' || el.type === 'circle') && (
        <div className="relative">
          <button
            onClick={() => setShowStyler(showStyler === 'fill' ? null : 'fill')}
            className="w-5 h-5 rounded border border-gray-300 hover:scale-110 transition-transform"
            style={{ background: el.fill_color === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, white 25%, white 75%, #ccc 75%)' : el.fill_color }}
            title="Fill color"
          />
          {showStyler === 'fill' && (
            <div className="absolute top-7 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2 flex flex-wrap gap-1 w-36 z-40">
              {FILL_COLORS.map((c) => (
                <button key={c} onClick={() => { onUpdate({ fill_color: c }); setShowStyler(null) }}
                  className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                  style={{ background: c === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, white 25%, white 75%, #ccc 75%)' : c }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stroke color */}
      <div className="relative">
        <button
          onClick={() => setShowStyler(showStyler === 'stroke' ? null : 'stroke')}
          className="w-5 h-5 rounded-full border-2 border-gray-300 hover:scale-110 transition-transform"
          style={{ backgroundColor: el.stroke_color }}
          title="Stroke color"
        />
        {showStyler === 'stroke' && (
          <div className="absolute top-7 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2 flex flex-wrap gap-1 w-36 z-40">
            {STROKE_COLORS.map((c) => (
              <button key={c} onClick={() => { onUpdate({ stroke_color: c }); setShowStyler(null) }}
                className="w-6 h-6 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                style={{ backgroundColor: c }} />
            ))}
          </div>
        )}
      </div>

      {/* Text color (text / rect / circle) */}
      {(el.type === 'text' || el.type === 'rect' || el.type === 'circle') && (
        <div className="relative">
          <button
            onClick={() => setShowStyler(showStyler === 'text' ? null : 'text')}
            className="text-xs font-bold px-1 py-0.5 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
            style={{ color: el.text_color }}
            title="Text color"
          >A</button>
          {showStyler === 'text' && (
            <div className="absolute top-7 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2 flex flex-wrap gap-1 w-36 z-40">
              {TEXT_COLORS.map((c) => (
                <button key={c} onClick={() => { onUpdate({ text_color: c }); setShowStyler(null) }}
                  className="w-6 h-6 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Font size (text / rect / circle) */}
      {(el.type === 'text' || el.type === 'rect' || el.type === 'circle') && (
        <div className="flex items-center gap-1">
          <button onClick={() => onUpdate({ font_size: Math.max(10, el.font_size - 2) })}
            className="text-xs px-1 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100">A−</button>
          <span className="text-xs text-gray-500 dark:text-gray-400 w-5 text-center">{el.font_size}</span>
          <button onClick={() => onUpdate({ font_size: Math.min(48, el.font_size + 2) })}
            className="text-xs px-1 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 font-bold">A+</button>
        </div>
      )}

      <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-0.5" />

      {/* Reactions */}
      <div className="relative">
        <button
          onClick={() => setShowReactions(!showReactions)}
          className="text-sm hover:scale-125 transition-transform px-1"
          title="React"
        >😊</button>
        {showReactions && (
          <div className="absolute bottom-8 left-0 bg-white dark:bg-gray-800 rounded-full shadow-xl border border-gray-200 dark:border-gray-700 flex p-1 gap-1 z-40">
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={(e) => { e.stopPropagation(); handleReact(emoji) }}
                className="text-base hover:scale-125 transition-transform px-1"
              >{emoji}</button>
            ))}
          </div>
        )}
      </div>

      {/* Comments */}
      <button
        onClick={onComment}
        className="text-sm hover:scale-110 transition-transform px-1 flex items-center gap-0.5"
        title="Comments"
      >
        💬 {commentCount > 0 && <span className="text-xs text-gray-500 dark:text-gray-400">{commentCount}</span>}
      </button>

      {/* Action Item */}
      <button
        onClick={onActionItem}
        className="text-sm hover:scale-110 transition-transform px-1"
        title="Action Item"
      >✅</button>

      <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-0.5" />

      {/* Delete */}
      <button onClick={onDelete} className="text-sm hover:scale-110 transition-transform px-1 text-red-400 hover:text-red-600" title="Delete">🗑️</button>
    </div>
  )

  // Reaction badges displayed below the element
  const reactionBadges = Object.keys(reactionMap).length > 0 && (
    <div className="absolute flex flex-wrap gap-1 pointer-events-auto" style={{ top: el.type === 'arrow' ? Math.max(y, y2) + 8 : h + 4, left: 0 }}>
      {Object.entries(reactionMap).map(([emoji, count]) => {
        const reactors = (el.reactions ?? []).filter(r => r.emoji === emoji).map(r => r.user_name)
        return (
          <div key={emoji} className="relative group/rxn">
            <button
              onClick={(e) => { e.stopPropagation(); handleReact(emoji) }}
              onPointerDown={(e) => e.stopPropagation()}
              className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-1.5 py-0.5 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-all"
            >
              {emoji} {count}
            </button>
            <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover/rxn:block z-40 pointer-events-none">
              <div className="bg-gray-800 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-lg">
                {reactors.join(', ')}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  // --- Arrow ---
  if (el.type === 'arrow') {
    const pad = 20
    const svgLeft = Math.min(x, x2) - pad
    const svgTop = Math.min(y, y2) - pad
    const svgW = Math.max(pad * 2 + 4, Math.abs(x2 - x) + pad * 2)
    const svgH = Math.max(pad * 2 + 4, Math.abs(y2 - y) + pad * 2)
    const lx1 = x - svgLeft, ly1 = y - svgTop
    const lx2 = x2 - svgLeft, ly2 = y2 - svgTop

    return (
      <>
        <svg
          style={{ position: 'absolute', left: svgLeft, top: svgTop, width: svgW, height: svgH, overflow: 'visible', pointerEvents: 'none' }}
        >
          <defs>
            <marker id={`ah-${el.id}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill={el.stroke_color} />
            </marker>
          </defs>
          <line x1={lx1} y1={ly1} x2={lx2} y2={ly2}
            stroke={el.stroke_color} strokeWidth={el.stroke_width}
            markerEnd={`url(#ah-${el.id})`}
          />
        </svg>

        {/* Invisible hit area */}
        <div
          style={{ position: 'absolute', left: svgLeft, top: svgTop, width: svgW, height: svgH, cursor: 'move' }}
          onPointerDown={handleDragStart}
          onClick={onSelect}
        />

        {/* Floating emoji */}
        {floatEmoji && (
          <div style={{ position: 'absolute', left: (x + x2) / 2, top: (y + y2) / 2 }}
            className="text-2xl pointer-events-none z-30 animate-float-up">{floatEmoji}</div>
        )}

        {/* Reaction badges */}
        <div style={{ position: 'absolute', left: Math.min(x, x2), top: Math.max(y, y2) + 8 }}
          className="flex flex-wrap gap-1 pointer-events-auto">
          {Object.entries(reactionMap).map(([emoji, count]) => {
            const reactors = (el.reactions ?? []).filter(r => r.emoji === emoji).map(r => r.user_name)
            return (
              <div key={emoji} className="relative group/rxn">
                <button
                  onClick={(e) => { e.stopPropagation(); handleReact(emoji) }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="text-xs bg-white border border-gray-200 rounded-full px-1.5 py-0.5 hover:bg-gray-50 shadow-sm"
                >
                  {emoji} {count}
                </button>
                <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover/rxn:block z-40 pointer-events-none">
                  <div className="bg-gray-800 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-lg">
                    {reactors.join(', ')}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {selected && (
          <>
            <div style={{ position: 'absolute', left: x - 6, top: y - 6, width: 12, height: 12, borderRadius: '50%', border: '2px solid #3b82f6', backgroundColor: 'white', cursor: 'move', zIndex: 30 }}
              onPointerDown={(e) => handleArrowEndpointStart(e, 'start')} />
            <div style={{ position: 'absolute', left: x2 - 6, top: y2 - 6, width: 12, height: 12, borderRadius: '50%', border: '2px solid #3b82f6', backgroundColor: 'white', cursor: 'move', zIndex: 30 }}
              onPointerDown={(e) => handleArrowEndpointStart(e, 'end')} />
            {/* Toolbar: positioned above the arrow midpoint */}
            <div style={{ position: 'absolute', left: (x + x2) / 2 - 60, top: Math.min(y, y2) - 44 }}>
              {actionBar}
            </div>
          </>
        )}
      </>
    )
  }

  // --- Rect / Circle ---
  if (el.type === 'rect' || el.type === 'circle') {
    return (
      <div
        style={{
          position: 'absolute', left: x, top: y, width: w, height: h,
          backgroundColor: el.fill_color === 'transparent' ? 'transparent' : el.fill_color,
          border: `${el.stroke_width}px solid ${el.stroke_color}`,
          borderRadius: el.type === 'circle' ? '50%' : 6,
          cursor: isEditing ? 'text' : 'move',
          outline: selected ? '2px solid #3b82f6' : 'none',
          outlineOffset: 2,
          boxSizing: 'border-box',
          overflow: 'visible',
        }}
        onPointerDown={isEditing ? undefined : handleDragStart}
        onClick={(e) => { e.stopPropagation(); onSelect() }}
        onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); setEditText(el.text_content) }}
      >
        <div style={{ overflow: 'hidden', width: '100%', height: '100%', borderRadius: el.type === 'circle' ? '50%' : 6 }}>
          {isEditing ? (
            <textarea
              autoFocus
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={commitText}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setEditText(el.text_content); setIsEditing(false) }
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitText() }
              }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                width: '100%', height: '100%', resize: 'none', border: 'none', outline: 'none',
                background: 'transparent', textAlign: 'center', padding: 8,
                color: el.text_color, fontSize: el.font_size, boxSizing: 'border-box',
              }}
              placeholder="Double-click to type..."
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: el.text_color, fontSize: el.font_size, textAlign: 'center', padding: 4, pointerEvents: 'none',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {el.text_content || null}
            </div>
          )}
        </div>
        {!isEditing && resizeHandles}
        {!isEditing && actionBar}
        {floatEmoji && (
          <div className="absolute top-0 left-1/2 text-2xl pointer-events-none z-30 animate-float-up">{floatEmoji}</div>
        )}
        {reactionBadges}
      </div>
    )
  }

  // --- Text ---
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, width: w, minHeight: h,
        border: selected ? '2px solid #3b82f6' : '1.5px dashed #cbd5e1',
        borderRadius: 4,
        cursor: isEditing ? 'text' : 'move',
        padding: 6,
        boxSizing: 'border-box',
        background: 'transparent',
        overflow: 'visible',
      }}
      onPointerDown={isEditing ? undefined : handleDragStart}
      onClick={(e) => { e.stopPropagation(); onSelect() }}
      onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); setEditText(el.text_content) }}
    >
      {isEditing ? (
        <textarea
          autoFocus
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={commitText}
          onKeyDown={(e) => { if (e.key === 'Escape') { setEditText(el.text_content); setIsEditing(false) } }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          style={{ width: '100%', minHeight: h - 12, resize: 'none', border: 'none', outline: 'none', background: 'transparent',
            color: el.text_color, fontSize: el.font_size }}
          placeholder="Type here..."
        />
      ) : (
        <div style={{ color: el.text_color, fontSize: el.font_size, whiteSpace: 'pre-wrap', minHeight: h - 12 }}>
          {el.text_content || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Double-click to edit</span>}
        </div>
      )}
      {resizeHandles}
      {actionBar}
      {floatEmoji && (
        <div className="absolute top-0 left-1/2 text-2xl pointer-events-none z-30 animate-float-up">{floatEmoji}</div>
      )}
      {reactionBadges}
    </div>
  )
}
