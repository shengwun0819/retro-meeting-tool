type Callback = () => void

const startCallbacks: Callback[] = []

export const routerEvents = {
  start() {
    startCallbacks.forEach((fn) => fn())
  },
  onStart(fn: Callback): () => void {
    startCallbacks.push(fn)
    return () => {
      const idx = startCallbacks.indexOf(fn)
      if (idx > -1) startCallbacks.splice(idx, 1)
    }
  },
}
