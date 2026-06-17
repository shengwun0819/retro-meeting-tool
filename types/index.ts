export type SectionId = 'continue' | 'invent' | 'stop' | 'act'

export type FeedbackStatus = 'pending' | 'acknowledged' | 'in_progress' | 'done' | 'wontfix'

export interface Feedback {
  id: string
  content: string
  user_id?: string | null
  author_name?: string | null
  status: FeedbackStatus
  admin_note?: string | null
  created_at: string
  updated_at: string
}

export interface RetroSession {
  id: string
  name: string
  team?: string
  sprint_number?: number
  start_date?: string
  end_date?: string
  created_at: string
}

export interface SectionOverride {
  id: SectionId
  title?: string
  subtitle?: string
  color?: string
}

export interface Board {
  id: string
  session_id: string
  template_id: string
  section_config?: SectionOverride[] | null
  created_at: string
  updated_at: string
}

export interface StickyNote {
  id: string
  board_id: string
  section_id: SectionId
  content: string
  color: string
  author_id: string
  author_name: string
  pos_x: number
  pos_y: number
  width?: number
  height?: number
  is_bold?: boolean
  is_italic?: boolean
  is_underline?: boolean
  created_at: string
  updated_at: string
  reactions?: Reaction[]
  comments?: Comment[]
}

export interface Reaction {
  id: string
  sticky_note_id?: string
  canvas_element_id?: string
  user_id: string
  user_name: string
  emoji: string
  created_at: string
}

export interface Comment {
  id: string
  sticky_note_id?: string
  canvas_element_id?: string
  author_id: string
  author_name: string
  content: string
  created_at: string
}

export interface ActionItem {
  id: string
  board_id: string
  source_sticky_note_id?: string
  title: string
  description?: string
  owner_name?: string
  due_date?: string
  status: 'Open' | 'InProgress' | 'Done'
  created_at: string
}

export interface SectionConfig {
  id: SectionId
  title: string
  emoji: string
  subtitle: string
  headerBg: string
  sectionBg: string
  sectionDarkBg: string
  defaultNoteColor: string
}

export interface CursorPosition {
  userId: string
  userName: string
  x: number
  y: number
  color: string
}

export interface OnlineUser {
  id: string
  name: string
  color: string
}

export type CanvasElementKind = 'text' | 'rect' | 'circle' | 'arrow'
export type CanvasTool = 'select' | 'text' | 'rect' | 'circle' | 'arrow'

export interface CanvasElement {
  id: string
  board_id: string
  type: CanvasElementKind
  pos_x: number
  pos_y: number
  width: number
  height: number
  x2?: number
  y2?: number
  fill_color: string
  stroke_color: string
  stroke_width: number
  text_content: string
  text_color: string
  font_size: number
  created_by: string
  created_at: string
  updated_at: string
  reactions?: Reaction[]
  comments?: Comment[]
}

export type RealtimeEvent =
  | { type: 'sticky.create'; payload: StickyNote }
  | { type: 'sticky.update'; payload: StickyNote }
  | { type: 'sticky.delete'; payload: { id: string } }
  | { type: 'reaction.toggle'; payload: Reaction & { removed?: boolean } }
  | { type: 'comment.add'; payload: Comment }
  | { type: 'cursor.move'; payload: CursorPosition }
