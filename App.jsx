import { useState, useEffect } from "react";

const ADMIN_PASSWORD = "jpacademy2024";
const DEFAULT_CAP = 6;
const ALL_DAYS = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
const BASE_HOURS = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","16:00","17:00","18:00","19:00","20:00"];
const SUBJECTS = ["Primaria","Aritmética","Álgebra","Trigonometría","Geometría Analítica","Cálculo Diferencial","Cálculo Integral"];
const SUBJECT_COLORS = {
  "Primaria":"bg-sky-900/50 text-sky-300 border-sky-700/50",
  "Aritmética":"bg-blue-900/50 text-blue-300 border-blue-700/50",
  "Álgebra":"bg-purple-900/50 text-purple-300 border-purple-700/50",
  "Trigonometría":"bg-pink-900/50 text-pink-300 border-pink-700/50",
  "Geometría Analítica":"bg-red-900/50 text-red-300 border-red-700/50",
  "Cálculo Diferencial":"bg-amber-900/50 text-amber-300 border-amber-700/50",
  "Cálculo Integral":"bg-emerald-900/50 text-emerald-300 border-emerald-700/50",
};
const BGFORMULAS = [
  "∫₀^∞ e^(-x²)dx = √π/2","lim_{x→0} sin(x)/x = 1","e^(iπ) + 1 = 0",
  "∑1/n² = π²/6","∇²φ = 0","det(A) = ad−bc","dy/dx = ny^(n−1)",
];

const toMin = (h) => { const [a,b] = h.split(":").map(Number); return a*60+b; };
const sortH  = (arr) => [...arr].sort((a,b)=>toMin(a)-toMin(b));
const NOW_DAY = "Lunes", NOW_MIN = 10*60+30;
const isPast = (day,hour) => {
  const di=ALL_DAYS.indexOf(day), ni=ALL_DAYS.indexOf(NOW_DAY);
  if(di<ni) return true;
  if(di===ni) return toMin(hour)+60<=NOW_MIN;
  return false;
};

const initState = () => ({
  globalCap: DEFAULT_CAP,
  slots: Object.fromEntries(ALL_DAYS.map(d=>[d,{}])),
  extraHours: Object.fromEntries(ALL_DAYS.map(d=>[d,[]])),
});

const dayHours = (state,day) => sortH([...BASE_HOURS,...(state.extraHours[day]||[])]);
const allHours = (state) => sortH([...new Set([...BASE_HOURS,...ALL_DAYS.flatMap(d=>state.extraHours[d])])]);

const ChalkBg = () => (
  <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
    {BGFORMULAS.map((f,i)=>(
      <span key={i} className="absolute text-white font-mono whitespace-nowrap"
        style={{top:`${8+i*12}%`,left:`${(i*23+4)%86}%`,opacity:0.04,transform:`rotate(${-6+i*3}deg)`,fontSize:11}}>
        {f}
      </span>
    ))}
    <div className="absolute inset-0" style={{
      backgroundImage:"linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)",
      backgroundSize:"60px 60px"
    }}/>
  </div>
);

export default function JPAcademy() {
  const [state,setState] = useState(initState);
  const [mode,setMode]   = useState("student");
  const [pw,setPw]       = useState("");
  const [pwErr,setPwErr] = useState(false);

  const setSlot = (day,hour,patch) =>
    setState(p=>({...p,slots:{...p.slots,[day]:{...p.slots[day],[hour]:{...(p.slots[day][hour]||{enrollments:[]}),...patch}}}}));

  const addEnrollment = (day,hour,name) =>
    setState(p=>{
      const s=p.slots[day][hour]||{enrollments:[]};
      const cap=s.cap??p.globalCap;
      const enrollments=[...(s.enrollments||[]),{id:Date.now(),name}];
      return {...p,slots:{...p.slots,[day]:{...p.slots[day],[hour]:{...s,enrollments,open:enrollments.length<cap?s.open:false}}}};
    });

  const removeEnrollment = (day,hour,id) =>
    setState(p=>{
      const s=p.slots[day][hour];
      return {...p,slots:{...p.slots,[day]:{...p.slots[day],[hour]:{...s,enrollments:s.enrollments.filter(e=>e.id!==id)}}}};
    });

  const addExtraHour = (day,hour) => {
    if(!hour||!day) return;
    const h=hour.trim();
    if(state.extraHours[day].includes(h)||BASE_HOURS.includes(h)) return;
    setState(p=>({...p,extraHours:{...p.extraHours,[day]:[...p.extraHours[day],h]}}));
  };

  const login = () => { if(pw===ADMIN_PASSWORD){setMode("admin");setPwErr(false);setPw("");}else setPwErr(true); };

  return (
    <div className="min-h-screen font-sans relative overflow-hidden" style={{background:"#0a0a0a"}}>
      <ChalkBg/>
      <div className="relative z-10">
        {mode==="student" && <StudentView state={state} dayHours={dayHours} allHours={allHours} addEnrollment={addEnrollment} onAdmin={()=>setMode("login")}/>}
        {mode==="login"   && <LoginView pw={pw} setPw={setPw} onLogin={login} err={pwErr} onBack={()=>setMode("student")}/>}
        {mode==="admin"   && <AdminView state={state} setState={setState} setSlot={setSlot} removeEnrollment={removeEnrollment} addExtraHour={addExtraHour} dayHours={dayHours} allHours={allHours} onLogout={()=>setMode("student")}/>}
      </div>
    </div>
  );
}

// ══ STUDENT ══════════════════════════════════════════════
function StudentView({state,dayHours,allHours,addEnrollment,onAdmin}){
  const [step,setStep]       = useState("calendar");
  const [selected,setSelected] = useState(null);
  const [name,setName]       = useState("");
  const [subject,setSubject] = useState("");
  const [filterDay,setFilterDay] = useState("Todos");

  const visibleDays = filterDay==="Todos" ? ALL_DAYS : [filterDay];

  const getStatus = (day,hour) => {
    const s=state.slots[day][hour];
    if(!s||!s.open||isPast(day,hour)) return "closed";
    if((s.enrollments||[]).length>=(s.cap??state.globalCap)) return "full";
    return "open";
  };

  const anyOpen = ALL_DAYS.some(d=>dayHours(state,d).some(h=>getStatus(d,h)==="open"));
  const hours   = allHours(state);

  const handleSelect = (day,hour) => {
    const s=state.slots[day][hour];
    setSelected({day,hour,slotSubject:s?.subject||""});
    setSubject(s?.subject||"");
    setStep("form");
  };
  const handleSubmit = () => {
    if(!name.trim()) return;
    if(!selected.slotSubject && !subject) return;
    addEnrollment(selected.day,selected.hour,name.trim());
    setStep("confirm");
  };
  const reset = ()=>{ setStep("calendar"); setSelected(null); setName(""); setSubject(""); };

  const iCls = "w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all";
  const lCls = "block text-xs font-bold text-white/40 uppercase tracking-widest mb-2";

  return (
    <div className="min-h-screen">
      {/* header */}
      <div className="border-b border-white/8 px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full border border-white/25 flex items-center justify-center" style={{background:"rgba(255,255,255,0.05)"}}>
              <span className="text-white font-bold" style={{fontFamily:"Georgia,serif"}}>Jπ</span>
            </div>
            <div>
              <p className="text-white font-bold tracking-wide" style={{fontFamily:"Georgia,serif"}}>JΠ The Academy</p>
              <p className="text-white/30 text-xs tracking-widest uppercase">Agenda tu clase</p>
            </div>
          </div>
          <button onClick={onAdmin} className="text-white/12 hover:text-white/35 text-xs transition-all">Admin</button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {step==="calendar" && (
          <>
            {/* filters */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-5 text-xs text-white/35">
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"/>Disponible</span>
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-400/60 inline-block"/>Lleno</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {["Todos",...ALL_DAYS].map(d=>(
                  <button key={d} onClick={()=>setFilterDay(d)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${filterDay===d?"bg-white text-black border-white":"border-white/15 text-white/40 hover:border-white/40 hover:text-white/70"}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {!anyOpen ? (
              <div className="text-center py-24">
                <p className="text-5xl mb-5">📐</p>
                <p className="text-white/40 font-bold text-lg" style={{fontFamily:"Georgia,serif"}}>No hay horarios disponibles aún</p>
                <p className="text-white/20 text-sm mt-2">Pronto se abrirán nuevos espacios.</p>
              </div>
            ) : (
              /* ── GRID ── */
              <div style={{overflowX:"auto"}}>
                <table style={{borderCollapse:"separate",borderSpacing:"8px",minWidth: visibleDays.length>3?700:400}}>
                  <thead>
                    <tr>
                      {/* hora header vacío */}
                      <th style={{width:64}}/>
                      {visibleDays.map(day=>(
                        <th key={day} style={{paddingBottom:8,borderBottom:"1px solid rgba(255,255,255,0.1)"}}>
                          <p style={{fontSize:11,fontWeight:700,letterSpacing:"0.15em",color:"rgba(255,255,255,0.45)",textTransform:"uppercase",textAlign:"center"}}>{day}</p>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hours.map(hour=>(
                      <tr key={hour}>
                        {/* HORA LABEL */}
                        <td style={{textAlign:"right",paddingRight:12,verticalAlign:"middle",height:72}}>
                          <span style={{fontSize:11,fontFamily:"monospace",color:"rgba(255,255,255,0.35)",fontWeight:600,whiteSpace:"nowrap"}}>{hour}</span>
                        </td>
                        {visibleDays.map(day=>{
                          const dh = dayHours(state,day);
                          if(!dh.includes(hour)) return (
                            <td key={day} style={{height:72,width:120}}>
                              <div style={{height:68,borderRadius:14,background:"rgba(255,255,255,0.01)"}}/>
                            </td>
                          );
                          const status=getStatus(day,hour);
                          const slotSubject=state.slots[day][hour]?.subject;
                          if(status==="closed") return (
                            <td key={day} style={{height:72,width:120}}>
                              <div style={{height:68,borderRadius:14,background:"rgba(255,255,255,0.018)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                                <span style={{color:"rgba(255,255,255,0.08)",fontSize:14}}>—</span>
                              </div>
                            </td>
                          );
                          if(status==="full") return (
                            <td key={day} style={{height:72,width:120}}>
                              <div style={{height:68,borderRadius:14,background:"rgba(255,60,60,0.07)",border:"1px solid rgba(200,50,50,0.3)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4}}>
                                <span style={{width:6,height:6,borderRadius:"50%",background:"rgba(248,113,113,0.7)",display:"block"}}/>
                                <span style={{fontSize:11,color:"rgba(248,113,113,0.7)",fontWeight:700}}>Lleno</span>
                                {slotSubject&&<span style={{fontSize:9,color:"rgba(255,255,255,0.3)",marginTop:1}}>{slotSubject.split(" ")[0]}</span>}
                              </div>
                            </td>
                          );
                          return (
                            <td key={day} style={{height:72,width:120}}>
                              <button onClick={()=>handleSelect(day,hour)} style={{width:"100%",height:68,borderRadius:14,background:"rgba(52,211,153,0.08)",border:"1px solid rgba(52,211,153,0.3)",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,transition:"all 0.15s"}}
                                onMouseEnter={e=>{e.currentTarget.style.background="rgba(52,211,153,0.15)";e.currentTarget.style.borderColor="rgba(52,211,153,0.6)"}}
                                onMouseLeave={e=>{e.currentTarget.style.background="rgba(52,211,153,0.08)";e.currentTarget.style.borderColor="rgba(52,211,153,0.3)"}}>
                                <span style={{width:6,height:6,borderRadius:"50%",background:"rgb(52,211,153)",display:"block"}}/>
                                <span style={{fontSize:11,color:"rgba(52,211,153,0.85)",fontWeight:700}}>Libre</span>
                                {slotSubject&&<span style={{fontSize:9,color:"rgba(255,255,255,0.35)",marginTop:1}}>{slotSubject.split(" ")[0]}</span>}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p style={{textAlign:"center",fontSize:11,color:"rgba(255,255,255,0.12)",marginTop:32,letterSpacing:"0.15em",textTransform:"uppercase"}}>
              Toca un horario disponible para reservar tu lugar
            </p>
          </>
        )}

        {step==="form" && (
          <div style={{maxWidth:420,margin:"0 auto"}}>
            <button onClick={reset} style={{fontSize:11,color:"rgba(255,255,255,0.3)",letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:28,background:"none",border:"none",cursor:"pointer"}}>← Volver</button>
            <div style={{borderRadius:18,border:"1px solid rgba(255,255,255,0.1)",padding:"20px 24px",marginBottom:20,display:"flex",alignItems:"center",gap:16,background:"rgba(255,255,255,0.04)"}}>
              <span style={{fontSize:28}}>📐</span>
              <div>
                <p style={{fontSize:10,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:4}}>Horario seleccionado</p>
                <p style={{fontSize:18,fontWeight:700,color:"white",fontFamily:"Georgia,serif"}}>{selected?.day} · {selected?.hour}</p>
                {selected?.slotSubject&&<span className={`text-xs font-semibold px-2 py-0.5 rounded-full border mt-1.5 inline-block ${SUBJECT_COLORS[selected.slotSubject]||""}`}>{selected.slotSubject}</span>}
              </div>
            </div>
            <div style={{borderRadius:18,border:"1px solid rgba(255,255,255,0.08)",padding:28,background:"rgba(255,255,255,0.03)"}}>
              <p style={{fontSize:17,fontWeight:700,color:"white",fontFamily:"Georgia,serif",marginBottom:20}}>Reserva tu lugar</p>
              <div style={{marginBottom:16}}>
                <label className={lCls}>Tu nombre</label>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. María García" className={iCls}/>
              </div>
              {!selected?.slotSubject&&(
                <div style={{marginBottom:16}}>
                  <label className={lCls}>Materia</label>
                  <select value={subject} onChange={e=>setSubject(e.target.value)} className={iCls} style={{background:"#141414"}}>
                    <option value="">Selecciona una materia</option>
                    {SUBJECTS.map(s=><option key={s} style={{background:"#141414"}}>{s}</option>)}
                  </select>
                </div>
              )}
              <button onClick={handleSubmit} disabled={!name.trim()||(!selected?.slotSubject&&!subject)}
                style={{width:"100%",background:"white",color:"black",fontWeight:700,padding:"14px",borderRadius:12,fontSize:13,letterSpacing:"0.15em",textTransform:"uppercase",border:"none",cursor:"pointer",opacity:(!name.trim()||(!selected?.slotSubject&&!subject))?0.3:1,marginTop:4}}>
                Confirmar reserva
              </button>
            </div>
          </div>
        )}

        {step==="confirm" && (
          <div style={{maxWidth:380,margin:"0 auto",textAlign:"center"}}>
            <div style={{width:72,height:72,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",background:"rgba(255,255,255,0.04)",fontSize:32}}>✓</div>
            <p style={{fontSize:22,fontWeight:700,color:"white",fontFamily:"Georgia,serif",marginBottom:8}}>¡Lugar apartado!</p>
            <p style={{fontSize:13,color:"rgba(255,255,255,0.35)",marginBottom:24}}>Nos vemos en clase, <span style={{color:"rgba(255,255,255,0.65)",fontWeight:600}}>{name}</span>.</p>
            <div style={{borderRadius:18,border:"1px solid rgba(255,255,255,0.08)",padding:"20px 24px",background:"rgba(255,255,255,0.03)",marginBottom:20}}>
              {[["Día",selected?.day],["Hora",selected?.hour],["Materia",selected?.slotSubject||subject]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",borderBottom:"1px solid rgba(255,255,255,0.05)",paddingBottom:10,marginBottom:10}}>
                  <span style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.22)",textTransform:"uppercase",letterSpacing:"0.15em"}}>{l}</span>
                  <span style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.72)"}}>{v}</span>
                </div>
              ))}
            </div>
            <button onClick={reset} style={{width:"100%",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.35)",padding:"12px",borderRadius:12,fontSize:13,background:"none",cursor:"pointer"}}>Reservar otro horario</button>
          </div>
        )}
      </div>
      <div style={{borderTop:"1px solid rgba(255,255,255,0.05)",padding:"14px 0",textAlign:"center",marginTop:24}}>
        <p style={{fontSize:10,color:"rgba(255,255,255,0.08)",letterSpacing:"0.15em",textTransform:"uppercase"}}>JΠ The Academy · 3.14159265358979...</p>
      </div>
    </div>
  );
}

// ══ LOGIN ════════════════════════════════════════════════
function LoginView({pw,setPw,onLogin,err,onBack}){
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{width:"100%",maxWidth:320}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:60,height:60,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",background:"rgba(255,255,255,0.05)"}}>
            <span style={{color:"white",fontWeight:700,fontSize:18,fontFamily:"Georgia,serif"}}>Jπ</span>
          </div>
          <p style={{color:"white",fontWeight:700,fontSize:17,fontFamily:"Georgia,serif",letterSpacing:"0.05em"}}>Panel de admin</p>
          <p style={{color:"rgba(255,255,255,0.25)",fontSize:10,marginTop:4,letterSpacing:"0.15em",textTransform:"uppercase"}}>JΠ The Academy</p>
        </div>
        <div style={{borderRadius:18,border:"1px solid rgba(255,255,255,0.08)",padding:28,background:"rgba(255,255,255,0.04)"}}>
          <label style={{display:"block",fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:8}}>Contraseña</label>
          <input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&onLogin()}
            placeholder="••••••••"
            style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${err?"rgba(248,113,113,0.6)":"rgba(255,255,255,0.15)"}`,borderRadius:12,padding:"12px 16px",fontSize:13,color:"white",outline:"none",boxSizing:"border-box",marginBottom:err?4:16}}/>
          {err&&<p style={{color:"rgba(248,113,113,0.7)",fontSize:11,marginBottom:12}}>Contraseña incorrecta</p>}
          <button onClick={onLogin} style={{width:"100%",background:"white",color:"black",fontWeight:700,padding:"13px",borderRadius:12,fontSize:12,letterSpacing:"0.15em",textTransform:"uppercase",border:"none",cursor:"pointer",marginBottom:10}}>Entrar</button>
          <button onClick={onBack} style={{width:"100%",background:"none",border:"none",color:"rgba(255,255,255,0.22)",fontSize:11,letterSpacing:"0.15em",textTransform:"uppercase",cursor:"pointer",padding:"6px"}}>← Volver</button>
        </div>
      </div>
    </div>
  );
}

// ══ ADMIN ════════════════════════════════════════════════
function AdminView({state,setState,setSlot,removeEnrollment,addExtraHour,dayHours,allHours,onLogout}){
  const [tab,setTab]           = useState("schedule");
  const [search,setSearch]     = useState("");
  const [filterDay,setFilterDay] = useState("Todos");
  const [modalSlot,setModalSlot] = useState(null);
  const [ahDay,setAhDay]       = useState("");
  const [ahVal,setAhVal]       = useState("");

  const hours = allHours(state);

  const toggleOpen = (day,hour) => {
    if(isPast(day,hour)) return;
    const s=state.slots[day][hour]||{enrollments:[]};
    setSlot(day,hour,{...s,open:!s.open});
  };
  const openDay  = (day) => dayHours(state,day).forEach(h=>{ if(!isPast(day,h)) setSlot(day,h,{...(state.slots[day][h]||{enrollments:[]}),open:true}); });
  const closeDay = (day) => dayHours(state,day).forEach(h=>setSlot(day,h,{...(state.slots[day][h]||{enrollments:[]}),open:false}));
  const setGCap  = (v)   => setState(p=>({...p,globalCap:Math.max(1,Number(v))}));
  const setSlotCap     = (d,h,v) => setSlot(d,h,{...(state.slots[d][h]||{enrollments:[]}),cap:Math.max(1,Number(v))});
  const setSlotSubject = (d,h,s) => setSlot(d,h,{...(state.slots[d][h]||{enrollments:[]}),subject:s});

  const allRes = [];
  ALL_DAYS.forEach(d=>dayHours(state,d).forEach(h=>{
    (state.slots[d][h]?.enrollments||[]).forEach(e=>allRes.push({...e,day:d,hour:h,subject:state.slots[d][h]?.subject||"—"}));
  }));

  const filtered = allRes.filter(r=>{
    const ms=r.name?.toLowerCase().includes(search.toLowerCase())||r.subject?.toLowerCase().includes(search.toLowerCase());
    return ms&&(filterDay==="Todos"||r.day===filterDay);
  });

  const studentMap={};
  allRes.forEach(r=>{ if(!studentMap[r.name]) studentMap[r.name]={name:r.name,reservations:[]}; studentMap[r.name].reservations.push(r); });
  const students=Object.values(studentMap).sort((a,b)=>b.reservations.length-a.reservations.length);

  const openCount = ALL_DAYS.reduce((a,d)=>a+dayHours(state,d).filter(h=>state.slots[d][h]?.open&&!isPast(d,h)).length,0);

  const tabS = (t) => ({
    padding:"10px 16px", fontSize:11, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase",
    borderRadius:10, border:"none", cursor:"pointer", transition:"all 0.15s",
    background: tab===t?"white":"transparent",
    color: tab===t?"black":"rgba(255,255,255,0.4)",
  });

  const iS = { width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:12, padding:"10px 14px", fontSize:13, color:"white", outline:"none", boxSizing:"border-box" };

  return (
    <div style={{minHeight:"100vh"}}>
      {/* header */}
      <div style={{borderBottom:"1px solid rgba(255,255,255,0.08)",padding:"18px 24px"}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:40,height:40,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,0.05)"}}>
              <span style={{color:"white",fontWeight:700,fontSize:13,fontFamily:"Georgia,serif"}}>Jπ</span>
            </div>
            <div>
              <p style={{color:"white",fontWeight:700,fontFamily:"Georgia,serif",letterSpacing:"0.05em"}}>Panel de administración</p>
              <p style={{color:"rgba(255,255,255,0.25)",fontSize:10,letterSpacing:"0.15em",textTransform:"uppercase"}}>JΠ The Academy</p>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(5,150,105,0.15)",border:"1px solid rgba(5,150,105,0.3)",borderRadius:20,padding:"6px 14px"}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:"rgb(52,211,153)",display:"block"}}/>
              <span style={{color:"rgb(52,211,153)",fontSize:12,fontWeight:600}}>{openCount} abiertos</span>
            </div>
            <button onClick={onLogout} style={{background:"none",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.3)",fontSize:11,padding:"6px 14px",borderRadius:10,cursor:"pointer",letterSpacing:"0.1em"}}>Salir</button>
          </div>
        </div>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"32px 20px"}}>
        {/* KPIs */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:28}}>
          {[["🟢","Slots abiertos",openCount],["📅","Reservaciones",allRes.length],["👤","Alumnos",students.length]].map(([ic,lb,v])=>(
            <div key={lb} style={{borderRadius:18,border:"1px solid rgba(255,255,255,0.07)",padding:20,background:"rgba(255,255,255,0.03)"}}>
              <p style={{fontSize:22,marginBottom:10}}>{ic}</p>
              <p style={{fontSize:30,fontWeight:700,color:"white"}}>{v}</p>
              <p style={{fontSize:10,color:"rgba(255,255,255,0.25)",marginTop:4,textTransform:"uppercase",letterSpacing:"0.1em"}}>{lb}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:"inline-flex",gap:6,padding:6,borderRadius:14,border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.025)",marginBottom:24}}>
          <button style={tabS("schedule")} onClick={()=>setTab("schedule")}>Horarios</button>
          <button style={tabS("reservations")} onClick={()=>setTab("reservations")}>Reservaciones</button>
          <button style={tabS("students")} onClick={()=>setTab("students")}>Alumnos</button>
        </div>

        {/* ── HORARIOS ── */}
        {tab==="schedule" && (
          <>
            {/* Controls row */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:18}}>
              {/* Global cap */}
              <div style={{borderRadius:16,border:"1px solid rgba(255,255,255,0.07)",padding:18,background:"rgba(255,255,255,0.03)"}}>
                <p style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:14}}>Cupo global por defecto</p>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <button onClick={()=>setGCap(state.globalCap-1)} style={{width:36,height:36,borderRadius:10,border:"1px solid rgba(255,255,255,0.12)",background:"none",color:"rgba(255,255,255,0.6)",fontSize:18,fontWeight:700,cursor:"pointer"}}>−</button>
                  <span style={{fontSize:30,fontWeight:700,color:"white",width:36,textAlign:"center"}}>{state.globalCap}</span>
                  <button onClick={()=>setGCap(state.globalCap+1)} style={{width:36,height:36,borderRadius:10,border:"1px solid rgba(255,255,255,0.12)",background:"none",color:"rgba(255,255,255,0.6)",fontSize:18,fontWeight:700,cursor:"pointer"}}>+</button>
                  <span style={{color:"rgba(255,255,255,0.2)",fontSize:12}}>alumnos/slot</span>
                </div>
              </div>
              {/* Add hour */}
              <div style={{borderRadius:16,border:"1px solid rgba(255,255,255,0.07)",padding:18,background:"rgba(255,255,255,0.03)"}}>
                <p style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:14}}>Agregar hora extra</p>
                <div style={{display:"flex",gap:8}}>
                  <select value={ahDay} onChange={e=>setAhDay(e.target.value)} style={{...iS,flex:1}}>
                    <option value="" style={{background:"#111"}}>Día</option>
                    {ALL_DAYS.map(d=><option key={d} style={{background:"#111"}}>{d}</option>)}
                  </select>
                  <input value={ahVal} onChange={e=>setAhVal(e.target.value)} placeholder="21:00" style={{...iS,width:80}}/>
                  <button onClick={()=>{addExtraHour(ahDay,ahVal);setAhVal("");}}
                    disabled={!ahDay||!ahVal}
                    style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)",color:"white",padding:"0 16px",borderRadius:10,fontSize:18,fontWeight:700,cursor:"pointer",opacity:(!ahDay||!ahVal)?0.3:1}}>+</button>
                </div>
              </div>
            </div>

            {/* Bulk controls */}
            <div style={{borderRadius:16,border:"1px solid rgba(255,255,255,0.07)",padding:18,background:"rgba(255,255,255,0.025)",marginBottom:18}}>
              <p style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.28)",textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:14}}>Abrir / cerrar día completo</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
                {ALL_DAYS.map(d=>{
                  const oc=dayHours(state,d).filter(h=>state.slots[d][h]?.open&&!isPast(d,h)).length;
                  return (
                    <div key={d} style={{display:"flex",alignItems:"center",gap:8,borderRadius:12,border:"1px solid rgba(255,255,255,0.07)",padding:"10px 14px",background:"rgba(255,255,255,0.02)"}}>
                      <span style={{color:"rgba(255,255,255,0.6)",fontSize:13,fontWeight:600,minWidth:80}}>{d}</span>
                      <span style={{color:"rgba(255,255,255,0.2)",fontSize:11,minWidth:52}}>{oc} ab.</span>
                      <button onClick={()=>openDay(d)} style={{fontSize:11,background:"rgba(5,150,105,0.2)",color:"rgb(52,211,153)",border:"1px solid rgba(5,150,105,0.35)",padding:"5px 12px",borderRadius:8,cursor:"pointer",fontWeight:700}}>Abrir</button>
                      <button onClick={()=>closeDay(d)} style={{fontSize:11,background:"rgba(185,28,28,0.15)",color:"rgba(248,113,113,0.7)",border:"1px solid rgba(185,28,28,0.28)",padding:"5px 12px",borderRadius:8,cursor:"pointer",fontWeight:700}}>Cerrar</button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* GRID ADMIN */}
            <p style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.25)",textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:14}}>Control individual — toca un slot para editar</p>
            <div style={{overflowX:"auto"}}>
              <table style={{borderCollapse:"separate",borderSpacing:"7px",minWidth:800}}>
                <thead>
                  <tr>
                    <th style={{width:72}}/>
                    {ALL_DAYS.map(day=>(
                      <th key={day} style={{paddingBottom:8,borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
                        <p style={{fontSize:10,fontWeight:700,letterSpacing:"0.15em",color:"rgba(255,255,255,0.38)",textTransform:"uppercase",textAlign:"center"}}>{day}</p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hours.map(hour=>(
                    <tr key={hour}>
                      {/* hora */}
                      <td style={{textAlign:"right",paddingRight:12,verticalAlign:"middle",height:64}}>
                        <span style={{fontSize:11,fontFamily:"monospace",color:"rgba(255,255,255,0.32)",fontWeight:600,whiteSpace:"nowrap"}}>{hour}</span>
                      </td>
                      {ALL_DAYS.map(day=>{
                        const dh=dayHours(state,day);
                        if(!dh.includes(hour)) return (
                          <td key={day} style={{height:64,width:110}}>
                            <div style={{height:60,borderRadius:12,background:"rgba(255,255,255,0.008)"}}/>
                          </td>
                        );
                        const s=state.slots[day][hour]||{enrollments:[]};
                        const past=isPast(day,hour);
                        const count=(s.enrollments||[]).length;
                        const cap=s.cap??state.globalCap;
                        const full=count>=cap;
                        const bg=past?"rgba(255,255,255,0.015)":full?"rgba(255,60,60,0.07)":s.open?"rgba(52,211,153,0.07)":"rgba(255,255,255,0.022)";
                        const bc=past?"rgba(255,255,255,0.05)":full?"rgba(200,50,50,0.3)":s.open?"rgba(52,211,153,0.3)":"rgba(255,255,255,0.07)";
                        const tc=past?"rgba(255,255,255,0.18)":full?"rgba(248,113,113,0.6)":s.open?"rgba(52,211,153,0.7)":"rgba(255,255,255,0.2)";
                        const label=past?"pasado":full?"lleno":s.open?"abierto":"cerrado";
                        return (
                          <td key={day} style={{height:64,width:110}}>
                            <button onClick={()=>setModalSlot({day,hour})}
                              style={{width:"100%",height:60,borderRadius:12,background:bg,border:`1px solid ${bc}`,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,opacity:past&&count===0?0.25:1}}
                              disabled={past&&count===0}>
                              {count>0&&<span style={{fontSize:14,fontWeight:700,color:full?"rgb(248,113,113)":"rgb(52,211,153)"}}>{count}<span style={{fontSize:10,color:"rgba(255,255,255,0.2)",fontWeight:400}}>/{cap}</span></span>}
                              <span style={{fontSize:10,fontWeight:700,color:tc,letterSpacing:"0.05em"}}>{label}</span>
                              {s.subject&&<span style={{fontSize:9,color:"rgba(255,255,255,0.25)"}}>{s.subject.split(" ")[0]}</span>}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── RESERVACIONES ── */}
        {tab==="reservations" && (
          <>
            <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar alumno o materia..." style={{...iS,width:240}}/>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {["Todos",...ALL_DAYS].map(d=>(
                  <button key={d} onClick={()=>setFilterDay(d)}
                    style={{padding:"8px 12px",borderRadius:10,fontSize:11,fontWeight:700,border:"1px solid",cursor:"pointer",transition:"all 0.15s",
                      background:filterDay===d?"white":"transparent",color:filterDay===d?"black":"rgba(255,255,255,0.35)",borderColor:filterDay===d?"white":"rgba(255,255,255,0.12)"}}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div style={{borderRadius:18,border:"1px solid rgba(255,255,255,0.07)",overflow:"hidden",background:"rgba(255,255,255,0.022)"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead>
                  <tr style={{borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
                    {["Alumno","Materia","Día · Hora",""].map((h,i)=>(
                      <th key={i} style={{textAlign:"left",padding:"14px 20px",fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.22)",textTransform:"uppercase",letterSpacing:"0.12em"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r,i)=>(
                    <tr key={r.id} style={{borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                      <td style={{padding:"14px 20px",fontWeight:600,color:"rgba(255,255,255,0.82)"}}>{r.name}</td>
                      <td style={{padding:"14px 20px"}}>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${SUBJECT_COLORS[r.subject]||"bg-white/7 text-white/45 border-white/12"}`}>{r.subject}</span>
                      </td>
                      <td style={{padding:"14px 20px"}}>
                        <p style={{color:"rgba(255,255,255,0.6)",fontWeight:500}}>{r.day}</p>
                        <p style={{color:"rgba(255,255,255,0.22)",fontSize:11,fontFamily:"monospace"}}>{r.hour}</p>
                      </td>
                      <td style={{padding:"14px 20px"}}>
                        <button onClick={()=>removeEnrollment(r.day,r.hour,r.id)}
                          style={{fontSize:11,color:"rgba(248,113,113,0.5)",border:"1px solid rgba(185,28,28,0.28)",padding:"6px 12px",borderRadius:8,background:"none",cursor:"pointer"}}>
                          Cancelar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length===0&&<div style={{textAlign:"center",padding:"36px 0",color:"rgba(255,255,255,0.15)",fontSize:11,letterSpacing:"0.15em",textTransform:"uppercase"}}>Sin reservaciones</div>}
            </div>
          </>
        )}

        {/* ── ALUMNOS ── */}
        {tab==="students" && (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:14}}>
            {students.length===0&&<p style={{color:"rgba(255,255,255,0.15)",fontSize:11,letterSpacing:"0.15em",textTransform:"uppercase",gridColumn:"1/-1",textAlign:"center",padding:"40px 0"}}>Sin alumnos todavía</p>}
            {students.map(s=>{
              const subs=[...new Set(s.reservations.map(r=>r.subject))];
              const c=s.reservations.length;
              const badge=c>=8?{l:"Frecuente",cls:"text-amber-400 border-amber-700/45 bg-amber-900/28"}:c>=4?{l:"Regular",cls:"text-emerald-400 border-emerald-700/45 bg-emerald-900/28"}:{l:"Nuevo",cls:"text-blue-400 border-blue-700/45 bg-blue-900/28"};
              return (
                <div key={s.name} style={{borderRadius:18,border:"1px solid rgba(255,255,255,0.07)",padding:18,background:"rgba(255,255,255,0.025)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                    <p style={{fontWeight:700,color:"rgba(255,255,255,0.82)",fontSize:14}}>{s.name}</p>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badge.cls}`}>{badge.l}</span>
                  </div>
                  <div style={{display:"flex",alignItems:"flex-end",gap:8,marginBottom:10}}>
                    <span style={{fontSize:36,fontWeight:700,color:"white"}}>{c}</span>
                    <span style={{color:"rgba(255,255,255,0.22)",fontSize:12,marginBottom:4}}>clases</span>
                  </div>
                  <div style={{width:"100%",height:4,borderRadius:4,background:"rgba(255,255,255,0.07)",marginBottom:12}}>
                    <div style={{height:"100%",borderRadius:4,background:"rgba(255,255,255,0.3)",width:`${Math.min(c/12*100,100)}%`}}/>
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {subs.map(sub=>(
                      <span key={sub} className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${SUBJECT_COLORS[sub]||"bg-white/7 text-white/40 border-white/10"}`}>{sub}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slot modal */}
      {modalSlot&&(()=>{
        const {day,hour}=modalSlot;
        const s=state.slots[day][hour]||{enrollments:[]};
        const past=isPast(day,hour);
        const cap=s.cap??state.globalCap;
        return (
          <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:16,background:"rgba(0,0,0,0.88)"}} onClick={()=>setModalSlot(null)}>
            <div style={{borderRadius:20,border:"1px solid rgba(255,255,255,0.12)",padding:28,width:"100%",maxWidth:360,background:"#0f0f0f"}} onClick={e=>e.stopPropagation()}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
                <div>
                  <p style={{fontSize:10,color:"rgba(255,255,255,0.28)",textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:4}}>{day} · {hour}</p>
                  <p style={{fontSize:18,fontWeight:700,color:"white",fontFamily:"Georgia,serif"}}>{(s.enrollments||[]).length}/{cap} alumnos</p>
                </div>
                <button onClick={()=>setModalSlot(null)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.3)",fontSize:24,cursor:"pointer",lineHeight:1}}>×</button>
              </div>

              {/* Materia */}
              <div style={{marginBottom:14}}>
                <label style={{display:"block",fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.28)",textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:8}}>Materia del slot</label>
                <select value={s.subject||""} onChange={e=>setSlotSubject(day,hour,e.target.value)} style={{...iS,background:"#161616"}}>
                  <option value="" style={{background:"#161616"}}>Libre (alumno elige)</option>
                  {SUBJECTS.map(sub=><option key={sub} style={{background:"#161616"}}>{sub}</option>)}
                </select>
              </div>

              {/* Cap */}
              <div style={{marginBottom:18}}>
                <label style={{display:"block",fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.28)",textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:8}}>Cupo de este slot</label>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <button onClick={()=>setSlotCap(day,hour,cap-1)} style={{width:36,height:36,borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"none",color:"rgba(255,255,255,0.6)",fontSize:18,fontWeight:700,cursor:"pointer"}}>−</button>
                  <span style={{fontSize:24,fontWeight:700,color:"white",width:32,textAlign:"center"}}>{cap}</span>
                  <button onClick={()=>setSlotCap(day,hour,cap+1)} style={{width:36,height:36,borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"none",color:"rgba(255,255,255,0.6)",fontSize:18,fontWeight:700,cursor:"pointer"}}>+</button>
                  <span style={{color:"rgba(255,255,255,0.2)",fontSize:12}}>alumnos</span>
                </div>
              </div>

              {/* Toggle */}
              {!past&&(
                <button onClick={()=>{setSlot(day,hour,{...s,open:!s.open});setModalSlot(null);}}
                  style={{width:"100%",padding:"11px",borderRadius:12,fontSize:12,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",cursor:"pointer",marginBottom:16,
                    background:s.open?"rgba(185,28,28,0.15)":"rgba(5,150,105,0.15)",
                    border:s.open?"1px solid rgba(185,28,28,0.35)":"1px solid rgba(5,150,105,0.35)",
                    color:s.open?"rgba(248,113,113,0.8)":"rgb(52,211,153)"}}>
                  {s.open?"Cerrar este horario":"Abrir este horario"}
                </button>
              )}

              {/* Enrollments */}
              <div style={{maxHeight:200,overflowY:"auto",display:"flex",flexDirection:"column",gap:8}}>
                {(s.enrollments||[]).length===0
                  ? <p style={{color:"rgba(255,255,255,0.18)",fontSize:13,textAlign:"center",padding:"12px 0"}}>Sin alumnos</p>
                  : (s.enrollments||[]).map(e=>(
                    <div key={e.id} style={{borderRadius:12,border:"1px solid rgba(255,255,255,0.07)",padding:"10px 14px",background:"rgba(255,255,255,0.04)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <p style={{fontWeight:600,color:"rgba(255,255,255,0.82)",fontSize:13}}>{e.name}</p>
                      <button onClick={()=>removeEnrollment(day,hour,e.id)} style={{background:"none",border:"1px solid rgba(185,28,28,0.25)",color:"rgba(248,113,113,0.5)",fontSize:11,padding:"4px 10px",borderRadius:8,cursor:"pointer"}}>✕</button>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        );
      })()}

      <div style={{borderTop:"1px solid rgba(255,255,255,0.05)",padding:"14px 0",textAlign:"center",marginTop:28}}>
        <p style={{fontSize:10,color:"rgba(255,255,255,0.07)",letterSpacing:"0.15em",textTransform:"uppercase"}}>JΠ The Academy · Admin · 3.14159...</p>
      </div>
    </div>
  );
}
