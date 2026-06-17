'use client'

import { useEffect, useState } from 'react'
import { StickyNote, Comment } from '@/types'
import { SECTION_CONFIGS } from '@/lib/constants'

interface AllCommentsPanelProps {
  notes: StickyNote[]
  currentUser: { id: string; name: string; color: string } | null
  onClose: () => void
  onDeleteComment: (commentId: string) => void
  onAddComment: (noteId: string, content: string) => Promise<void>
  onEditComment: (commentId: string, content: string) => Promise<void>
}

export default function AllCommentsPanel({
  notes,
  currentUser,
  onClose,
  onDeleteComment,
  onAddComment,
  onEditComment,
}: AllCommentsPanelProps) {
  // Which note is currently in "reply" view (null = list view)
  const [replyNote, setReplyNote] = useState<StickyNote | null>(null)

  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [closing, setClosing] = useState(false)

  const handleClose = () => {
    setClosing(true)
    setTimeout(onClose, 200)
  }

  // Close on Escape (goes back first, then closes)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (replyNote) {
        goBack()
      } else {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [replyNote])

  const notesWithComments = notes.filter(n => (n.comments?.length ?? 0) > 0)
  const totalComments = notesWithComments.reduce((sum, n) => sum + (n.comments?.length ?? 0), 0)

  const getSectionConfig = (sectionId: string) =>
    SECTION_CONFIGS.find(s => s.id === sectionId)

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const openReply = (note: StickyNote) => {
    setReplyNote(note)
    setReplyContent('')
    setEditingId(null)
  }

  const goBack = () => {
    setReplyNote(null)
    setReplyContent('')
    setEditingId(null)
  }

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyContent.trim() || !replyNote) return
    setSubmitting(true)
    try {
      await onAddComment(replyNote.id, replyContent.trim())
      setReplyContent('')
    } finally {
      setSubmitting(false)
    }
  }

  // Find the latest version of replyNote from notes (includes newly added comments)
  const liveReplyNote = replyNote
    ? notes.find(n => n.id === replyNote.id) ?? replyNote
    : null

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={replyNote ? goBack : handleClose} />

      {/* Panel */}
      <div className={`relative ml-auto w-80 bg-white/80 dark:bg-gray-900/70 backdrop-blur-xl shadow-2xl flex flex-col border-l border-white/50 dark:border-white/10 overflow-hidden ${closing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>

        {/* Header — switches between list and reply */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
          {replyNote ? (
            /* Reply header */
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                onClick={goBack}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors shrink-0"
                title="Back to all comments"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                </svg>
              </button>
              <div className="min-w-0">
                <h2 className="font-bold text-gray-800 dark:text-gray-100 text-sm flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  Reply
                </h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{replyNote.content || '(empty note)'}</p>
              </div>
            </div>
          ) : (
            /* List header */
            <div>
              <h2 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                All Comments
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {totalComments} comment{totalComments !== 1 ? 's' : ''} across {notesWithComments.length} note{notesWithComments.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Sliding content area */}
        <div className="flex-1 overflow-hidden relative">

          {/* LIST VIEW */}
          <div
            className={`absolute inset-0 flex flex-col overflow-y-auto transition-transform duration-300 ease-in-out ${
              replyNote ? '-translate-x-full' : 'translate-x-0'
            }`}
          >
            {notesWithComments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 gap-2 p-8">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <p className="text-sm">No comments yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {notesWithComments.map((note) => {
                  const sectionConfig = getSectionConfig(note.section_id)
                  return (
                    <div key={note.id} className="p-4">
                      {/* Note header */}
                      <div className="flex items-start gap-2 mb-3">
                        <div
                          className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                          style={{ backgroundColor: note.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            {sectionConfig && (
                              <span className="text-xs text-gray-400 dark:text-gray-500">{sectionConfig.emoji} {sectionConfig.title}</span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100 line-clamp-2">
                            {note.content || <span className="text-gray-400 italic">Empty note</span>}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">— {note.author_name}</p>
                        </div>
                        <button
                          onClick={() => openReply(note)}
                          className="text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 shrink-0 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                          title="Reply to this note"
                        >
                          Reply
                        </button>
                      </div>

                      {/* Comments list */}
                      <div className="space-y-2 pl-4">
                        {(note.comments ?? []).map((comment: Comment) => (
                          <div key={comment.id} className="group bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{comment.author_name}</span>
                                <span className="text-xs text-gray-400 dark:text-gray-500 ml-1.5">{formatTime(comment.created_at)}</span>
                                <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 whitespace-pre-wrap">{comment.content}</p>
                              </div>
                              {currentUser?.id === comment.author_id && (
                                <button
                                  onClick={() => onDeleteComment(comment.id)}
                                  className="opacity-0 group-hover:opacity-100 text-gray-300 dark:text-gray-600 hover:text-red-400 transition-all shrink-0"
                                  title="Delete comment"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* REPLY VIEW */}
          <div
            className={`absolute inset-0 flex flex-col transition-transform duration-300 ease-in-out ${
              replyNote ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {liveReplyNote && (
              <>
                {/* Note preview */}
                <div className="mx-4 mt-3 p-3 rounded-xl text-sm font-medium text-gray-800 shrink-0" style={{ backgroundColor: liveReplyNote.color }}>
                  <p className="line-clamp-3">{liveReplyNote.content || '(empty note)'}</p>
                  <p className="text-xs text-gray-600 mt-1">— {liveReplyNote.author_name}</p>
                </div>

                {/* Comments */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {(liveReplyNote.comments ?? []).length === 0 ? (
                    <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-6">No comments yet. Be the first!</p>
                  ) : (
                    (liveReplyNote.comments ?? []).map((c: Comment) => (
                      <div key={c.id} className={`rounded-xl p-3 group ${
                        c.author_id === currentUser?.id
                          ? 'bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900'
                          : 'bg-gray-50 dark:bg-gray-800'
                      }`}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-sm text-gray-700 dark:text-gray-200 truncate">{c.author_name}</span>
                            <span className="text-xs text-gray-400 shrink-0">
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
                                className="text-xs text-gray-500 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
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

                {/* Reply input */}
                <form onSubmit={handleSubmitReply} className="pt-4 px-4 pb-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
                  {!currentUser ? (
                    <p className="text-sm text-gray-400 text-center">Enter your name to comment</p>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Add a comment..."
                        className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400"
                        disabled={submitting}
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={!replyContent.trim() || submitting}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-xl text-sm disabled:opacity-50 transition-all"
                      >
                        {submitting ? '...' : '↑'}
                      </button>
                    </div>
                  )}
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
