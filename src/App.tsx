// src/App.tsx
import React, { useEffect, useMemo, useRef, useState } from "react"
import { EVENTS, DAY_ORDER, type EventItem } from "./Data/events"

const SGT = "Asia/Singapore"
const fmtTime = (d: string | Date) =>
  new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: SGT }).format(new Date(d))
const fmtDate = (d: string | Date) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "2-digit", month: "short", timeZone: SGT }).format(new Date(d))
const durMin = (a: string, b: string) => Math.round((+new Date(b) - +new Date(a)) / 60000)
const overlaps = (a: EventItem, b: EventItem) => new Date(a.start) < new Date(b.end) && new Date(b.start) < new Date(a.end)

function useLS<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial } catch { return initial }
  })
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)) } catch {} }, [key, v])
  return [v, setV] as const
}

const catColor: Record<string, string> = {
  Run:"bg-emerald-500", Expo:"bg-sky-500", Conference:"bg-indigo-500", Meetup:"bg-cyan-500",
  Reception:"bg-fuchsia-500", Networking:"bg-teal-500", Panel:"bg-amber-500", Showcase:"bg-violet-500",
  Cafe:"bg-stone-500", Lunch:"bg-lime-500", Festival:"bg-rose-500", Dev:"bg-blue-700",
  Food:"bg-orange-600", Party:"bg-pink-600", Dinner:"bg-red-500", PopUp:"bg-stone-700",
}

function MapPane() {
  const [src, setSrc] = useLS<string | null>("mapSrc", "/mrt-map.jpg")
  const [scale, setScale] = useState(1)
  const [off, setOff] = useState({ x: 0, y: 0 })
  const drag = useRef(false)
  const last = useRef({ x: 0, y: 0 })
  const onWheel = (e: React.WheelEvent) => { e.preventDefault(); setScale(s => Math.min(3, Math.max(0.5, s + (e.deltaY > 0 ? -0.1 : 0.1)))) }
  const onDown = (e: React.MouseEvent) => { drag.current = true; last.current = { x: e.clientX, y: e.clientY } }
  const onUp = () => { drag.current = false }
  const onMove = (e: React.MouseEvent) => {
    if (!drag.current) return
    const dx = e.clientX - last.current.x, dy = e.clientY - last.current.y
    last.current = { x: e.clientX, y: e.clientY }
    setOff(o => ({ x: o.x + dx, y: o.y + dy }))
  }
  return (
    <div className="relative h-full w-full bg-neutral-900 rounded-2xl overflow-hidden">
      <div className="absolute top-2 left-2 z-10 flex gap-2">
        <label className="px-3 py-1.5 rounded-xl bg-white/10 text-white backdrop-blur cursor-pointer">Upload MRT Map
          <input type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (!f) return;
              const r = new FileReader(); r.onload = () => setSrc(String(r.result)); r.readAsDataURL(f) }} />
        </label>
        <button onClick={() => { setScale(1); setOff({ x: 0, y: 0 }) }} className="px-3 py-1.5 rounded-xl bg-white/10 text-white">Reset</button>
      </div>
      {src ? (
        <div className="h-full w-full" onWheel={onWheel} onMouseDown={onDown} onMouseUp={onUp} onMouseMove={onMove}>
          <img src={src} alt="MRT Map" className="select-none" draggable={false}
               style={{ transform: `translate(${off.x}px,${off.y}px) scale(${scale})`, transformOrigin: "center center" }} />
        </div>
      ) : (
        <div className="h-full w-full grid place-items-center text-white/80 p-8 text-center">
          <div><div className="text-xl font-semibold mb-2">MRT Map</div><p className="max-w-sm mx-auto">Add your map via Upload.</p></div>
        </div>
      )}
    </div>
  )
}

function DayTimeline({events, day, onlyPref, search}:{events:EventItem[],day:string,onlyPref:boolean,search:string}) {
  const list = useMemo(() =>
    events.filter(e => e.day === day)
      .filter(e => !onlyPref || e.preferred)
      .filter(e => !search || (e.name + " " + e.venue + " " + (e.nearestMRT || "")).toLowerCase().includes(search.toLowerCase()))
      .sort((a,b)=>+new Date(a.start)-+new Date(b.start))
  , [events, day, onlyPref, search])

  const conflicts = new Set<string>()
  list.forEach((a,i)=> list.forEach((b,j)=>{ if(i!==j && overlaps(a,b)) {conflicts.add(a.id); conflicts.add(b.id)} }))

  return (
    <div className="space-y-3">
      {list.map(ev => (
        <div key={ev.id} className={`rounded-xl p-4 bg-white shadow-sm border ${conflicts.has(ev.id)?'border-red-300':'border-neutral-200'} flex gap-3 items-start`}>
          <div className={`w-2 rounded ${catColor[ev.category]||'bg-gray-400'}`} />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-sm text-neutral-500">{fmtDate(ev.start)}</div>
              <div className="font-semibold">{fmtTime(ev.start)} – {fmtTime(ev.end)} <span className="text-neutral-500">({durMin(ev.start,ev.end)}m)</span></div>
              {ev.preferred && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">PREFERRED</span>}
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">{ev.category}</span>
              {ev.area && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{ev.area}</span>}
            </div>
            <div className="mt-1 text-[15px]">{ev.name}</div>
            <div className="text-sm text-neutral-600">{ev.venue}{ev.nearestMRT && ` • Nearest MRT: ${ev.nearestMRT}`}</div>
            {ev.maps && <a href={ev.maps} target="_blank" className="text-sm text-blue-600 underline">Open map</a>}
          </div>
        </div>
      ))}
    </div>
  )
}

function suggest(events: EventItem[], day: string, onlyPref: boolean) {
  const src = events.filter(e => e.day === day && (!onlyPref || e.preferred)).sort((a,b)=>+new Date(a.start)-+new Date(b.start))
  const score = (e: EventItem) => (e.preferred ? 10 : 5) + (e.area ? 1 : 0)
  const chosen: EventItem[] = []
  for (const ev of src) if (!chosen.some(c => overlaps(c, ev))) chosen.push(ev)
  for (const ev of src) {
    const ov = chosen.filter(c => overlaps(c, ev))
    if (ov.length === 0) { if (!chosen.includes(ev)) chosen.push(ev); continue }
    const worst = ov.reduce((m, c) => (score(c) < score(m) ? c : m), ov[0])
    if (score(ev) > score(worst)) chosen.splice(chosen.findIndex(c => c.id === worst.id), 1, ev)
  }
  return chosen.sort((a,b)=>+new Date(a.start)-+new Date(b.start))
}

function exportICS(list: EventItem[]) {
  if (!list.length) return
  const lines = [
    "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Token2049 Route Planner//EN",
    ...list.flatMap(e => [
      "BEGIN:VEVENT",
      `UID:${e.id}@token2049planner`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').split('.')[0]}Z`,
      `DTSTART:${new Date(e.start).toISOString().replace(/[-:]/g,'').split('.')[0]}Z`,
      `DTEND:${new Date(e.end).toISOString().replace(/[-:]/g,'').split('.')[0]}Z`,
      `SUMMARY:${e.name}`,
      `LOCATION:${e.venue}`,
      `DESCRIPTION:${e.preferred ? 'PREFERRED. ' : ''}${e.nearestMRT ? 'Nearest MRT: '+e.nearestMRT : ''}`,
      "END:VEVENT"
    ]),
    "END:VCALENDAR"
  ].join("\r\n")
  const blob = new Blob([lines], { type: "text/calendar" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url; a.download = `token2049-${fmtDate(list[0].start).replace(/\s+/g,'_')}.ics`
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
}

export default function App() {
  const [events] = useLS<EventItem[]>("events", EVENTS)
  const [day, setDay] = useLS<string>("day", DAY_ORDER[0])
  const [onlyPref, setOnlyPref] = useLS<boolean>("onlyPref", true)
  const [search, setSearch] = useState("")
  const [mode, setMode] = useState<"planner" | "checklist">("planner")
  const itinerary = useMemo(() => suggest(events, day, onlyPref), [events, day, onlyPref])

  return (
    <div className="h-screen w-full p-4 md:p-6 bg-neutral-50 text-neutral-900">
      <div className="max-w-[1400px] mx-auto h-full grid grid-rows-[auto,1fr] gap-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold">Token2049 Route Planner</div>
            <span className="text-sm px-2 py-1 rounded-lg bg-neutral-200">SGT</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setMode("planner")} className={`px-3 py-1.5 rounded-xl ${mode==='planner'?'bg-neutral-900 text-white':'bg-white border'}`}>Planner</button>
            <button onClick={()=>setMode("checklist")} className={`px-3 py-1.5 rounded-xl ${mode==='checklist'?'bg-neutral-900 text-white':'bg-white border'}`}>Printable checklist</button>
          </div>
        </div>

        {mode === "planner" ? (
          <div className="grid grid-cols-1 xl:grid-cols-[360px,1fr,400px] gap-4 h-full">
            {/* left controls */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border flex flex-col gap-3">
              <div className="font-semibold">Day</div>
              <div className="flex gap-2">
                {DAY_ORDER.map(d => (
                  <button key={d} onClick={()=>setDay(d)}
                    className={`px-3 py-1.5 rounded-xl border ${day===d?'bg-neutral-900 text-white':'bg-white'}`}>
                    {new Intl.DateTimeFormat('en-GB',{weekday:'short', day:'2-digit', month:'short'}).format(new Date(d))}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 mt-2">
                <input type="checkbox" checked={onlyPref} onChange={e=>setOnlyPref(e.target.checked)} />
                <span>Show PREFERRED only</span>
              </label>

              <input placeholder="Search name/venue/MRT" value={search} onChange={e=>setSearch(e.target.value)} className="border rounded-xl px-3 py-2" />

              <div className="mt-2">
                <div className="font-semibold mb-2">Suggested itinerary</div>
                <div className="space-y-2 max-h-[40vh] overflow-auto pr-1">
                  {itinerary.map((e, i) => (
                    <div key={e.id} className="rounded-xl border p-3 bg-neutral-50">
                      <div className="text-sm text-neutral-600">{fmtTime(e.start)} – {fmtTime(e.end)} · {e.category}</div>
                      <div className="font-medium">{e.name}</div>
                      <div className="text-xs text-neutral-600">{e.venue}{e.nearestMRT ? ` • ${e.nearestMRT}` : ""}</div>
                      {i>0 && itinerary[i-1].nearestMRT && e.nearestMRT && (
                        <div className="mt-1 text-xs text-blue-700">MRT hop: {itinerary[i-1].nearestMRT.split(' ')[0]} → {e.nearestMRT.split(' ')[0]}</div>
                      )}
                    </div>
                  ))}
                </div>
                {!!itinerary.length && (
                  <button onClick={()=>exportICS(itinerary)} className="mt-2 w-full px-3 py-2 rounded-xl bg-blue-600 text-white">Export this day to .ics</button>
                )}
              </div>

              <div className="mt-auto text-xs text-neutral-500">
                Tip: Use the map pane to zoom & keep spatial context.
              </div>
            </div>

            {/* map */}
            <MapPane />

            {/* right timeline */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border overflow-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">
                  Timeline — {new Intl.DateTimeFormat('en-GB',{weekday:'long', day:'2-digit', month:'long'}).format(new Date(day))}
                </div>
                <div className="text-sm text-neutral-500">{onlyPref ? 'PREFERRED view' : ''}</div>
              </div>
              <DayTimeline events={events} day={day} onlyPref={onlyPref} search={search} />
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border overflow-auto p-6 print:p-0">
            {DAY_ORDER.map(d => (
              <div key={d} className="mb-8 break-inside-avoid">
                <div className="text-xl font-semibold mb-3">
                  {d} — {new Intl.DateTimeFormat('en-GB',{weekday:'long', day:'2-digit', month:'long'}).format(new Date(d))}
                </div>
                <div className="space-y-2">
                  {events.filter(e=>e.day===d).sort((a,b)=>+new Date(a.start)-+new Date(b.start)).map(e => (
                    <div key={e.id} className="flex items-start gap-3">
                      <input type="checkbox" className="mt-1" />
                      <div className="flex-1">
                        <div className="font-medium">{fmtTime(e.start)} – {fmtTime(e.end)} · {e.name} {e.preferred ? '· PREFERRED' : ''}</div>
                        <div className="text-sm text-neutral-600">{e.venue}{e.nearestMRT ? ` • Nearest MRT: ${e.nearestMRT}` : ""}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
