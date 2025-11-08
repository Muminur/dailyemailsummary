import { signIn, signOut, useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

function useDarkMode() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dark') === 'true'
      setEnabled(saved)
      document.documentElement.classList.toggle('dark', saved)
    }
  }, [])
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.toggle('dark', enabled)
      localStorage.setItem('dark', enabled)
    }
  }, [enabled])
  return [enabled, setEnabled]
}

export default function Home() {
  const { data: session, status } = useSession()
  const [enabled, setEnabled] = useDarkMode()

  if (status === 'loading') return <div className="p-8">Loading...</div>

  if (!session) {
    return (
      <main className="container mx-auto p-8 flex flex-col items-center gap-6">
        <h1 className="text-3xl font-bold">Outlook Complaint Summarizer</h1>
        <p>Sign in with Microsoft to view daily summaries.</p>
        <button onClick={() => signIn('azure-ad')} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Sign in with Microsoft</button>
      </main>
    )
  }

  return <Dashboard />
}

function Dashboard() {
  const [date, setDate] = useState(() => {
    // Use today's date in local timezone as default
    return new Date().toISOString().slice(0,10)
  })
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [data, setData] = useState({ items: [], total: 0 })
  const [loading, setLoading] = useState(false)
  const [enabled, setEnabled] = useDarkMode()

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/summaries?date=${date}&page=${page}&pageSize=${pageSize}`, { signal: controller.signal })
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        }
        const json = await res.json()
        if (json.error) {
          throw new Error(json.error)
        }
        setData(json)
      } catch (e) {
        if (e.name !== 'AbortError') console.error(e)
      } finally { setLoading(false) }
    }
    load()
    return () => controller.abort()
  }, [date, page, pageSize])

  return (
    <main className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Daily Summary</h1>
        <div className="flex items-center gap-3">
          <input className="px-3 py-2 rounded border bg-white/70 dark:bg-black/30" type="date" value={date} onChange={e=>{setPage(1);setDate(e.target.value)}} />
          <button onClick={async()=>{
            setLoading(true)
            try {
              const rebuildRes = await fetch(`/api/summaries/rebuild?date=${date}`, { method: 'POST' })
              if (!rebuildRes.ok) {
                throw new Error(`Rebuild failed: ${rebuildRes.status}`)
              }
              const rebuildData = await rebuildRes.json()
              console.log('Rebuild result:', rebuildData)
              
              // Reload data after rebuild
              const res = await fetch(`/api/summaries?date=${date}&page=${page}&pageSize=${pageSize}`)
              if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`)
              }
              const json = await res.json()
              if (json.error) {
                throw new Error(json.error)
              }
              setData(json)
            } catch (e) {
              console.error('Rebuild failed:', e)
              alert(`Rebuild failed: ${e.message}`)
            } finally {
              setLoading(false)
            }
          }} className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50" disabled={loading}>
            🔄 Rebuild
          </button>
          <button onClick={()=>setEnabled(v=>!v)} className="px-3 py-2 rounded border">{enabled ? '☀️ Light' : '🌙 Dark'}</button>
          <button onClick={()=>signOut()} className="px-3 py-2 rounded bg-red-600 text-white">Sign out</button>
        </div>
      </div>

      <div className="card p-4">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading...</span>
          </div>
        ) : data.items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No complaints found for {date}. Try selecting a different date or use the rebuild function.
          </div>
        ) : (
          <Table data={data.items} />
        )}
        <div className="mt-4 flex justify-between items-center">
          <div>Total: {data.total}</div>
          <div className="flex items-center gap-2">
            <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 rounded border disabled:opacity-50">Prev</button>
            <span>Page {page} / {Math.max(1, Math.ceil(data.total / pageSize))}</span>
            <button disabled={(page*pageSize)>=data.total} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 rounded border disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </main>
  )
}

function Badge({ status }) {
  const color = status === 'Resolved' ? 'bg-green-600' : status === 'Unresolved' ? 'bg-yellow-600' : 'bg-gray-600'
  return <span className={`px-2 py-1 rounded text-white ${color}`}>{status}</span>
}

function Table({ data }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="text-left">
            <th className="p-2">Client Name</th>
            <th className="p-2">Problem Mentioned</th>
            <th className="p-2">Solution Provided</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index)=> (
            <tr key={item.messageId || `item-${index}`} className="border-t border-white/20">
              <td className="p-2">{item.clientName || '-'}</td>
              <td className="p-2 max-w-md whitespace-pre-wrap">{item.problem || '-'}</td>
              <td className="p-2 max-w-md whitespace-pre-wrap">{item.solution || '-'}</td>
              <td className="p-2"><Badge status={item.status || 'Unknown'} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export async function getServerSideProps(context) {
  // Remove this - let client-side auth handle redirects
  return { props: { } }
}