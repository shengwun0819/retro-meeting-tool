export default function BoardLoading() {
  return (
    <div className="min-h-screen bg-gray-100 animate-fade-in"
      style={{
        backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* Toolbar skeleton */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b-2 border-gray-200 shadow-md h-14 flex items-center px-4 gap-3">
        <div className="w-6 h-6 rounded bg-gray-200 animate-pulse" />
        <div className="w-px h-6 bg-gray-200" />
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gray-200 animate-pulse" />
          <div className="w-28 h-4 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="w-px h-6 bg-gray-200" />
        <div className="w-24 h-8 rounded-lg bg-gray-200 animate-pulse" />
        <div className="w-16 h-8 rounded-lg bg-gray-200 animate-pulse" />
        <div className="flex-1" />
        <div className="w-20 h-8 rounded-lg bg-gray-200 animate-pulse" />
        <div className="w-16 h-8 rounded-lg bg-gray-200 animate-pulse" />
        <div className="w-16 h-8 rounded-lg bg-gray-200 animate-pulse" />
        <div className="w-px h-6 bg-gray-200" />
        <div className="flex gap-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-7 h-7 rounded-full bg-gray-200 animate-pulse -ml-1 first:ml-0" />
          ))}
        </div>
      </div>

      {/* Board columns skeleton */}
      <div className="pt-14 grid grid-cols-2 xl:grid-cols-4 gap-0 h-[calc(100vh-3.5rem)]">
        {[
          { color: 'bg-emerald-50', border: 'border-emerald-200', label: 'Continue ✅' },
          { color: 'bg-rose-50', border: 'border-rose-200', label: 'Stop 🛑' },
          { color: 'bg-amber-50', border: 'border-amber-200', label: 'Invent 💡' },
          { color: 'bg-sky-50', border: 'border-sky-200', label: 'Act 💪' },
        ].map((section, i) => (
          <div key={i} className={`${section.color} border-r last:border-r-0 ${section.border} flex flex-col p-4 gap-3 overflow-hidden`}>
            {/* Section header */}
            <div className="flex items-center justify-between mb-1">
              <div className="w-24 h-5 rounded bg-gray-300 animate-pulse opacity-60" />
              <div className="w-6 h-6 rounded bg-gray-300 animate-pulse opacity-60" />
            </div>
            {/* Fake sticky notes */}
            {[...Array(i % 2 === 0 ? 3 : 2)].map((_, j) => (
              <div
                key={j}
                className="w-full rounded-lg shadow-sm p-3 animate-pulse"
                style={{
                  backgroundColor: ['#fef08a', '#bbf7d0', '#fed7aa', '#bfdbfe'][i],
                  animationDelay: `${j * 0.1}s`,
                  minHeight: j === 0 ? '80px' : '60px',
                }}
              >
                <div className="w-3/4 h-3 rounded bg-white/60 mb-2" />
                <div className="w-1/2 h-3 rounded bg-white/60 mb-3" />
                <div className="w-1/4 h-2 rounded bg-white/40" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
