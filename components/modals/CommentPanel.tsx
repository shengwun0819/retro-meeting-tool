'use client'

import { useState, useEffect } from 'react'
import { StickyNote, CanvasElement, Comment } from '@/types'

interface CommentPanelProps {
  note?: StickyNote | null
  canvasElement?: CanvasElement | null
  currentUser: { id: string; name: string } | null
  onClose: () => void
  onAddComment: (sourceId: string, content: string) => Promise<void>
  onDeleteComment: (commentId: string) => void
  onEditComment: (commentId: string, content: string) => Promise<void>
}

export default function CommentPanel({
  note,
  canvasElement,
  currentUser,
  onClose,
  onAddComment,
  onDeleteComment,
  onEditComment,
}: CommentPanelProps) {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [closing, setClosing] = useState(false)

  const source = note ?? canvasElement
  const sourceId = note?.id ?? canvasElement?.id

  const handleClose = () => {
    setClosing(true)
    setTimeout(onClose, 200)
  }

  useEffect(() => {
    setContent('')
    setClosing(false)
  }, [sourceId])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  if (!source) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !currentUser || !sourceId) return
    setSubmitting(true)
    try {
      await onAddComment(sourceId, content.trim())
      setContent('')
    } finally {
      setSubmitting(false)
    }
  }

  const comments: Comment[] = source.comments ?? []

  const previewContent = note
    ? note.content || '(empty note)'
    : (canvasElement?.text_content || '(no text content)')

  const previewStyle = note
    ? { backgroundColor: note.color }
    : { border: `2px solid ${canvasElement?.stroke_color ?? '#374151'}` }

  return (
    <div className={`fixed right-0 top-14 bottom-0 w-80 bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl border-l border-white/50 dark:border-white/10 shadow-xl z-50 flex flex-col ${closing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="font-bold text-gray-800 dark:text-gray-100">💬 Comments</h3>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors text-xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Source Preview */}
      <div className={`mx-4 mt-3 p-3 rounded-xl text-sm font-medium text-gray-800 ${!note ? 'bg-gray-100 dark:bg-gray-800 dark:text-gray-200' : ''}`} style={previewStyle}>
        <p className="line-clamp-3">{previewContent}</p>
        {note && <p className="text-xs text-gray-500 mt-1">— {note.author_name}</p>}
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {comments.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">No comments yet. Be the first!</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className={`rounded-xl p-3 group ${
              c.author_id === currentUser?.id
                ? 'bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900'
                : 'bg-gray-50 dark:bg-gray-800'
            }`}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-sm text-gray-700 dark:text-gray-200 truncate">{c.author_name}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                    {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {editingId !== c.id && currentUser?.id === c.author_id && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => { setEditingId(c.id); setEditContent(c.content) }}
                      className="text-gray-400 hover:text-blue-500 text-xs p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950 transition-all"
                      title="Edit"
                    >✏️</button>
                    <button
                      onClick={() => onDeleteComment(c.id)}
                      className="text-gray-400 hover:text-red-500 text-xs p-1 rounded hover:bg-red-50 dark:hover:bg-red-950 transition-all"
                      title="Delete"
                    >🗑️</button>
                  </div>
                )}
              </div>
              {editingId === c.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 resize-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                    rows={2}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={async () => { await onEditComment(c.id, editContent); setEditingId(null) }}
                      disabled={!editContent.trim()}
                      className="text-xs bg-blue-500 text-white px-2 py-1 rounded-lg hover:bg-blue-600 disabled:opacity-40 transition-all"
                    >Save</button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                    >Cancel</button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{c.content}</p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="pt-4 px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
        {!currentUser ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center">Enter your name to comment</p>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={!content.trim() || submitting}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-xl text-sm disabled:opacity-50 transition-all"
            >
              {submitting ? '...' : '↑'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
