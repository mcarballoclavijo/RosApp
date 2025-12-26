import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './lib/supabase';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';

function App() {
  // --- ESTADOS DE NAVEGACIÓN Y ACCESO ---
  const [accesoConcedido, setAccesoConcedido] = useState(false);
  const [pin, setPin] = useState("");
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [pantalla, setPantalla] = useState("inicio"); 
  const [categoriaSel, setCategoriaSel] = useState("");
  const [cargando, setCargando] = useState(false);
  const [registroExpandido, setRegistroExpandido] = useState<number | null>(null);

  // --- NUEVOS ESTADOS (MODO OSCURO Y AJUSTES) ---
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('dark') === 'true');

  // --- ESTADOS PARA EDICIÓN Y BORRADO ---
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [mostrarConfirmarBorrar, setMostrarConfirmarBorrar] = useState<{id: number, tabla: string} | null>(null);

  // --- ESTADOS DE DATOS ---
  const fechaHoy = new Date().toISOString().split('T')[0];
  const [datos, setDatos] = useState({
    titulo: "", autor: "", director: "", 
    fecha: fechaHoy,
    valoracion: 0, descripcion: "", etiquetas: [] as string[],
    tipo_deporte: "", duracion: "", km: "",
    lugar: "", cantante: "", tipo_ocio_manual: ""
  });

  const [registros, setRegistros] = useState<any[]>([]);
  const [filtroCategorias, setFiltroCategorias] = useState<string[]>(['libros', 'peliculas', 'deporte', 'conciertos', 'ocio']);
  const [filtroTiempo, setFiltroTiempo] = useState("Todo");

  const PIN_CORRECTO = "28010";
  const COLORES_KPI = { libros: '#ff4d4d', peliculas: '#4db8ff', deporte: '#82ca9d', conciertos: '#ff944d', ocio: '#ffdb4d' };

  // --- LÓGICA MODO OSCURO ---
  useEffect(() => {
    localStorage.setItem('dark', darkMode.toString());
  }, [darkMode]);

  const theme = {
    bg: darkMode ? '#121212' : '#ffffff',
    text: darkMode ? '#ffffff' : '#000000',
    textSec: darkMode ? '#aaaaaa' : '#5f6368',
    card: darkMode ? '#1e1e1e' : '#ffffff',
    border: darkMode ? '#333333' : '#eeeeee',
    inputBg: darkMode ? '#2c2c2c' : '#ffffff',
    btnGhost: darkMode ? '#2c2c2c' : '#f1f3f4'
  };

  // --- ESTILOS DE CENTRADO (MEJORA DE DISEÑO) ---
  const contenedorPrincipalApp = {
    maxWidth: "500px",
    margin: "0 auto",
    minHeight: "100vh",
    position: "relative" as "relative",
    backgroundColor: theme.bg,
    boxShadow: darkMode ? "none" : "0 0 50px rgba(0,0,0,0.05)"
  };

  // --- FUNCIONES ---
  const exportarCSV = () => {
    if (registros.length === 0) return alert("No hay datos para exportar");
    const encabezados = ["Fecha", "Categoría", "Título/Deporte", "Valoración", "Descripción"].join(",");
    const filas = registros.map(r => [
      r.fecha, 
      r.categoria_id, 
      `"${r.titulo || r.tipo_deporte || r.cantante || ''}"`, 
      r.valoracion || 0, 
      `"${(r.descripcion || '').replace(/"/g, '""')}"`
    ].join(","));
    const csvContent = "data:text/csv;charset=utf-8," + [encabezados, ...filas].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `RosApp_Export.csv`);
    link.click();
  };

  const cerrarSesion = () => {
    setAccesoConcedido(false);
    setPin("");
    setMenuAbierto(false);
    setPantalla("inicio");
  };

  const generosPelisLibros = ['Thriller', 'Drama', 'Romántico', 'Acción', 'Terror', 'Ciencia Ficción', 'Comedia', 'Histórico', 'Fantasía', 'Biografía'];
  const generosSpotify = ['Moderneo', 'Pop', 'Reggaeton', 'Electrónica', 'Indie', 'Rock', 'Trap', 'Techno', 'Flamenco', 'Jazz', 'R&B'];
  const tiposDeporte = ['Gimnasio', 'Running', 'Yoga', 'Pádel', 'Natación', 'Ciclismo', 'Pilates', 'Otros'];
  const opcionesOcio = ['Teatro', 'Museo/Exposición', 'Discoteca', 'Otros'];

  const formatearFecha = (fechaStr: string) => {
    if (!fechaStr) return "";
    const [year, month, day] = fechaStr.split("-");
    return `${day}/${month}/${year}`;
  };

  const manejarTecla = (num: string) => {
    if (pin.length < 5) {
      const nuevoPin = pin + num;
      setPin(nuevoPin);
      if (nuevoPin === PIN_CORRECTO) setAccesoConcedido(true);
      else if (nuevoPin.length === 5) { alert("PIN Incorrecto"); setPin(""); }
    }
  };

  const toggleEtiqueta = (et: string) => {
    setDatos(prev => ({
      ...prev,
      etiquetas: prev.etiquetas.includes(et) ? prev.etiquetas.filter(i => i !== et) : [...prev.etiquetas, et]
    }));
  };

  const cargarHistorial = async () => {
    setCargando(true);
    const tablas = ['libros', 'peliculas', 'deporte', 'conciertos', 'ocio'];
    let todosLosDatos: any[] = [];
    for (const tabla of tablas) {
      const { data } = await supabase.from(tabla).select('*');
      if (data) todosLosDatos = [...todosLosDatos, ...data.map(i => ({ ...i, categoria_id: tabla }))];
    }
    setRegistros(todosLosDatos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
    setCargando(false);
  };

  useEffect(() => { 
    if (pantalla === "historial" || pantalla === "kpis") cargarHistorial(); 
  }, [pantalla]);

  const registrosFiltrados = registros.filter(reg => {
    const cumpleCat = filtroCategorias.includes(reg.categoria_id);
    if (filtroTiempo === "Todo") return cumpleCat;
    const diff = (new Date().getTime() - new Date(reg.fecha).getTime()) / (1000 * 3600 * 24);
    if (filtroTiempo === "Últimos 7 días") return cumpleCat && diff <= 7;
    if (filtroTiempo === "Último mes") return cumpleCat && diff <= 30;
    return cumpleCat;
  });

  const statsKPI = useMemo(() => ({
    resumen: ['libros', 'peliculas', 'deporte', 'conciertos', 'ocio'].map(c => ({ name: c, total: registrosFiltrados.filter(r => r.categoria_id === c).length })),
    total: registrosFiltrados.length,
    tiempoDeporte: registrosFiltrados.filter(r => r.categoria_id === 'deporte').reduce((acc, curr) => acc + (Number(curr.duracion) || 0), 0)
  }), [registrosFiltrados]);

  const statsDetalladas = useMemo(() => {
    if (filtroCategorias.length !== 1) return null;
    const cat = filtroCategorias[0];
    const dataMap: { [key: string]: number } = {};
    registrosFiltrados.forEach(r => {
      if (cat === 'deporte' && r.tipo_deporte) dataMap[r.tipo_deporte] = (dataMap[r.tipo_deporte] || 0) + 1;
      else if (cat === 'ocio' && r.tipo_ocio_manual) dataMap[r.tipo_ocio_manual] = (dataMap[r.tipo_ocio_manual] || 0) + 1;
      else if (r.etiquetas) r.etiquetas.forEach((et: string) => dataMap[et] = (dataMap[et] || 0) + 1);
    });
    return Object.keys(dataMap).map(key => ({ name: key, valor: dataMap[key] })).sort((a, b) => b.valor - a.valor);
  }, [filtroCategorias, registrosFiltrados]);

  const datosEvolucion = useMemo(() => {
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return meses.map((mes, i) => {
      const item: any = { name: mes };
      filtroCategorias.forEach(c => item[c] = registrosFiltrados.filter(r => new Date(r.fecha).getMonth() === i && r.categoria_id === c).length);
      return item;
    }).slice(0, new Date().getMonth() + 1);
  }, [registrosFiltrados, filtroCategorias]);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (datos.valoracion === 0 && categoriaSel !== 'deporte') return alert("Selecciona valoración");
    setCargando(true);
    const d = { ...datos, duracion: parseInt(datos.duracion.toString()) || null, km: parseFloat(datos.km.toString()) || null };
    const { error } = editandoId ? await supabase.from(categoriaSel).update(d).eq('id', editandoId) : await supabase.from(categoriaSel).insert([d]);
    if (error) alert(error.message); else { setPantalla("inicio"); resetForm(); }
    setCargando(false);
  };

  const confirmarEliminar = async () => {
    if (!mostrarConfirmarBorrar) return;
    await supabase.from(mostrarConfirmarBorrar.tabla).delete().eq('id', mostrarConfirmarBorrar.id);
    setMostrarConfirmarBorrar(null);
    cargarHistorial();
  };

  const prepararEdicion = (reg: any) => {
    setCategoriaSel(reg.categoria_id);
    setEditandoId(reg.id);
    setDatos({ ...reg });
    setPantalla("formulario");
  };

  const resetForm = () => {
    setDatos({ titulo: "", autor: "", director: "", fecha: fechaHoy, valoracion: 0, descripcion: "", etiquetas: [], tipo_deporte: "", duracion: "", km: "", lugar: "", cantante: "", tipo_ocio_manual: "" });
    setEditandoId(null);
  };

  const toggleFiltroCat = (cat: string) => {
    setFiltroCategorias(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  if (!accesoConcedido) {
    return (
      <div style={{...estiloCentradoLogin, backgroundColor: theme.bg}}>
        <div style={contenedorPrincipalApp}>
          <div style={{...estiloCentradoLogin, width: '100%'}}>
            <span style={{ fontSize: "50px" }}>🔒</span>
            <div style={{ display: "flex", gap: "10px", margin: "30px 0" }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ width: "15px", height: "15px", borderRadius: "50%", backgroundColor: pin.length > i ? "#0047bb" : theme.border }} />
              ))}
            </div>
            <div style={tecladoGrid}>
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"].map(t => (
                <button key={t} onClick={() => t === "C" || t === "⌫" ? setPin("") : manejarTecla(t)} style={{...botonTecla, backgroundColor: theme.btnGhost, color: theme.text}}>{t}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: darkMode ? '#000' : '#f5f5f5' }}>
      <div style={contenedorPrincipalApp}>
        
        {mostrarConfirmarBorrar && (
          <div style={overlayModal}>
            <div style={{...cardModal, backgroundColor: theme.card}}>
              <p style={{fontWeight: 'bold', fontSize: '18px', color: theme.text}}>¿Eliminar registro?</p>
              <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                <button onClick={() => setMostrarConfirmarBorrar(null)} style={{...btnModalCancel, backgroundColor: theme.btnGhost, color: theme.text}}>Cancelar</button>
                <button onClick={confirmarEliminar} style={btnModalConfirm}>Eliminar</button>
              </div>
            </div>
          </div>
        )}

        <button style={btnMenuHamburguesa} onClick={() => setMenuAbierto(true)}>
          <div style={lineaMenu}></div><div style={lineaMenu}></div><div style={lineaMenu}></div>
        </button>

        {pantalla === "inicio" && (
          <div style={contenedorInicio}>
            <h1 style={{...tituloGrande, color: theme.text}}>Bienvenida<br/>Rosa</h1>
            <button onClick={() => { resetForm(); setPantalla("categorias"); }} style={btnNuevoRegistroCuadrado}>+ Nuevo registro</button>
          </div>
        )}

        {pantalla === "categorias" && (
          <div style={{ padding: "100px 24px" }}>
            <button onClick={() => setPantalla("inicio")} style={btnVolver}>← Volver</button>
            <h2 style={{ marginBottom: "20px" }}>¿Qué registramos hoy?</h2>
            <div style={{ display: "grid", gap: "12px" }}>
              {[{id:'libros',n:'Libros',i:'📚'},{id:'peliculas',n:'Películas',i:'🎬'},{id:'deporte',n:'Deporte',i:'💪'},{id:'conciertos',n:'Conciertos',i:'🎸'},{id:'ocio',n:'Ocio',i:'💃'}].map(c => (
                <div key={c.id} onClick={() => { setCategoriaSel(c.id); setPantalla("formulario"); }} style={{...tarjetaLarga, backgroundColor: theme.card, borderColor: theme.border, color: theme.text}}>
                  <span>{c.i} {c.n}</span><span>→</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {pantalla === "formulario" && (
          <div style={{ padding: "100px 24px", paddingBottom: "120px" }}>
            <button onClick={() => { setPantalla(editandoId ? "historial" : "categorias"); resetForm(); }} style={btnVolver}>← Volver</button>
            <h2 style={{ textTransform: "capitalize", marginBottom: "20px" }}>{categoriaSel}</h2>
            <form onSubmit={guardar} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {categoriaSel === 'ocio' && (
                <select required style={{...estiloInput, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border}} value={datos.tipo_ocio_manual} onChange={e => setDatos({...datos, tipo_ocio_manual: e.target.value})}>
                  <option value="">Tipo *</option>
                  {opcionesOcio.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              )}
              {(categoriaSel === 'libros' || categoriaSel === 'peliculas' || categoriaSel === 'ocio') && 
                <input type="text" placeholder="Título *" required style={{...estiloInput, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border}} value={datos.titulo} onChange={e => setDatos({...datos, titulo: e.target.value})} />
              }
              {categoriaSel === 'conciertos' && <input type="text" placeholder="Cantante *" required style={{...estiloInput, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border}} value={datos.cantante} onChange={e => setDatos({...datos, cantante: e.target.value})} />}
              {categoriaSel === 'libros' && <input type="text" placeholder="Autor *" required style={{...estiloInput, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border}} value={datos.autor} onChange={e => setDatos({...datos, autor: e.target.value})} />}
              {categoriaSel === 'deporte' && (
                <>
                  <select required style={{...estiloInput, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border}} value={datos.tipo_deporte} onChange={e => setDatos({...datos, tipo_deporte: e.target.value})}>
                    <option value="">Tipo deporte *</option>
                    {tiposDeporte.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input type="number" placeholder="Minutos *" required style={{...estiloInput, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border}} value={datos.duracion} onChange={e => setDatos({...datos, duracion: e.target.value})} />
                </>
              )}
              <input type="date" required value={datos.fecha} style={{...estiloInput, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border}} onChange={e => setDatos({...datos, fecha: e.target.value})} />
              {categoriaSel !== 'deporte' && (
                <div style={{ textAlign: "center", background: theme.btnGhost, padding: "15px", borderRadius: "12px" }}>
                  <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                    {[1, 2, 3, 4, 5].map(num => (
                      <span key={num} onClick={() => setDatos({ ...datos, valoracion: num })} style={{ fontSize: "35px", cursor: "pointer", color: datos.valoracion >= num ? "#FBBC04" : "#D1D3D4" }}>★</span>
                    ))}
                  </div>
                </div>
              )}
              <textarea placeholder="Notas..." style={{ ...estiloInput, height: "100px", backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }} value={datos.descripcion} onChange={e => setDatos({...datos, descripcion: e.target.value})} />
              <button type="submit" style={btnGuardarOriginal}>{cargando ? '...' : 'Guardar'}</button>
            </form>
          </div>
        )}

        {pantalla === "historial" && (
          <div style={{ padding: "100px 24px" }}>
            <button onClick={() => setPantalla("inicio")} style={btnVolver}>← Inicio</button>
            {registrosFiltrados.map((reg, idx) => (
              <div key={idx} style={{ padding: "15px", borderRadius: "12px", border: `1px solid ${theme.border}`, marginBottom: "12px", backgroundColor: theme.card }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div onClick={() => setRegistroExpandido(registroExpandido === idx ? null : idx)} style={{flex: 1}}>
                    <div style={{ fontSize: "10px", color: "#0047bb", fontWeight: "bold" }}>{reg.categoria_id.toUpperCase()} - {formatearFecha(reg.fecha)}</div>
                    <h4 style={{ margin: "5px 0", color: theme.text }}>{reg.titulo || reg.tipo_deporte || reg.cantante}</h4>
                  </div>
                  <div style={{display: 'flex', gap: '5px'}}>
                    <button onClick={() => prepararEdicion(reg)} style={btnCircularAccion}>✏️</button>
                    <button onClick={() => setMostrarConfirmarBorrar({id: reg.id, tabla: reg.categoria_id})} style={btnCircularAccion}>🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {pantalla === "kpis" && (
          <div style={{ padding: "100px 24px" }}>
            <button onClick={() => setPantalla("inicio")} style={btnVolver}>← Inicio</button>
            <div style={cardKPILargo}>
              <span style={labelKPI}>Total Registros</span>
              <div style={valorKPI}>{statsKPI.total}</div>
            </div>
            <div style={{...cardKPILargo, marginTop: '20px', height: '250px'}}>
               <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={datosEvolucion}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.border} />
                    <XAxis dataKey="name" style={{fontSize: '10px'}} />
                    <YAxis style={{fontSize: '10px'}} />
                    <Tooltip />
                    {filtroCategorias.map(c => <Line key={c} type="monotone" dataKey={c} stroke={COLORES_KPI[c as keyof typeof COLORES_KPI]} strokeWidth={3} dot={false} />)}
                  </LineChart>
               </ResponsiveContainer>
            </div>
          </div>
        )}

        {pantalla === "ajustes" && (
          <div style={{ padding: "100px 24px" }}>
            <button onClick={() => setPantalla("inicio")} style={btnVolver}>← Inicio</button>
            <button onClick={() => setDarkMode(!darkMode)} style={{...tarjetaLarga, backgroundColor: theme.card, color: theme.text, width: '100%', marginBottom: '10px'}}>{darkMode ? "☀️ Modo Claro" : "🌙 Modo Oscuro"}</button>
            <button onClick={exportarCSV} style={{...tarjetaLarga, backgroundColor: theme.card, color: theme.text, width: '100%', marginBottom: '10px'}}>📤 Exportar CSV</button>
            <button onClick={cerrarSesion} style={{...tarjetaLarga, backgroundColor: '#fff1f1', color: '#ff4d4d', width: '100%'}}>🚪 Cerrar Sesión</button>
          </div>
        )}

        {menuAbierto && (
          <div style={{ ...sidebar, backgroundColor: theme.card }}>
            <button onClick={() => setMenuAbierto(false)} style={{float:'right', background:'none', border:'none', color:theme.text, fontSize:'24px'}}>✕</button>
            <nav style={{marginTop:'50px', display:'flex', flexDirection:'column', gap:'10px'}}>
              {['inicio', 'historial', 'kpis', 'ajustes'].map(p => (
                <div key={p} onClick={() => { setPantalla(p); setMenuAbierto(false); }} style={{...itemMenuMenu, backgroundColor: pantalla === p ? "#eef4ff" : "transparent", color: pantalla === p ? "#0047bb" : theme.textSec}}>
                  {p.toUpperCase()}
                </div>
              ))}
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}

// --- ESTILOS ---
const cardKPILargo = { width: '100%', border: '1px solid #eee', borderRadius: '16px', padding: '20px', boxSizing: 'border-box' as 'border-box' };
const labelKPI = { fontSize: '11px', color: '#888', display: 'block', marginBottom: '8px', fontWeight: 'bold' as 'bold' };
const valorKPI = { fontSize: '28px', fontWeight: 'bold' as 'bold', color: '#0047bb' };
const contenedorInicio = { height: "100vh", display: "flex", flexDirection: "column" as "column", justifyContent: "center", padding: "0 40px", gap: '40px' };
const tituloGrande = { fontSize: "48px", fontWeight: "bold" as "bold", lineHeight: "1" };
const btnNuevoRegistroCuadrado = { backgroundColor: "#0047bb", color: "#fff", border: "none", borderRadius: "4px", padding: "16px 24px", fontSize: "18px", fontWeight: "bold" as "bold", width: 'fit-content' };
const btnMenuHamburguesa = { position: "fixed" as "fixed", top: "40px", left: "20px", width: "45px", height: "45px", backgroundColor: "#0047bb", border: "none", borderRadius: "2px", zIndex: 100, display:'flex', flexDirection:'column' as 'column', justifyContent:'center', alignItems:'center', gap:'4px' };
const lineaMenu = { width: "24px", height: "3px", backgroundColor: "#fff" };
const estiloCentradoLogin = { height: "100vh", display: "flex", flexDirection: "column" as "column", justifyContent: "center", alignItems: "center" };
const tecladoGrid = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "15px" };
const botonTecla = { width: '70px', height: '70px', borderRadius: "50%", border: "none", fontSize: "22px" };
const btnVolver = { background: "none", border: "none", color: "#0047bb", fontWeight: "bold" as "bold", marginBottom: "15px" };
const estiloInput = { padding: "16px", borderRadius: "12px", border: "1px solid #ddd", width: "100%", boxSizing: "border-box" as "border-box" };
const tarjetaLarga = { padding: "20px", borderRadius: "16px", border: "1px solid #eee", fontWeight: "bold" as "bold", display: 'flex', justifyContent: 'space-between' };
const sidebar = { position: "fixed" as "fixed", top: 0, left: 0, width: "280px", height: "100%", zIndex: 1001, padding: "30px", boxSizing: 'border-box' as 'border-box', boxShadow: "10px 0 30px rgba(0,0,0,0.1)" };
const itemMenuMenu = { padding: "16px 20px", borderRadius: "12px", fontSize: "16px", cursor: "pointer" };
const btnGuardarOriginal = { backgroundColor: "#0047bb", color: "#fff", border: "none", borderRadius: "30px", padding: "18px", fontWeight: "bold" as "bold" };
const btnCircularAccion = { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' };
const overlayModal = { position: 'fixed' as 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 };
const cardModal = { padding: '20px', borderRadius: '15px', width: '80%', maxWidth: '300px' };
const btnModalCancel = { padding: '10px', borderRadius: '8px', border: 'none', flex: 1 };
const btnModalConfirm = { padding: '10px', borderRadius: '8px', border: 'none', color: '#fff', flex: 1 };

export default App;