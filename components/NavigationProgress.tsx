'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { routerEvents } from '@/lib/navigation-events'

export default function NavigationProgress() {
  const barRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const mountedRef = useRef(false)

  // When navigation completes (pathname changes), finish the bar
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    const bar = barRef.current
    if (!bar) return
    bar.style.transition = 'width 0.2s ease, opacity 0.3s ease 0.15s'
    bar.style.width = '100%'
    const timer = setTimeout(() => {
      if (!barRef.current) return
      barRef.current.style.transition = 'none'
      barRef.current.style.opacity = '0'
      setTimeout(() => {
        if (!barRef.current) return
        barRef.current.style.width = '0%'
      }, 300)
    }, 150)
    return () => clearTimeout(timer)
  }, [pathname])

  // Listen for navigation start
  useEffect(() => {
    return routerEvents.onStart(() => {
      const bar = barRef.current
      if (!bar) return
      bar.style.transition = 'none'
      bar.style.width = '0%'
      bar.style.opacity = '1'
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!barRef.current) return
          barRef.current.style.transition = 'width 1.8s cubic-bezier(0.1, 0.4, 0.1, 1)'
          barRef.current.style.width = '80%'
        })
      })
    })
  }, [])

  return (
    <div
      ref={barRef}
      className="fixed top-0 left-0 z-[9999] h-[3px] rounded-r-full pointer-events-none bg-gradient-to-r from-blue-500 via-purple-500 to-blue-400 dark:from-cyan-400 dark:via-blue-400 dark:to-purple-400"
      style={{ width: '0%', opacity: 0 }}
    />
  )
}
