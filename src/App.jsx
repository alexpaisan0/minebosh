import React, { useState, useEffect } from 'react'

function App() {
  const [view, setView] = useState('home')
  const [previewMessage, setPreviewMessage] = useState('')
  const [isEditingPreview, setIsEditingPreview] = useState(false)
  const [showCopyAlert, setShowCopyAlert] = useState(false)

  // --- PERSISTENCIA DE DATOS ---
  const [staffList, setStaffList] = useState(() => {
    const saved = localStorage.getItem('minebosh_staff')
    return saved ? JSON.parse(saved) : []
  })

  const [phrases, setPhrases] = useState(() => {
    const saved = localStorage.getItem('minebosh_phrases')
    if (saved) return JSON.parse(saved)
    return [
      { id: 1, type: 'verde+', text: "¡Has tenido una **semanal excelente**! Tu **compromiso** es **admirable**, sigue así.", isFirstWeek: false },
      { id: 2, type: 'verde', text: "Muy **buen trabajo** en esta **semanal**, mantén ese **ritmo** constante.", isFirstWeek: false },
      { id: 3, type: 'naranja', text: "Tu **actividad** ha estado un poco **baja**, pero confiamos en que puedes **recuperar el ritmo**.", isFirstWeek: false },
      { id: 4, type: 'rojo', text: "Una **semanal muy baja**, si la próxima semana no sacas un **verde** recibirás un **strike**.", isFirstWeek: false }
    ]
  })

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('minebosh_history')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem('minebosh_staff', JSON.stringify(staffList))
    localStorage.setItem('minebosh_phrases', JSON.stringify(phrases))
    localStorage.setItem('minebosh_history', JSON.stringify(history))
  }, [staffList, phrases, history])

  // --- ESTADOS DE FORMULARIO ---
  const [semanalData, setSemanalData] = useState({})
  const [semanalNumber, setSemanalNumber] = useState("80")
  const [semanalRange, setSemanalRange] = useState("01-08")

  // --- LÓGICA DE NEGOCIO ---
  const getPhrase = (heart, isFirst, rank) => {
    if (heart === 'rojo') return "Una **semanal muy baja**, si la próxima semana no sacas un **verde** recibirás un **strike**."
    if (heart === 'naranja') return "Tu **actividad** ha estado un poco **baja**, pero confiamos en que puedes **recuperar el ritmo**."
    if (isFirst) {
      if (rank === 'Helper') return "¡Excelente **primera semanal** como **Helper**! Sigue con esa **energía**, pronto llegará tu **recompensa**."
      if (rank === 'Jr.Mod') return "Muy buena **primera semanal** como **Jr.Mod**. ¡Estás avanzando muy bien!"
      if (rank === 'Mod') return "Gran **primera semanal** como **Mod**. Sigue demostrando tu capacidad."
      if (rank === 'Mod+') return "Excelente **primera semanal** como **Mod+**. El equipo confía en ti."
    }
    if (heart === 'verde+') return "¡Has tenido una **semanal excelente**! Tu **compromiso** es **admirable**, sigue así."
    return "Muy **buen trabajo** en esta **semanal**, mantén ese **ritmo** constante."
  }

  const handleDataChange = (id, field, value) => {
    setSemanalData(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  const autoFillSemanal = () => {
    const activeStaff = staffList.filter(s => s.status === 'Activo' || !s.status)
    const newData = { ...semanalData }
    const helpers = activeStaff.filter(s => s.rank === 'Helper')
    const mods = activeStaff.filter(s => s.rank !== 'Helper')

    const getTopId = (list) => {
      if (list.length === 0) return null
      return list.reduce((prev, curr) => {
        const scorePrev = (parseInt(newData[prev.id]?.sanciones) || 0) + (parseInt(newData[prev.id]?.tickets) || 0)
        const scoreCurr = (parseInt(newData[curr.id]?.sanciones) || 0) + (parseInt(newData[curr.id]?.tickets) || 0)
        return scoreCurr > scorePrev ? curr : prev
      }, list[0]).id
    }

    const topHelperId = getTopId(helpers)
    const topModId = getTopId(mods)

    activeStaff.forEach(staff => {
      const s = parseInt(newData[staff.id]?.sanciones) || 0
      const t = parseInt(newData[staff.id]?.tickets) || 0
      const isFirst = newData[staff.id]?.isFirstWeek || false
      let heart = 'rojo'
      if (staff.id === topHelperId || staff.id === topModId) heart = 'verde+'
      else if (s >= 80 || (s >= 50 && t >= 50)) heart = 'verde'
      else if (s >= 60) heart = 'naranja'
      else heart = 'rojo'
      newData[staff.id] = { ...newData[staff.id], heart, phrase: getPhrase(heart, isFirst, staff.rank), sanciones: s, tickets: t }
    })
    setSemanalData(newData)
  }

  const preparePreview = () => {
    let message = `@everyone \n# SEMANAL ${semanalNumber}° | SEMANA [${semanalRange}]\n\n`
    const activeStaff = staffList.filter(s => s.status === 'Activo' || !s.status)
    activeStaff.forEach(staff => {
      const data = semanalData[staff.id] || {}
      if (!data.heart) return
      const heartEmojis = {
        'verde+': '<:krakenmc_corazonverde:1350373212193554462>+',
        'verde': '<:krakenmc_corazonverde:1350373212193554462>',
        'naranja': '<:orange_heart:1286990937075224601>',
        'rojo': '<:krakenmc_corazonrojo:1350373209303810152>'
      }
      const type = staff.rank === 'Helper' ? 'mutes' : 'bans'
      message += `• <@${staff.discordId}> ${heartEmojis[data.heart]}\n`
      message += `> Hiciste una cantidad de ${data.sanciones || 0} ${type} y atendiste una cantidad de ${data.tickets || 0} tickets!, ${data.phrase}\n\n`
    })
    message += `**NOTA**: Los no puestos, son nuevos o tienen inactividad pendiente.`
    setPreviewMessage(message)
    setView('preview')
  }

  const saveToHistory = (type) => {
    const newEntry = {
      id: Date.now(),
      type: type,
      title: type === 'semanal' ? `Semanal ${semanalNumber}° | ${semanalRange}` : `Mensual | ${new Date().toLocaleString('es-ES', { month: 'long' }).toUpperCase()}`,
      date: new Date().toLocaleString(),
      content: previewMessage
    }
    setHistory([newEntry, ...history])
    alert("✅ ¡Reporte guardado en el historial!")
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(previewMessage)
    setShowCopyAlert(true)
    setTimeout(() => setShowCopyAlert(false), 2000)
  }

  // --- VISTAS ---
  if (view === 'home') {
    return (
      <div className="min-h-screen flex flex-col items-center p-6 bg-discord-dark text-white">
        <header className="mt-10 mb-20 text-center">
          <h1 className="text-8xl font-black tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-b from-white to-discord-blue drop-shadow-2xl">MINEBOSH</h1>
          <p className="text-discord-blue font-bold tracking-[0.5em] uppercase text-[10px] mt-2 opacity-50">Staff Management System</p>
        </header>
        <div className="w-full max-w-5xl space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <button onClick={() => setView('semanal')} className="group relative overflow-hidden bg-gradient-to-br from-discord-blue to-indigo-700 p-12 rounded-[2rem] shadow-2xl transition-all hover:-translate-y-2 border border-white/10">
              <span className="absolute top-4 right-6 text-8xl opacity-10 group-hover:scale-110 transition-transform">📅</span>
              <h2 className="text-4xl font-black uppercase italic text-left relative z-10">Semanal</h2>
              <p className="text-left font-bold opacity-70 uppercase text-[10px] tracking-widest mt-2 relative z-10">Generar reporte de sanciones</p>
            </button>
            <button onClick={() => setView('mensual')} className="group relative overflow-hidden bg-gradient-to-br from-discord-green to-emerald-700 p-12 rounded-[2rem] shadow-2xl transition-all hover:-translate-y-2 border border-white/10">
              <span className="absolute top-4 right-6 text-8xl opacity-10 group-hover:scale-110 transition-transform">📊</span>
              <h2 className="text-4xl font-black uppercase italic text-left relative z-10">Mensual</h2>
              <p className="text-left font-bold opacity-70 uppercase text-[10px] tracking-widest mt-2 relative z-10">Premios y Actitud Mensual</p>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button onClick={() => setView('staff')} className="bg-discord-darker hover:bg-discord-orange/20 border border-white/5 p-6 rounded-2xl flex items-center gap-4 transition-all group shadow-lg">
              <span className="text-3xl group-hover:scale-110 transition-transform">👥</span>
              <div className="text-left"><h3 className="font-black uppercase text-sm">Staff</h3><p className="text-[9px] opacity-50 font-bold uppercase tracking-tighter">Gestionar equipo</p></div>
            </button>
            <button onClick={() => setView('config-phrases')} className="bg-discord-darker hover:bg-discord-red/20 border border-white/5 p-6 rounded-2xl flex items-center gap-4 transition-all group shadow-lg">
              <span className="text-3xl group-hover:scale-110 transition-transform">💬</span>
              <div className="text-left"><h3 className="font-black uppercase text-sm">Frases</h3><p className="text-[9px] opacity-50 font-bold uppercase tracking-tighter">Personalizar mensajes</p></div>
            </button>
            <button onClick={() => setView('historial')} className="bg-discord-darker hover:bg-white/10 border border-white/5 p-6 rounded-2xl flex items-center gap-4 transition-all group shadow-lg">
              <span className="text-3xl group-hover:scale-110 transition-transform">📜</span>
              <div className="text-left"><h3 className="font-black uppercase text-sm">Historial</h3><p className="text-[9px] opacity-50 font-bold uppercase tracking-tighter">Reportes guardados</p></div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'semanal') {
    const activeStaff = staffList.filter(s => s.status === 'Activo' || !s.status)
    return (
      <div className="min-h-screen p-10 bg-discord-dark text-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-10">
            <button onClick={() => setView('home')} className="text-discord-blue font-black hover:underline">← VOLVER</button>
            <div className="flex gap-4">
              <button onClick={autoFillSemanal} className="bg-discord-orange px-6 py-3 rounded-xl font-black text-sm shadow-lg hover:brightness-110 transition-all">✨ AUTO-COMPLETAR</button>
              <button onClick={preparePreview} className="bg-discord-green px-6 py-3 rounded-xl font-black text-sm shadow-lg hover:brightness-110 transition-all">👁️ PREVISUALIZAR</button>
            </div>
          </div>
          <div className="bg-discord-darker p-8 rounded-3xl border border-white/5 shadow-2xl">
            <div className="flex gap-8 mb-12 p-6 bg-discord-black rounded-2xl border border-white/5">
              <div>
                <label className="block text-[10px] text-gray-500 font-black mb-2 uppercase">N° Semanal</label>
                <input type="text" value={semanalNumber} onChange={(e) => setSemanalNumber(e.target.value)} className="bg-discord-dark p-3 rounded-xl border border-white/10 w-24 text-center text-2xl font-black outline-none focus:border-discord-blue" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 font-black mb-2 uppercase">Rango de Fechas</label>
                <input type="text" value={semanalRange} onChange={(e) => setSemanalRange(e.target.value)} className="bg-discord-dark p-3 rounded-xl border border-white/10 w-48 text-center text-2xl font-black outline-none focus:border-discord-blue" />
              </div>
            </div>
            <div className="space-y-6">
              {activeStaff.map(staff => {
                const data = semanalData[staff.id] || { heart: '', sanciones: '', tickets: '', isFirstWeek: false, phrase: '' }
                return (
                  <div key={staff.id} className="bg-discord-black p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex flex-wrap lg:flex-nowrap gap-8 items-center">
                      <div className="w-full lg:w-1/4">
                        <h3 className="font-black text-xl">{staff.name}</h3>
                        <span className="text-[10px] font-black text-discord-blue uppercase tracking-widest">{staff.rank}</span>
                        <label className="flex items-center gap-2 mt-3 cursor-pointer text-[10px] text-gray-500 font-bold uppercase">
                          <input type="checkbox" checked={data.isFirstWeek || false} onChange={(e) => handleDataChange(staff.id, 'isFirstWeek', e.target.checked)} className="w-4 h-4 accent-discord-blue" />
                          1ª Semana
                        </label>
                      </div>
                      <div className="flex gap-4 w-full lg:w-1/3">
                        <div className="flex-1">
                          <label className="block text-[9px] text-gray-600 font-black mb-1 uppercase text-center">{staff.rank === 'Helper' ? 'Mutes' : 'Bans'}</label>
                          <input type="number" value={data.sanciones} onChange={(e) => handleDataChange(staff.id, 'sanciones', e.target.value)} className="w-full bg-discord-dark p-3 rounded-xl border border-white/5 text-center font-black outline-none" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[9px] text-gray-600 font-black mb-1 uppercase text-center">Tickets</label>
                          <input type="number" value={data.tickets} onChange={(e) => handleDataChange(staff.id, 'tickets', e.target.value)} className="w-full bg-discord-dark p-3 rounded-xl border border-white/5 text-center font-black outline-none" />
                        </div>
                      </div>
                      <div className="w-full lg:flex-1 flex justify-center gap-2">
                        {['verde+', 'verde', 'naranja', 'rojo'].map(h => (
                          <button key={h} onClick={() => {
                            const phrase = getPhrase(h, data.isFirstWeek || false, staff.rank)
                            setSemanalData(prev => ({ ...prev, [staff.id]: { ...prev[staff.id], heart: h, phrase } }))
                          }} className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl transition-all border-2 ${data.heart === h ? 'scale-110 border-white opacity-100 shadow-lg' : 'border-transparent opacity-30 hover:opacity-100'} ${h === 'verde+' || h === 'verde' ? 'bg-discord-green' : h === 'naranja' ? 'bg-discord-orange' : 'bg-discord-red'}`}>
                            {h === 'verde+' ? '💚+' : h === 'verde' ? '💚' : h === 'naranja' ? '🧡' : '❤️'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'preview') {
    return (
      <div className="min-h-screen p-10 bg-discord-black text-white flex items-center justify-center relative">
        {showCopyAlert && <div className="absolute top-10 bg-discord-green text-white px-8 py-4 rounded-2xl font-black shadow-2xl animate-bounce z-50">✅ ¡MENSAJE COPIADO!</div>}
        <div className="max-w-3xl w-full bg-discord-darker p-10 rounded-3xl border border-white/10 shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <button onClick={() => setView('semanal')} className="text-discord-blue font-black hover:underline text-sm">← VOLVER</button>
            <h2 className="text-lg font-black uppercase tracking-widest text-discord-blue italic">Vista Previa</h2>
          </div>
          {isEditingPreview ? (
            <textarea value={previewMessage} onChange={(e) => setPreviewMessage(e.target.value)} className="w-full bg-discord-black p-6 rounded-2xl border border-discord-blue font-mono text-sm whitespace-pre-wrap mb-8 h-[450px] outline-none resize-none leading-relaxed" />
          ) : (
            <div className="bg-discord-black p-8 rounded-2xl border border-white/5 font-mono text-sm whitespace-pre-wrap mb-8 max-h-[450px] overflow-y-auto leading-relaxed">{previewMessage}</div>
          )}
          <div className="flex gap-4">
            <button onClick={() => setIsEditingPreview(!isEditingPreview)} className={`flex-1 p-4 rounded-2xl font-black uppercase tracking-widest transition-all ${isEditingPreview ? 'bg-discord-orange hover:brightness-110' : 'bg-gray-700 hover:bg-gray-600'}`}>{isEditingPreview ? '✅ GUARDAR CAMBIOS' : '✏️ MODIFICAR'}</button>
            <button onClick={() => saveToHistory('semanal')} className="flex-1 bg-discord-green hover:brightness-110 p-4 rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all">💾 GUARDAR</button>
            <button onClick={copyToClipboard} className="flex-1 bg-discord-blue hover:bg-indigo-600 p-4 rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all">📋 COPIAR</button>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'historial') {
    return (
      <div className="min-h-screen p-10 bg-discord-dark text-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-10">
            <button onClick={() => setView('home')} className="text-discord-blue font-black hover:underline">← VOLVER</button>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter">Historial</h1>
            <button onClick={() => { if(confirm("¿Borrar todo?")) setHistory([]) }} className="text-discord-red text-xs font-bold uppercase hover:underline">Limpiar</button>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {history.length === 0 ? (
              <div className="text-center py-20 opacity-30 font-black uppercase tracking-widest">Vacío</div>
            ) : (
              history.map(item => (
                <div key={item.id} className="bg-discord-darker p-6 rounded-2xl border border-white/5 flex justify-between items-center group hover:border-white/20 transition-all">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${item.type === 'semanal' ? 'bg-discord-blue' : 'bg-discord-green'}`}>{item.type}</span>
                      <h3 className="font-black text-xl">{item.title}</h3>
                    </div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{item.date}</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => { setPreviewMessage(item.content); setView('preview') }} className="bg-discord-black hover:bg-white/10 p-3 rounded-xl transition-all font-bold text-xs uppercase">Ver</button>
                    <button onClick={() => { navigator.clipboard.writeText(item.content); alert("📋 Copiado") }} className="bg-discord-blue hover:brightness-110 p-3 rounded-xl transition-all font-bold text-xs uppercase">Copiar</button>
                    <button onClick={() => setHistory(history.filter(h => h.id !== item.id))} className="text-gray-600 hover:text-discord-red p-3 transition-colors">🗑️</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }

  if (view === 'staff') {
    return (
      <div className="min-h-screen p-10 bg-discord-dark text-white">
        <div className="max-w-6xl mx-auto">
          <button onClick={() => setView('home')} className="mb-8 text-discord-blue font-black">← VOLVER</button>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="bg-discord-darker p-8 rounded-3xl border border-white/5 shadow-2xl h-fit">
              <h2 className="text-2xl font-black mb-8 text-discord-orange uppercase italic">Registrar Staff</h2>
              <form onSubmit={(e) => {
                e.preventDefault()
                const name = e.target.name.value; const discordId = e.target.discordId.value; const rank = e.target.rank.value
                if (!name || !discordId) return
                setStaffList([...staffList, { id: Date.now(), name, discordId, rank, status: 'Activo' }])
                e.target.reset()
              }} className="space-y-4">
                <input name="name" type="text" placeholder="Nombre" className="w-full bg-discord-black p-4 rounded-xl border border-white/10 outline-none focus:border-discord-orange" />
                <input name="discordId" type="text" placeholder="ID Discord" className="w-full bg-discord-black p-4 rounded-xl border border-white/10 outline-none focus:border-discord-orange" />
                <select name="rank" className="w-full bg-discord-black p-4 rounded-xl border border-white/10 outline-none">
                  <option>Helper</option><option>Jr.Mod</option><option>Mod</option><option>Mod+</option>
                </select>
                <button type="submit" className="w-full bg-discord-orange p-4 rounded-xl font-black uppercase tracking-widest shadow-lg hover:brightness-110 transition-all">Registrar</button>
              </form>
            </div>
            <div className="lg:col-span-2 bg-discord-darker p-8 rounded-3xl border border-white/5 shadow-2xl">
              <h2 className="text-2xl font-black mb-8 uppercase italic">Lista de Staff ({staffList.length})</h2>
              <div className="space-y-4">
                {staffList.map(s => (
                  <div key={s.id} className={`bg-discord-black p-5 rounded-2xl flex justify-between items-center border-l-4 transition-all ${s.status === 'Inactivo' ? 'border-gray-600 opacity-50' : 'border-discord-blue'}`}>
                    <div><p className="font-black text-lg">{s.name}</p><p className="text-[10px] text-gray-500 font-bold uppercase">{s.rank} • {s.discordId}</p></div>
                    <div className="flex items-center gap-3">
                      <select value={s.status || 'Activo'} onChange={(e) => setStaffList(staffList.map(x => x.id === s.id ? { ...x, status: e.target.value } : x))} className="bg-discord-dark p-2 rounded-lg text-[10px] font-black uppercase outline-none border border-white/5">
                        <option value="Activo">✅ Activo</option><option value="Inactivo">⛔ Inactivo</option>
                      </select>
                      <button onClick={() => setStaffList(staffList.filter(x => x.id !== s.id))} className="bg-red-500/10 hover:bg-red-500/20 p-2 rounded-lg text-red-500 transition-all">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'config-phrases') {
    return (
      <div className="min-h-screen p-10 bg-discord-dark text-white">
        <div className="max-w-6xl mx-auto">
          <button onClick={() => setView('home')} className="mb-8 text-discord-blue font-black">← VOLVER</button>
          <h1 className="text-4xl font-black mb-10 text-discord-red italic uppercase tracking-tighter">Frases</h1>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="bg-discord-darker p-8 rounded-3xl border border-white/5 h-fit shadow-2xl">
              <h2 className="text-xl font-black mb-6 uppercase text-discord-red">Nueva Frase</h2>
              <form onSubmit={(e) => {
                e.preventDefault(); const text = e.target.text.value; const type = e.target.type.value
                if (!text) return
                setPhrases([...phrases, { id: Date.now(), text, type }])
                e.target.reset()
              }} className="space-y-4">
                <textarea name="text" placeholder="Escribe aquí..." className="w-full bg-discord-black p-4 rounded-xl border border-white/10 h-32 text-sm outline-none focus:border-discord-red resize-none" />
                <select name="type" className="w-full bg-discord-black p-3 rounded-xl border border-white/10 text-xs font-bold outline-none">
                  <option value="verde+">Verde+</option><option value="verde">Verde</option><option value="naranja">Naranja</option><option value="rojo">Rojo</option>
                </select>
                <button type="submit" className="w-full bg-discord-red p-4 rounded-xl font-black uppercase tracking-widest shadow-lg hover:brightness-110 transition-all">Guardar</button>
              </form>
            </div>
            <div className="lg:col-span-2 space-y-4">
              {['verde+', 'verde', 'naranja', 'rojo'].map(type => (
                <div key={type} className="bg-discord-darker p-6 rounded-2xl border border-white/5">
                  <h3 className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-30">{type}</h3>
                  <div className="space-y-2">
                    {phrases.filter(p => p.type === type).map(p => (
                      <div key={p.id} className="bg-discord-black p-4 rounded-xl flex justify-between items-center border border-transparent hover:border-white/5 transition-all">
                        <p className="text-xs font-bold flex-1">{p.text}</p>
                        <button onClick={() => setPhrases(phrases.filter(x => x.id !== p.id))} className="text-gray-700 hover:text-discord-red ml-4 transition-colors">🗑️</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default App