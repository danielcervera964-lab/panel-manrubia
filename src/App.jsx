import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function App() {
  const [bicis, setBicis] = useState([])
  const [historial, setHistorial] = useState([])
  const [tab, setTab] = useState('curso')
  const [buscar, setBuscar] = useState('')
  const [modal, setModal] = useState(false)
  const [modalFinalizar, setModalFinalizar] = useState(null)
  const [modoEdicion, setModoEdicion] = useState(false)
  
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [trabajo, setTrabajo] = useState('')
  
  // Para el desglose de factura
  const [conceptos, setConceptos] = useState([{ concepto: '', precio: '' }])
  const [precioTotal, setPrecioTotal] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    const { data: b } = await supabase.from('bicis').select('*').order('fecha', { ascending: false })
    const { data: h } = await supabase.from('historial_clientes').select('*')
    setBicis(b || [])
    setHistorial(h || [])
  }

  async function buscarCliente(tel) {
    const cliente = historial.find(c => c.telefono === tel)
    if (cliente) setNombre(cliente.nombre)
  }

  async function guardarBici() {
    if (!nombre || !telefono || !trabajo) {
      alert('Rellena todos los campos')
      return
    }

    await supabase.from('bicis').insert({
      nombre,
      telefono,
      trabajo,
      fecha: new Date().toISOString(),
      estado: 'curso'
    })

    const existe = historial.find(c => c.telefono === telefono)
    if (!existe) {
      await supabase.from('historial_clientes').insert({ nombre, telefono })
    }

    setModal(false)
    setNombre('')
    setTelefono('')
    setTrabajo('')
    cargarDatos()
  }

  function añadirConcepto() {
    setConceptos([...conceptos, { concepto: '', precio: '' }])
  }

  function eliminarConcepto(index) {
    setConceptos(conceptos.filter((_, i) => i !== index))
  }

  function actualizarConcepto(index, campo, valor) {
    const nuevos = [...conceptos]
    nuevos[index][campo] = valor
    setConceptos(nuevos)
    
    // Calcular total automáticamente
    const total = nuevos.reduce((sum, c) => sum + (parseFloat(c.precio) || 0), 0)
    setPrecioTotal(total.toFixed(2))
  }

  function abrirModalEdicion(bici) {
    setModalFinalizar(bici.id)
    setModoEdicion(true)
    
    // Cargar datos existentes
    if (bici.desglose) {
      const conceptosExistentes = bici.desglose.split('\n').map(linea => {
        const [concepto, precio] = linea.split(': ')
        return { concepto, precio: precio.replace('€', '') }
      })
      setConceptos(conceptosExistentes)
      setPrecioTotal(bici.precio)
    }
  }

  async function finalizarBici(id) {
    const bici = bicis.find(b => b.id === id)
    
    // Validar que haya al menos un concepto con precio
    const hayConceptos = conceptos.some(c => c.concepto && c.precio)
    if (!hayConceptos || !precioTotal) {
      alert('Añade al menos un concepto con precio')
      return
    }

    // Generar desglose en texto
    const desglose = conceptos
      .filter(c => c.concepto && c.precio)
      .map(c => `${c.concepto}: ${c.precio}€`)
      .join('\n')
    
    await supabase.from('bicis')
      .update({ 
        estado: 'finalizada', 
        fecha_fin: new Date().toISOString(),
        precio: precioTotal,
        desglose: desglose
      })
      .eq('id', id)

    // Mensaje WhatsApp con desglose
    const msgDesglose = conceptos
      .filter(c => c.concepto && c.precio)
      .map(c => `• ${c.concepto}: ${c.precio}€`)
      .join('\n')
    
    const msg = `¡Hola! Tu bici ya está lista para recoger en Bicicletas Manrubia 🚴‍♂️\n\n${msgDesglose}\n\n*Total: ${precioTotal}€*\n\nPor favor, no respondas a este mensaje. Para cualquier duda, llámanos al 964 667 035.`
    
    // Intentar abrir WhatsApp
    const urlWhatsApp = `https://wa.me/34${bici.telefono}?text=${encodeURIComponent(msg)}`
    const ventana = window.open(urlWhatsApp, '_blank')
    
    if (!ventana) {
      // Si se bloqueó la ventana, copiar al portapapeles
      navigator.clipboard.writeText(msg)
      alert('WhatsApp bloqueado. El mensaje se ha copiado al portapapeles. Pégalo manualmente en WhatsApp.')
    }
    
    setModalFinalizar(null)
    setModoEdicion(false)
    setConceptos([{ concepto: '', precio: '' }])
    setPrecioTotal('')
    cargarDatos()
  }

  async function actualizarBiciEdicion(id) {
    // Validar que haya al menos un concepto con precio
    const hayConceptos = conceptos.some(c => c.concepto && c.precio)
    if (!hayConceptos || !precioTotal) {
      alert('Añade al menos un concepto con precio')
      return
    }

    // Generar desglose en texto
    const desglose = conceptos
      .filter(c => c.concepto && c.precio)
      .map(c => `${c.concepto}: ${c.precio}€`)
      .join('\n')
    
    await supabase.from('bicis')
      .update({ 
        precio: precioTotal,
        desglose: desglose
      })
      .eq('id', id)

    alert('Bici actualizada correctamente')
    
    setModalFinalizar(null)
    setModoEdicion(false)
    setConceptos([{ concepto: '', precio: '' }])
    setPrecioTotal('')
    cargarDatos()
  }

  async function reenviarWhatsApp(bici) {
    if (!bici.desglose || !bici.precio) {
      alert('Esta bici no tiene desglose guardado')
      return
    }

    const msgDesglose = bici.desglose.split('\n').map(linea => `• ${linea}`).join('\n')
    const msg = `¡Hola! Tu bici ya está lista para recoger en Bicicletas Manrubia 🚴‍♂️\n\n${msgDesglose}\n\n*Total: ${bici.precio}€*\n\nPor favor, no respondas a este mensaje. Para cualquier duda, llámanos al 964 667 035.`
    
    const urlWhatsApp = `https://wa.me/34${bici.telefono}?text=${encodeURIComponent(msg)}`
    const ventana = window.open(urlWhatsApp, '_blank')
    
    if (!ventana) {
      navigator.clipboard.writeText(msg)
      alert('WhatsApp bloqueado. El mensaje se ha copiado al portapapeles.')
    }
  }

  async function eliminarBici(id) {
    if (confirm('¿Seguro que quieres eliminar esta bici?')) {
      await supabase.from('bicis').delete().eq('id', id)
      cargarDatos()
    }
  }

  const filtradas = bicis
    .filter(b => b.estado === tab)
    .filter(b => 
      b.nombre.toLowerCase().includes(buscar.toLowerCase()) ||
      b.telefono.includes(buscar)
    )

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-8">
      <div className="max-w-6xl mx-auto">
        
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-orange-600">Panel Taller</h1>
              <p className="text-gray-600 mt-2">Bicicletas Manrubia</p>
            </div>
            <div className="text-right">
              <p className="text-5xl font-bold text-orange-600">{bicis.filter(b => b.estado === 'curso').length}</p>
              <p className="text-gray-600">bicis en taller</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setTab('curso')}
              className={`flex-1 py-3 rounded-xl font-semibold transition ${
                tab === 'curso' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              En Curso
            </button>
            <button
              onClick={() => setTab('finalizada')}
              className={`flex-1 py-3 rounded-xl font-semibold transition ${
                tab === 'finalizada' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Finalizadas
            </button>
          </div>

          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={buscar}
              onChange={e => setBuscar(e.target.value)}
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none"
            />
            <button
              onClick={() => setModal(true)}
              className="px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition"
            >
              + Nueva Bici
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {filtradas.map(bici => (
            <div key={bici.id} className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800">{bici.nombre}</h3>
                  <p className="text-gray-600">{bici.telefono}</p>
                  <p className="text-gray-700 mt-2">{bici.trabajo}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {new Date(bici.fecha).toLocaleDateString('es-ES')}
                  </p>
                  
                  {tab === 'finalizada' && bici.desglose && (
                    <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                      <p className="font-semibold text-gray-700 mb-2">Desglose:</p>
                      <div className="space-y-1 text-sm">
                        {bici.desglose.split('\n').map((linea, i) => (
                          <p key={i} className="text-gray-700">{linea}</p>
                        ))}
                      </div>
                      <p className="text-2xl font-bold text-orange-600 mt-3 pt-3 border-t border-orange-200">
                        Total: {bici.precio}€
                      </p>
                    </div>
                  )}
                  
                  {tab === 'finalizada' && !bici.desglose && bici.precio && (
                    <p className="text-2xl font-bold text-orange-600 mt-2">{bici.precio}€</p>
                  )}
                </div>
                
                <div className="flex gap-2 flex-wrap justify-end">
                  {tab === 'curso' && (
                    <button
                      onClick={() => setModalFinalizar(bici.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      Marcar Lista
                    </button>
                  )}
                  
                  {tab === 'finalizada' && (
                    <>
                      <button
                        onClick={() => abrirModalEdicion(bici)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => reenviarWhatsApp(bici)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      >
                        Reenviar WhatsApp
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => eliminarBici(bici.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {modal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-6">Nueva Bici</h2>
              
              <input
                type="text"
                placeholder="Nombre"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl mb-4 focus:border-orange-500 focus:outline-none"
              />
              
              <input
                type="tel"
                placeholder="Teléfono"
                value={telefono}
                onChange={e => {
                  setTelefono(e.target.value)
                  if (e.target.value.length >= 9) buscarCliente(e.target.value)
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl mb-4 focus:border-orange-500 focus:outline-none"
              />
              
              <textarea
                placeholder="¿Qué hay que hacerle a la bici?"
                value={trabajo}
                onChange={e => setTrabajo(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl mb-6 focus:border-orange-500 focus:outline-none h-32"
              />

              <div className="flex gap-4">
                <button
                  onClick={() => setModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarBici}
                  className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {modalFinalizar && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6">
                {modoEdicion ? 'Editar Desglose' : 'Finalizar Bici - Desglose'}
              </h2>
              
              <div className="space-y-3 mb-6">
                {conceptos.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Concepto (ej: Cambio de frenos)"
                      value={c.concepto}
                      onChange={e => actualizarConcepto(i, 'concepto', e.target.value)}
                      className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="€"
                      value={c.precio}
                      onChange={e => actualizarConcepto(i, 'precio', e.target.value)}
                      className="w-24 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:outline-none"
                    />
                    {conceptos.length > 1 && (
                      <button
                        onClick={() => eliminarConcepto(i)}
                        className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={añadirConcepto}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition mb-6"
              >
                + Añadir concepto
              </button>

              <div className="bg-orange-50 p-4 rounded-lg mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-700">Total:</span>
                  <span className="text-3xl font-bold text-orange-600">{precioTotal || '0'}€</span>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setModalFinalizar(null)
                    setModoEdicion(false)
                    setConceptos([{ concepto: '', precio: '' }])
                    setPrecioTotal('')
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => modoEdicion ? actualizarBiciEdicion(modalFinalizar) : finalizarBici(modalFinalizar)}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition"
                >
                  {modoEdicion ? 'Guardar Cambios' : 'Finalizar y Enviar WhatsApp'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
