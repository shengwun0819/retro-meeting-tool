'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react'
import { getAuthClient } from '@/lib/supabase'
import { USER_COLORS } from '@/lib/constants'

interface User {
  id: string
  name: string
  color: string
}

interface UserContextValue {
  user: User | null       // null = not chosen nickname yet this session → show NicknameModal
  authName: string        // Google display name, used to pre-fill NicknameModal
  authEmail: string       // Google email, used for display in UI
  setUserName: (name: string) => void
  clearUser: () => void
  signOut: () => Promise<void>
}

const UserContext = createContext<UserContextValue>({
  user: null,
  authName: '',
  authEmail: '',
  setUserName: () => {},
  clearUser: () => {},
  signOut: async () => {},
})

const STORAGE_KEY = 'retro_nickname'

/** Derive a consistent color from a user's auth UUID */
function getColorFromId(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return USER_COLORS[hash % USER_COLORS.length]
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  // Ref so setUserName always sees the latest auth ID regardless of render timing
  const authUserIdRef = useRef('')

  useEffect(() => {
    const supabase = getAuthClient()

    supabase.auth.getUser().then(({ data: { user: authUser }, error }) => {
      if (error) {
        // Stale or invalid refresh token — clear it to stop repeated errors
        supabase.auth.signOut()
        return
      }
      if (!authUser) return
      const id = authUser.id
      const googleName =
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        authUser.email?.split('@')[0] ||
        sessionStorage.getItem('retro_guest_name') ||
        'Guest'
      const email = authUser.email ?? ''
      const color = getColorFromId(id)

      authUserIdRef.current = id
      setAuthName(googleName)
      setAuthEmail(email)

      const storedNickname = sessionStorage.getItem(STORAGE_KEY)
      if (storedNickname) {
        setUser({ id, name: storedNickname, color })
      }
      // No stored nickname → user stays null → NicknameModal will appear
    })
  }, [])

  const setUserName = useCallback((name: string) => {
    const id = authUserIdRef.current
    if (!id) return
    sessionStorage.setItem(STORAGE_KEY, name)
    setUser({ id, name, color: getColorFromId(id) })
  }, []) // ref access needs no dependency

  const clearUser = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }, [])

  const signOut = useCallback(async () => {
    sessionStorage.removeItem(STORAGE_KEY)
    const supabase = getAuthClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }, [])

  return (
    <UserContext.Provider value={{ user, authName, authEmail, setUserName, clearUser, signOut }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
