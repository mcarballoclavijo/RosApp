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
 const fechaHoy = new Date().toISOString().split('T')[0]; // Selecciona hoy por defecto
 const [datos, setDatos] = useState({
   titulo: "", autor: "", director: "", 
   fecha: fechaHoy, // Cambiado a la fecha de hoy para facilitar pruebas
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

  // --- FUNCIONES EXTRA (CSV Y LOGOUT) ---
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
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `RosApp_Historial_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  // --- CARGA DE DATOS ---
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

  // --- LÓGICA DE FILTRADO ---
  const registrosFiltrados = registros.filter(reg => {
    const cumpleCat = filtroCategorias.includes(reg.categoria_id);
    if (filtroTiempo === "Todo") return cumpleCat;
    const fechaReg = new Date(reg.fecha).getTime();
    const hoy = new Date().getTime();
    const diffDias = (hoy - fechaReg) / (1000 * 3600 * 24);
    if (filtroTiempo === "Últimos 7 días") return cumpleCat && diffDias <= 7;
    if (filtroTiempo === "Último mes") return cumpleCat && diffDias <= 30;
    return cumpleCat;
  });

  // --- CÁLCULO DE ESTADÍSTICAS ---
  const statsKPI = useMemo(() => {
    const resumen = ['libros', 'peliculas', 'deporte', 'conciertos', 'ocio'].map(c => {
      const regsCat = registrosFiltrados.filter(r => r.categoria_id === c);
      return { name: c, total: regsCat.length };
    });
    const tiempoDeporte = registrosFiltrados
      .filter(r => r.categoria_id === 'deporte')
      .reduce((acc, curr) => acc + (Number(curr.duracion) || 0), 0);
    return { resumen, total: registrosFiltrados.length, tiempoDeporte };
  }, [registrosFiltrados]);

  const statsDetalladas = useMemo(() => {
    if (filtroCategorias.length !== 1) return null;
    const cat = filtroCategorias[0];
    const dataMap: { [key: string]: number } = {};

    registrosFiltrados.forEach(r => {
      if (cat === 'deporte' && r.tipo_deporte) {
        dataMap[r.tipo_deporte] = (dataMap[r.tipo_deporte] || 0) + 1;
      } else if (cat === 'ocio' && r.tipo_ocio_manual) {
        dataMap[r.tipo_ocio_manual] = (dataMap[r.tipo_ocio_manual] || 0) + 1;
      } else if ((cat === 'libros' || cat === 'peliculas' || cat === 'conciertos') && r.etiquetas) {
        r.etiquetas.forEach((et: string) => {
          dataMap[et] = (dataMap[et] || 0) + 1;
        });
      }
    });

    return Object.keys(dataMap).map(key => ({ name: key, valor: dataMap[key] }))
      .sort((a, b) => b.valor - a.valor);
  }, [filtroCategorias, registrosFiltrados]);

  const datosEvolucion = useMemo(() => {
    const mesesNombres = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const datosPorMes = mesesNombres.map((mes, index) => {
      const item: any = { name: mes, tieneDatos: false };
      filtroCategorias.forEach(cat => {
        const count = registrosFiltrados.filter(r => {
          const d = new Date(r.fecha);
          return d.getMonth() === index && r.categoria_id === cat;
        }).length;
        item[cat] = count;
        if (count > 0) item.tieneDatos = true;
      });
      return item;
    });

    const ultimoMesConDatos = [...datosPorMes].reverse().findIndex(d => d.tieneDatos);
    if (ultimoMesConDatos === -1) return datosPorMes.slice(0, 1); 
    const indexCorte = datosPorMes.length - ultimoMesConDatos;
    return datosPorMes.slice(0, indexCorte);
  }, [registrosFiltrados, filtroCategorias]);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (datos.valoracion === 0 && categoriaSel !== 'deporte') {
      alert("Por favor, selecciona una valoración");
      return;
    }
    setCargando(true);
    let datosAEnviar: any = { fecha: datos.fecha, descripcion: datos.descripcion || null };
    if (categoriaSel === 'libros') {
      datosAEnviar = { ...datosAEnviar, titulo: datos.titulo, autor: datos.autor, valoracion: datos.valoracion, etiquetas: datos.etiquetas };
    } else if (categoriaSel === 'peliculas') {
      datosAEnviar = { ...datosAEnviar, titulo: datos.titulo, director: datos.director, valoracion: datos.valoracion, etiquetas: datos.etiquetas };
    } else if (categoriaSel === 'deporte') {
      datosAEnviar = { ...datosAEnviar, tipo_deporte: datos.tipo_deporte, duracion: datos.duracion ? parseInt(datos.duracion.toString()) : null, km: datos.km ? parseFloat(datos.km.toString()) : null };
    } else if (categoriaSel === 'conciertos') {
      datosAEnviar = { ...datosAEnviar, cantante: datos.cantante, lugar: datos.lugar, valoracion: datos.valoracion, etiquetas: datos.etiquetas };
    } else if (categoriaSel === 'ocio') {
      datosAEnviar = { ...datosAEnviar, titulo: datos.titulo, lugar: datos.lugar, tipo_ocio_manual: datos.tipo_ocio_manual, valoracion: datos.valoracion };
    }
    let error;
    if (editandoId) {
      const res = await supabase.from(categoriaSel).update(datosAEnviar).eq('id', editandoId);
      error = res.error;
    } else {
      const res = await supabase.from(categoriaSel).insert([datosAEnviar]);
      error = res.error;
    }
    if (error) { alert("Error: " + error.message); } 
    else { alert(editandoId ? "¡Actualizado correctamente! ✨" : "¡Guardado correctamente! ✨"); setPantalla("inicio"); resetForm(); }
    setCargando(false);
  };

  const confirmarEliminar = async () => {
    if (!mostrarConfirmarBorrar) return;
    const { id, tabla } = mostrarConfirmarBorrar;
    const { error } = await supabase.from(tabla).delete().eq('id', id);
    if (error) alert("Error al eliminar");
    setMostrarConfirmarBorrar(null);
    cargarHistorial();
  };

  const prepararEdicion = (reg: any) => {
    setCategoriaSel(reg.categoria_id);
    setEditandoId(reg.id);
    setDatos({
      titulo: reg.titulo || "", autor: reg.autor || "", director: reg.director || "", fecha: reg.fecha,
      valoracion: reg.valoracion || 0, descripcion: reg.descripcion || "", etiquetas: reg.etiquetas || [],
      tipo_deporte: reg.tipo_deporte || "", duracion: reg.duracion || "", km: reg.km || "",
      lugar: reg.lugar || "", cantante: reg.cantante || "", tipo_ocio_manual: reg.tipo_ocio_manual || ""
    });
    setPantalla("formulario");
  };

  const resetForm = () => {
    setDatos({
      titulo: "", autor: "", director: "", fecha: fechaHoy,
      valoracion: 0, descripcion: "", etiquetas: [] as string[],
      tipo_deporte: "", duracion: "", km: "",
      lugar: "", cantante: "", tipo_ocio_manual: ""
    });
    setEditandoId(null);
  };

  const toggleFiltroCat = (cat: string) => {
    setFiltroCategorias(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  if (!accesoConcedido) {
    return (
      <div style={{...estiloCentradoLogin, backgroundColor: theme.bg}}>
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
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: theme.bg, color: theme.text, fontFamily: "sans-serif", transition: '0.3s' }}>
      
      {mostrarConfirmarBorrar && (
        <div style={overlayModal}>
          <div style={{...cardModal, backgroundColor: theme.card}}>
            <p style={{fontWeight: 'bold', fontSize: '18px', color: theme.text}}>¿Estás seguro de eliminar el registro?</p>
            <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
              <button onClick={() => setMostrarConfirmarBorrar(null)} style={{...btnModalCancel, backgroundColor: theme.btnGhost, color: theme.text}}>Cancelar</button>
              <button onClick={confirmarEliminar} style={btnModalConfirm}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      <button style={btnMenuHamburguesa} onClick={() => setMenuAbierto(true)}>
        <div style={lineaMenu}></div><div style={lineaMenu}></div><div style={lineaMenu}></div>
      </button>

      {/* --- PANTALLA INICIO --- */}
      {pantalla === "inicio" && (
        <div style={contenedorInicio}>
          <div style={{ textAlign: 'left', width: '100%' }}>
            <h1 style={{...tituloGrande, color: theme.text}}>Bienvenida<br/>Rosa</h1>
            <p style={{...subtitulo, color: theme.textSec}}>Controla tu día a día con RosApp</p>
          </div>
          <button onClick={() => { resetForm(); setPantalla("categorias"); }} style={btnNuevoRegistroCuadrado}>
            + Nuevo registro
          </button>
        </div>
      )}

      {/* --- PANTALLA CATEGORÍAS --- */}
      {pantalla === "categorias" && (
        <div style={{ padding: "100px 24px" }}>
          <button onClick={() => setPantalla("inicio")} style={btnVolver}>← Volver</button>
          <h2 style={{ marginBottom: "20px" }}>¿Qué registramos hoy?</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
            {[{id:'libros',n:'Libros',i:'📚'},{id:'peliculas',n:'Películas',i:'🎬'},{id:'deporte',n:'Deporte',i:'💪'},{id:'conciertos',n:'Conciertos',i:'🎸'},{id:'ocio',n:'Ocio',i:'💃'}].map(c => (
              <div key={c.id} onClick={() => { setCategoriaSel(c.id); setPantalla("formulario"); }} style={{...tarjetaLarga, backgroundColor: theme.card, borderColor: theme.border}}>
                <span>{c.i} {c.n}</span><span>→</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- PANTALLA FORMULARIO --- */}
      {pantalla === "formulario" && (
        <div style={{ padding: "100px 24px", paddingBottom: "120px" }}>
          <button onClick={() => { setPantalla(editandoId ? "historial" : "categorias"); resetForm(); }} style={btnVolver}>← Volver</button>
          <h2 style={{ textTransform: "capitalize", marginBottom: "20px" }}>{editandoId ? "Editar " : ""}{categoriaSel}</h2>
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
            {categoriaSel === 'conciertos' && <input type="text" placeholder="Cantante/Grupo *" required style={{...estiloInput, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border}} value={datos.cantante} onChange={e => setDatos({...datos, cantante: e.target.value})} />}
            {categoriaSel === 'libros' && <input type="text" placeholder="Autor/a *" required style={{...estiloInput, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border}} value={datos.autor} onChange={e => setDatos({...datos, autor: e.target.value})} />}
            {categoriaSel === 'peliculas' && <input type="text" placeholder="Director/a *" required style={{...estiloInput, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border}} value={datos.director} onChange={e => setDatos({...datos, director: e.target.value})} />}
            {(categoriaSel === 'conciertos' || categoriaSel === 'ocio') && <input type="text" placeholder="Lugar *" required style={{...estiloInput, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border}} value={datos.lugar} onChange={e => setDatos({...datos, lugar: e.target.value})} />}
            {categoriaSel === 'deporte' && (
              <>
                <select required style={{...estiloInput, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border}} value={datos.tipo_deporte} onChange={e => setDatos({...datos, tipo_deporte: e.target.value})}>
                  <option value="">Tipo de deporte *</option>
                  {tiposDeporte.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="number" step="1" placeholder="Duración (minutos) *" required style={{...estiloInput, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border}} value={datos.duracion} onChange={e => setDatos({...datos, duracion: e.target.value})} />
                {(datos.tipo_deporte === "Running" || datos.tipo_deporte === "Natación" || datos.tipo_deporte === "Ciclismo") && <input type="number" step="0.1" placeholder="Kilómetros" style={{...estiloInput, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border}} value={datos.km} onChange={e => setDatos({...datos, km: e.target.value})} />}
              </>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <label style={{ fontSize: "14px", color: theme.textSec }}>Fecha *</label>
              <input type="date" required min="2026-01-01" value={datos.fecha} style={{...estiloInput, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border}} onChange={e => setDatos({...datos, fecha: e.target.value})} />
            </div>
            {categoriaSel !== 'deporte' && (
              <div style={{ textAlign: "center", background: theme.btnGhost, padding: "15px", borderRadius: "12px" }}>
                <p style={{ margin: "0 0 10px 0", color: theme.textSec }}>Valoración *</p>
                <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                  {[1, 2, 3, 4, 5].map(num => (
                    <span key={num} onClick={() => setDatos({ ...datos, valoracion: num })}
                      style={{ fontSize: "35px", cursor: "pointer", color: datos.valoracion >= num ? "#FBBC04" : "#D1D3D4" }}>★</span>
                  ))}
                </div>
              </div>
            )}
            {(categoriaSel === 'libros' || categoriaSel === 'peliculas' || categoriaSel === 'conciertos') && (
              <div>
                <p style={{ fontSize: "14px", marginBottom: "10px", fontWeight: "500" }}>Géneros *:</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {(categoriaSel === 'conciertos' ? generosSpotify : generosPelisLibros).map(et => (
                    <div key={et} onClick={() => toggleEtiqueta(et)}
                      style={{ padding: "10px 16px", borderRadius: "20px", border: "1px solid #0047bb", fontSize: "13px", backgroundColor: datos.etiquetas.includes(et) ? "#0047bb" : "transparent", color: datos.etiquetas.includes(et) ? "#fff" : "#0047bb" }}>{et}</div>
                  ))}
                </div>
              </div>
            )}
            <textarea placeholder="Descripción (opcional)..." style={{ ...estiloInput, height: "100px", backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }} value={datos.descripcion} onChange={e => setDatos({...datos, descripcion: e.target.value})} />
            <button type="submit" disabled={cargando} style={btnGuardarOriginal}>{cargando ? 'Guardando...' : (editandoId ? 'Actualizar' : 'Guardar')}</button>
          </form>
        </div>
      )}

      {/* --- PANTALLA HISTORIAL --- */}
      {pantalla === "historial" && (
        <div style={{ padding: "100px 24px", paddingBottom: "100px" }}>
          <button onClick={() => setPantalla("inicio")} style={btnVolver}>← Inicio</button>
          <h2 style={{ marginBottom: "20px" }}>Tu Historial</h2>
          <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "10px" }}>
            {[{ id: 'libros', n: 'Libros', i: '📚' }, { id: 'peliculas', n: 'Películas', i: '🎬' }, { id: 'deporte', n: 'Deporte', i: '💪' }, { id: 'conciertos', n: 'Conciertos', i: '🎸' }, { id: 'ocio', n: 'Ocio', i: '💃' }].map(cat => (
              <div key={cat.id} onClick={() => toggleFiltroCat(cat.id)} style={{ padding: "10px 14px", borderRadius: "12px", fontSize: "14px", whiteSpace: "nowrap", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontWeight: "bold", backgroundColor: filtroCategorias.includes(cat.id) ? "#0047bb" : theme.btnGhost, color: filtroCategorias.includes(cat.id) ? "#fff" : theme.textSec }}>
                <span>{cat.i}</span> <span>{cat.n}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px", margin: "10px 0 20px 0" }}>
            {['Últimos 7 días', 'Último mes', 'Todo'].map(t => (
              <button key={t} onClick={() => setFiltroTiempo(t)} style={{ flex: 1, padding: "10px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", border: "none", backgroundColor: filtroTiempo === t ? "#0047bb" : theme.btnGhost, color: filtroTiempo === t ? "#fff" : theme.textSec }}>{t}</button>
            ))}
          </div>
          {registrosFiltrados.length === 0 ? <p style={{textAlign:'center', color:'#999'}}>No hay registros aquí.</p> : 
            registrosFiltrados.map((reg, idx) => {
              const esExpandido = registroExpandido === idx;
              return (
                <div key={idx} style={{ padding: "15px", borderRadius: "12px", border: `1px solid ${theme.border}`, marginBottom: "12px", backgroundColor: theme.card }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: 'start' }}>
                    <div onClick={() => setRegistroExpandido(esExpandido ? null : idx)} style={{ cursor: 'pointer', flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#0047bb", fontWeight: "bold", marginBottom: "5px" }}>
                        <span>{reg.categoria_id.toUpperCase()}</span> <span>{formatearFecha(reg.fecha)}</span>
                      </div>
                      <h4 style={{ margin: "0", fontSize: "16px", color: theme.text }}>{reg.titulo || reg.cantante || reg.tipo_deporte}</h4>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '10px' }}>
                      <button onClick={() => prepararEdicion(reg)} style={{...btnCircularAccion, backgroundColor: theme.btnGhost}}>✏️</button>
                      <button onClick={() => setMostrarConfirmarBorrar({id: reg.id, tabla: reg.categoria_id})} style={{...btnCircularAccion, backgroundColor: theme.btnGhost}}>🗑️</button>
                    </div>
                  </div>
                  {esExpandido && (
                    <div onClick={() => setRegistroExpandido(null)} style={{ marginTop: '15px', paddingTop: '15px', borderTop: `1px solid ${theme.border}`, fontSize: '14px', color: theme.textSec, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {reg.autor && <div><strong>Autor:</strong> {reg.autor}</div>}
                      {reg.director && <div><strong>Director:</strong> {reg.director}</div>}
                      {reg.cantante && <div><strong>Cantante:</strong> {reg.cantante}</div>}
                      {reg.lugar && <div><strong>Lugar:</strong> {reg.lugar}</div>}
                      {reg.tipo_deporte && <div><strong>Deporte:</strong> {reg.tipo_deporte}</div>}
                      {reg.duracion && <div><strong>Duración:</strong> {reg.duracion} min</div>}
                      {reg.km && <div><strong>Distancia:</strong> {reg.km} km</div>}
                      {reg.tipo_ocio_manual && <div><strong>Tipo Ocio:</strong> {reg.tipo_ocio_manual}</div>}
                      {reg.etiquetas && reg.etiquetas.length > 0 && <div><strong>Géneros:</strong> {reg.etiquetas.join(", ")}</div>}
                      {reg.valoracion > 0 && <div style={{ color: "#FBBC04" }}><strong>Valoración:</strong> {"★".repeat(reg.valoracion)}</div>}
                      {reg.descripcion && <div style={{ fontStyle: 'italic', backgroundColor: theme.btnGhost, padding: '8px', borderRadius: '4px' }}>"{reg.descripcion}"</div>}
                    </div>
                  )}
                </div>
              );
            })
          }
        </div>
      )}

      {/* --- PANTALLA MIS KPIs ACTUALIZADA --- */}
      {pantalla === "kpis" && (
        <div style={{ padding: "100px 24px 40px" }}>
          <button onClick={() => setPantalla("inicio")} style={btnVolver}>← Inicio</button>
          <h2 style={{ marginBottom: "20px" }}>Mis KPIs</h2>

          {/* Filtros de Categoría */}
          <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "10px", marginBottom: "5px" }}>
            {[{ id: 'libros', n: 'Libros', i: '📚' }, { id: 'peliculas', n: 'Películas', i: '🎬' }, { id: 'deporte', n: 'Deporte', i: '💪' }, { id: 'conciertos', n: 'Conciertos', i: '🎸' }, { id: 'ocio', n: 'Ocio', i: '💃' }].map(cat => (
              <div key={cat.id} onClick={() => toggleFiltroCat(cat.id)} style={{ padding: "10px 14px", borderRadius: "12px", fontSize: "14px", whiteSpace: "nowrap", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontWeight: "bold", backgroundColor: filtroCategorias.includes(cat.id) ? "#0047bb" : "#f1f3f4", color: filtroCategorias.includes(cat.id) ? "#fff" : "#5f6368" }}>
                <span>{cat.i}</span> <span>{cat.n}</span>
              </div>
            ))}
          </div>

          {/* Filtros de Tiempo */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "25px" }}>
            {['Últimos 7 días', 'Último mes', 'Todo'].map(t => (
              <button key={t} onClick={() => setFiltroTiempo(t)} style={{ flex: 1, padding: "10px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", border: "none", backgroundColor: filtroTiempo === t ? "#0047bb" : "#f1f3f4", color: filtroTiempo === t ? "#fff" : "#5f6368" }}>{t}</button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Grid de Resumen Superior */}
            <div style={{ display: 'grid', gridTemplateColumns: filtroCategorias.includes('deporte') ? '1fr 1fr' : '1fr', gap: '15px' }}>
              <div style={cardKPILargo}>
                <span style={labelKPI}>Total de Registros</span>
                <div style={valorKPI}>{statsKPI.total}</div>
              </div>
              
              {/* Solo mostramos Deporte si la categoría está activa */}
              {filtroCategorias.includes('deporte') && (
                <div style={cardKPILargo}>
                  <span style={labelKPI}>Tiempo Total Deporte</span>
                  <div style={valorKPI}>{statsKPI.tiempoDeporte} <small style={{fontSize:'12px'}}>min</small></div>
                </div>
              )}
            </div>

            {/* TARJETA DINÁMICA: ANÁLISIS DETALLADO (Solo si hay 1 categoría) */}
            {statsDetalladas && statsDetalladas.length > 0 && (
              <div style={cardKPILargo}>
                <span style={labelKPI}>Análisis de {filtroCategorias[0].toUpperCase()}</span>
                <div style={{ width: '100%', height: '250px', marginTop: '10px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statsDetalladas} layout="vertical" margin={{ left: 40, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#eee" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" style={{ fontSize: '11px', fontWeight: 'bold' }} width={80} />
                      <Tooltip cursor={{fill: '#f1f3f4'}} contentStyle={{borderRadius: '10px', border: 'none'}} />
                      <Bar dataKey="valor" fill={COLORES_KPI[filtroCategorias[0] as keyof typeof COLORES_KPI]} radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* TARJETA DE VALORACIONES (Solo si hay alguna categoría de valoración activa) */}
            {filtroCategorias.some(c => ['libros', 'peliculas', 'conciertos', 'ocio'].includes(c)) && (
              <div style={cardKPILargo}>
                <span style={labelKPI}>Valoraciones Medias</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                  {['libros', 'peliculas', 'conciertos', 'ocio'].map(cat => {
                    if (!filtroCategorias.includes(cat)) return null;
                    const regsConVal = registrosFiltrados.filter(r => r.categoria_id === cat && r.valoracion > 0);
                    const media = regsConVal.length > 0 
                      ? (regsConVal.reduce((acc, curr) => acc + curr.valoracion, 0) / regsConVal.length).toFixed(1)
                      : null;
                    
                    if (!media) return null;

                    return (
                      <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', textTransform: 'capitalize', fontWeight: '500' }}>
                          {cat === 'ocio' ? '💃 Ocio' : cat === 'libros' ? '📚 Libros' : cat === 'peliculas' ? '🎬 Películas' : '🎸 Conciertos'}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ fontWeight: 'bold', color: '#0047bb' }}>{media}</span>
                          <span style={{ color: '#FBBC04', fontSize: '18px' }}>★</span>
                        </div>
                      </div>
                    );
                  })}
                  {registrosFiltrados.filter(r => r.categoria_id !== 'deporte' && r.valoracion > 0).length === 0 && (
                    <p style={{fontSize: '12px', color: '#999', textAlign: 'center'}}>Sin valoraciones</p>
                  )}
                </div>
              </div>
            )}

            {/* Gráfico de Sectores: Solo si hay más de una seleccionada */}
            {filtroCategorias.length > 1 && (
              <div style={cardKPILargo}>
                <span style={labelKPI}>Categorías</span>
                <div style={{ width: '100%', height: '260px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statsKPI.resumen.filter(s => s.total > 0)} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                        {statsKPI.resumen.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORES_KPI[entry.name as keyof typeof COLORES_KPI]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Gráfico de Evolución: Solo muestra las líneas de las categorías seleccionadas */}
            <div style={cardKPILargo}>
              <span style={labelKPI}>Evolución Temporal</span>
              <div style={{ width: '100%', height: '280px', marginTop: '10px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={datosEvolucion} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} style={{fontSize: '11px', fontWeight: 'bold'}} />
                    <YAxis axisLine={false} tickLine={false} style={{fontSize: '11px'}} />
                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                    <Legend iconType="circle" />
                    {filtroCategorias.map(k => (
                      <Line key={k} type="monotone" dataKey={k} stroke={COLORES_KPI[k as keyof typeof COLORES_KPI]} strokeWidth={3} dot={{r:4}} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PANTALLA AJUSTES (NUEVA) --- */}
      {pantalla === "ajustes" && (
        <div style={{ padding: "100px 24px" }}>
          <button onClick={() => setPantalla("inicio")} style={btnVolver}>← Inicio</button>
          <h2 style={{ marginBottom: "30px" }}>Ajustes</h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            <div style={{...tarjetaLarga, backgroundColor: theme.card, borderColor: theme.border, alignItems: 'center'}} onClick={() => setDarkMode(!darkMode)}>
              <span>{darkMode ? "☀️ Modo Claro" : "🌙 Modo Oscuro"}</span>
              <div style={{width: '40px', height: '20px', borderRadius: '10px', backgroundColor: darkMode ? '#0047bb' : '#ccc', position: 'relative'}}>
                <div style={{width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#fff', position: 'absolute', top: '2px', left: darkMode ? '22px' : '2px', transition: '0.2s'}}></div>
              </div>
            </div>

            <div style={{...tarjetaLarga, backgroundColor: theme.card, borderColor: theme.border}} onClick={exportarCSV}>
              <span>📤 Exportar datos (CSV)</span>
            </div>

            <div style={{...tarjetaLarga, backgroundColor: '#fff1f1', borderColor: '#ffcccc', color: '#ff4d4d'}} onClick={cerrarSesion}>
              <span>🚪 Cerrar Sesión</span>
            </div>
          </div>
          
          <p style={{textAlign: 'center', marginTop: '40px', color: theme.textSec, fontSize: '12px'}}>App desarrollada por Marta Carballo</p>
        </div>
      )}

      {/* --- MENU SIDEBAR --- */}
      {menuAbierto && (
        <div style={{...sidebar, backgroundColor: theme.card}}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
            <h2 style={{ color: "#0047bb", margin: 0 }}>RosApp</h2>
            <button onClick={() => setMenuAbierto(false)} style={{ border: "none", background: "none", fontSize: "24px", color: theme.text }}>✕</button>
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div onClick={() => { setPantalla("inicio"); setMenuAbierto(false); }} style={{ ...itemMenuMenu, backgroundColor: pantalla === "inicio" ? "#eef4ff" : "transparent", color: pantalla === "inicio" ? "#0047bb" : theme.textSec }}>🏠 Inicio</div>
            <div onClick={() => { resetForm(); setPantalla("categorias"); setMenuAbierto(false); }} style={{ ...itemMenuMenu, backgroundColor: (pantalla === "categorias" || pantalla === "formulario") ? "#eef4ff" : "transparent", color: (pantalla === "categorias" || pantalla === "formulario") ? "#0047bb" : theme.textSec }}>➕ Registro</div>
            <div onClick={() => { setPantalla("historial"); setMenuAbierto(false); }} style={{ ...itemMenuMenu, backgroundColor: pantalla === "historial" ? "#eef4ff" : "transparent", color: pantalla === "historial" ? "#0047bb" : theme.textSec }}>📜 Historial</div>
            <div onClick={() => { setPantalla("kpis"); setMenuAbierto(false); }} style={{ ...itemMenuMenu, backgroundColor: pantalla === "kpis" ? "#eef4ff" : "transparent", color: pantalla === "kpis" ? "#0047bb" : theme.textSec }}>📊 Mis KPIs</div>
            <div onClick={() => { setPantalla("ajustes"); setMenuAbierto(false); }} style={{ ...itemMenuMenu, backgroundColor: pantalla === "ajustes" ? "#eef4ff" : "transparent", color: pantalla === "ajustes" ? "#0047bb" : theme.textSec }}>⚙️ Ajustes</div>
          </nav>
        </div>
      )}
    </div>
  );
}

// --- ESTILOS ---
const cardKPILargo = { width: '100%', boxSizing: 'border-box' as 'border-box', border: '1px solid #eee', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' };
const labelKPI = { fontSize: '11px', color: '#888', display: 'block', marginBottom: '8px', textTransform: 'uppercase' as 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' as 'bold' };
const valorKPI = { fontSize: '28px', fontWeight: 'bold' as 'bold', color: '#0047bb' };
const contenedorInicio = { height: "100vh", display: "flex", flexDirection: "column" as "column", justifyContent: "center", padding: "0 40px", gap: '40px' };
const tituloGrande = { fontSize: "48px", lineHeight: "1.1", fontWeight: "bold" as "bold", margin: "0" };
const subtitulo = { fontSize: "18px", marginTop: "10px", fontWeight: "500" as "500", maxWidth: "250px" };
const btnNuevoRegistroCuadrado = { backgroundColor: "#0047bb", color: "#fff", border: "none", borderRadius: "4px", padding: "16px 24px", fontSize: "18px", fontWeight: "600" as "600", width: "fit-content", cursor: "pointer" };
const btnMenuHamburguesa = { position: "fixed" as "fixed", top: "40px", left: "40px", width: "45px", height: "45px", backgroundColor: "#0047bb", border: "none", display: "flex", flexDirection: "column" as "column", justifyContent: "center", alignItems: "center", gap: "5px", borderRadius: "2px", zIndex: 100, cursor: "pointer" };
const lineaMenu = { width: "24px", height: "3px", backgroundColor: "#fff" };
const estiloCentradoLogin = { height: "100vh", display: "flex", flexDirection: "column" as "column", justifyContent: "center", alignItems: "center" };
const tecladoGrid = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "15px" };
const botonTecla = { width: '70px', height: '70px', borderRadius: "50%", border: "none", fontSize: "22px" };
const btnVolver = { background: "none", border: "none", color: "#0047bb", fontWeight: "bold" as "bold", marginBottom: "15px", cursor: "pointer" };
const estiloInput = { padding: "16px", borderRadius: "12px", border: "1px solid #dfe1e5", width: "100%", boxSizing: "border-box" as "border-box" };
const tarjetaLarga = { padding: "20px", borderRadius: "16px", display: "flex", justifyContent: "space-between", fontWeight: "bold" as "bold", border: "1px solid #eee", cursor: "pointer" };
const sidebar = { position: "fixed" as "fixed", top: 0, left: 0, width: "80%", height: "100%", zIndex: 1001, padding: "30px", boxShadow: "10px 0 30px rgba(0,0,0,0.1)" };
const itemMenuMenu = { padding: "16px 20px", borderRadius: "12px", fontSize: "18px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" };
const btnGuardarOriginal = { backgroundColor: "#0047bb", color: "#fff", border: "none", borderRadius: "28px", padding: "18px", fontSize: "18px", fontWeight: "bold" as "bold", cursor: "pointer" };
const btnCircularAccion = { border: 'none', borderRadius: '50%', width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '16px' };
const overlayModal = { position: 'fixed' as 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '20px' };
const cardModal = { padding: '30px', borderRadius: '20px', width: '100%', maxWidth: '400px', textAlign: 'center' as 'center' };
const btnModalCancel = { padding: '12px 20px', borderRadius: '12px', border: 'none', fontWeight: 'bold' as 'bold', flex: 1 };
const btnModalConfirm = { padding: '12px 20px', borderRadius: '12px', border: 'none', backgroundColor: '#ff4d4d', color: '#fff', fontWeight: 'bold' as 'bold', flex: 1 };

export default App;

