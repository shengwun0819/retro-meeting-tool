'use client'

import { useState, useEffect } from 'react'
import { StickyNote, ActionItem } from '@/types'

interface ActionItemModalProps {
  note: StickyNote | null
  initialTitle?: string
  initialView?: 'list' | 'create'
  existingItems: ActionItem[]
  currentUser: { id: string; name: string } | null
  onClose: () => void
  onCreate: (item: Partial<ActionItem>) => Promise<void>
  onUpdate: (id: string, updates: Partial<ActionItem>) => Promise<void>
  onUpdateStatus: (id: string, status: ActionItem['status']) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export default function ActionItemModal({
  note,
  initialTitle,
  initialView = 'list',
  existingItems,
  currentUser,
  onClose,
  onCreate,
  onUpdate,
  onUpdateStatus,
  onDelete,
}: ActionItemModalProps) {
  // --- Create form state ---
  const [title, setTitle] = useState(note?.content ?? initialTitle ?? '')
  const [description, setDescription] = useState('')
  const [ownerName, setOwnerName] = useState(currentUser?.name ?? '')
  const [dueDate, setDueDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [view, setView] = useState<'list' | 'create'>(initialView)
  const [closing, setClosing] = useState(false)

  // --- Edit form state ---
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editOwnerName, setEditOwnerName] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [saving, setSaving] = useState(false)

  const handleClose = () => {
    setClosing(true)
    setTimeout(onClose, 200)
  }

  const startEdit = (item: ActionItem) => {
    setEditingItemId(item.id)
    setEditTitle(item.title)
    setEditDescription(item.description ?? '')
    setEditOwnerName(item.owner_name ?? '')
    setEditDueDate(item.due_date ?? '')
  }

  const cancelEdit = () => setEditingItemId(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingItemId) { cancelEdit(); return }
        handleClose()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [editingItemId])

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTitle.trim() || !editingItemId) return
    setSaving(true)
    try {
      await onUpdate(editingItemId, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        owner_name: editOwnerName.trim() || undefined,
        due_date: editDueDate || undefined,
      })
      setEditingItemId(null)
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    try {
      await onCreate({
        source_sticky_note_id: note?.id,
        title: title.trim(),
        description: description.trim() || undefined,
        owner_name: ownerName.trim() || undefined,
        due_date: dueDate || undefined,
        status: 'Open',
      })
      setTitle('')
      setDescription('')
      setDueDate('')
      setView('list')
    } finally {
      setSubmitting(false)
    }
  }

  const statusColors: Record<ActionItem['status'], string> = {
    Open: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    InProgress: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
    Done: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
  }

  const statusNext: Record<ActionItem['status'], ActionItem['status']> = {
    Open: 'InProgress',
    InProgress: 'Done',
    Done: 'Open',
  }

  const inputCls = 'w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500'

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className={`bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col border border-white/60 dark:border-white/10 ${closing ? 'animate-modal-out' : 'animate-modal-in'}`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 text-lg">✅ Action Items</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
          <button
            onClick={() => { setView('list'); cancelEdit() }}
            className={`flex-1 py-2.5 text-sm font-medium transition-all ${view === 'list' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            All Items ({existingItems.length})
          </button>
          <button
            onClick={() => { setView('create'); cancelEdit() }}
            className={`flex-1 py-2.5 text-sm font-medium transition-all ${view === 'create' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            + New Item
          </button>
        </div>

        {/* Tab content — opacity cross-fade */}
        <div className="flex-1 overflow-y-auto relative">
          {/* List view */}
          <div className={`transition-opacity duration-200 ${view === 'list' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none absolute inset-0 overflow-hidden'}`}>
            <div className="p-4 space-y-3">
              {existingItems.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-3">📋</p>
                  <p className="text-sm">No action items yet.</p>
                  <button
                    onClick={() => setView('create')}
                    className="mt-3 text-blue-500 hover:text-blue-600 text-sm font-medium"
                  >
                    Create the first one →
                  </button>
                </div>
              ) : (
                existingItems.map((item) =>
                  editingItemId === item.id ? (
                    /* ── Inline edit form ── */
                    <form
                      key={item.id}
                      onSubmit={handleSaveEdit}
                      className="border border-blue-300 dark:border-blue-700 rounded-xl p-3 bg-blue-50/40 dark:bg-blue-950/30 space-y-3"
                    >
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Title *</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className={inputCls}
                          placeholder="What needs to be done?"
                          autoFocus
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className={`${inputCls} resize-none`}
                          rows={2}
                          placeholder="Optional details..."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Owner</label>
                          <input
                            type="text"
                            value={editOwnerName}
                            onChange={(e) => setEditOwnerName(e.target.value)}
                            className={inputCls}
                            placeholder="Who's responsible?"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Due Date</label>
                          <input
                            type="date"
                            value={editDueDate}
                            onChange={(e) => setEditDueDate(e.target.value)}
                            className={inputCls}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!editTitle.trim() || saving}
                          className="px-4 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-all disabled:opacity-50"
                        >
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* ── Normal display row ── */
                    <div key={item.id} className="group border border-gray-200 dark:border-gray-700 rounded-xl p-3 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => onUpdateStatus(item.id, statusNext[item.status])}
                          title="Cycle status"
                          className={`mt-0.5 shrink-0 text-xs rounded-full px-2 py-0.5 font-medium transition-all hover:opacity-80 ${statusColors[item.status]}`}
                        >
                          {item.status}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium text-gray-800 dark:text-gray-100 ${item.status === 'Done' ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
                            {item.title}
                          </p>
                          {item.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.description}</p>
                          )}
                          <div className="flex gap-3 mt-1 text-xs text-gray-400 dark:text-gray-500">
                            {item.owner_name && <span>👤 {item.owner_name}</span>}
                            {item.due_date && <span>📅 {item.due_date}</span>}
                          </div>
                        </div>
                        {/* Edit + Delete — visible on hover */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => startEdit(item)}
                            title="Edit"
                            className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition-all"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => onDelete(item.id)}
                            title="Delete"
                            className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-all"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                              <path d="M10 11v6M14 11v6"/>
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                )
              )}
            </div>
          </div>

          {/* Create view */}
          <div className={`transition-opacity duration-200 ${view === 'create' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none absolute inset-0 overflow-hidden'}`}>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              {note && (
                <div
                  className="p-3 rounded-xl text-sm text-gray-700"
                  style={{ backgroundColor: note.color }}
                >
                  <p className="text-xs text-gray-500 mb-1">From sticky note:</p>
                  <p className="font-medium line-clamp-2">{note.content}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={inputCls}
                  placeholder="What needs to be done?"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`${inputCls} resize-none`}
                  rows={2}
                  placeholder="Optional details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Owner</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className={inputCls}
                    placeholder="Who's responsible?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!title.trim() || submitting}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-xl transition-all disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Action Item'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
