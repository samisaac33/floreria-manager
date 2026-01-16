"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Order, OrderStatus } from "@/types/order"
import { Button } from "@/components/ui/button"
import { Loader2, Printer } from "lucide-react"

function ReporteContent() {
  const searchParams = useSearchParams()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''

  useEffect(() => {
    if (from && to) {
      fetchOrders()
    } else {
      setLoading(false)
    }
  }, [from, to])

  async function fetchOrders() {
    setLoading(true)
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .gte("delivery_date", from)
      .lte("delivery_date", to)
      .order("delivery_date", { ascending: true })
    
    if (!error) {
      setOrders(data || [])
    }
    setLoading(false)
  }

  // Calcular totales
  const totalVentas = orders.reduce((sum, order) => sum + (order.price || 0), 0)
  const totalPedidos = orders.length
  const pedidosEntregados = orders.filter(o => o.status === 'entregado').length
  const pedidosPendientes = orders.filter(o => o.status === 'pendiente' || o.status === 'en_preparacion' || o.status === 'en_camino').length

  const handlePrint = () => {
    window.print()
  }

  // Formatear fecha para mostrar
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  // Formatear estado para mostrar
  const formatStatus = (status: OrderStatus) => {
    const statusMap: Record<OrderStatus, string> = {
      'pendiente': 'Pendiente',
      'en_preparacion': 'En Preparación',
      'en_camino': 'En Camino',
      'entregado': 'Entregado',
      'cancelado': 'Cancelado'
    }
    return statusMap[status] || status
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    )
  }

  if (!from || !to) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Parámetros faltantes</h1>
          <p className="text-slate-600">Por favor, proporciona los parámetros `from` y `to` en la URL.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 print:p-4">
      {/* Botón de impresión - Se oculta al imprimir */}
      <div className="mb-6 print:hidden">
        <Button onClick={handlePrint} className="bg-rose-600 hover:bg-rose-700">
          <Printer className="mr-2 h-4 w-4" />
          Imprimir Reporte / Guardar PDF
        </Button>
      </div>

      {/* Contenido del reporte */}
      <div className="bg-white print:bg-white">
        {/* Encabezado */}
        <div className="text-center mb-8 print:mb-6">
          <h1 className="text-3xl font-bold text-slate-900 print:text-black mb-2">
            REPORTE DE VENTAS Y OPERACIONES
          </h1>
          <p className="text-sm text-slate-600 print:text-black">
            Período: {formatDate(from)} - {formatDate(to)}
          </p>
        </div>

        {/* Bloque destacado - Total en dólares */}
        <div className="mb-8 print:mb-6 border-4 border-slate-900 print:border-black p-6 print:p-4 text-center">
          <p className="text-sm font-semibold text-slate-700 print:text-black mb-2 uppercase tracking-wide">
            Total de Ventas
          </p>
          <p className="text-5xl print:text-4xl font-bold text-slate-900 print:text-black">
            ${totalVentas.toFixed(2)}
          </p>
        </div>

        {/* Desglose de resumen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 print:mb-6 print:grid-cols-4">
          <div className="border border-slate-300 print:border-black p-3 text-center">
            <p className="text-xs font-semibold text-slate-600 print:text-black uppercase mb-1">Total Pedidos</p>
            <p className="text-2xl font-bold text-slate-900 print:text-black">{totalPedidos}</p>
          </div>
          <div className="border border-slate-300 print:border-black p-3 text-center">
            <p className="text-xs font-semibold text-slate-600 print:text-black uppercase mb-1">Entregados</p>
            <p className="text-2xl font-bold text-emerald-700 print:text-black">{pedidosEntregados}</p>
          </div>
          <div className="border border-slate-300 print:border-black p-3 text-center">
            <p className="text-xs font-semibold text-slate-600 print:text-black uppercase mb-1">Pendientes</p>
            <p className="text-2xl font-bold text-amber-700 print:text-black">{pedidosPendientes}</p>
          </div>
          <div className="border border-slate-300 print:border-black p-3 text-center">
            <p className="text-xs font-semibold text-slate-600 print:text-black uppercase mb-1">Promedio</p>
            <p className="text-2xl font-bold text-slate-900 print:text-black">
              ${totalPedidos > 0 ? (totalVentas / totalPedidos).toFixed(2) : '0.00'}
            </p>
          </div>
        </div>

        {/* Tabla de pedidos */}
        <div className="mb-8 print:mb-6">
          <h2 className="text-xl font-bold text-slate-900 print:text-black mb-4 print:mb-2 uppercase">
            Desglose de Pedidos
          </h2>
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full border-collapse border border-slate-300 print:border-black text-xs print:text-xs">
              <thead>
                <tr className="bg-slate-100 print:bg-slate-200">
                  <th className="border border-slate-300 print:border-black p-2 text-left font-semibold text-slate-900 print:text-black">
                    Fecha
                  </th>
                  <th className="border border-slate-300 print:border-black p-2 text-left font-semibold text-slate-900 print:text-black">
                    Cliente
                  </th>
                  <th className="border border-slate-300 print:border-black p-2 text-left font-semibold text-slate-900 print:text-black">
                    Producto
                  </th>
                  <th className="border border-slate-300 print:border-black p-2 text-right font-semibold text-slate-900 print:text-black">
                    Precio
                  </th>
                  <th className="border border-slate-300 print:border-black p-2 text-center font-semibold text-slate-900 print:text-black">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="border border-slate-300 print:border-black p-4 text-center text-slate-600 print:text-black">
                      No hay pedidos en este período
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50 print:hover:bg-transparent">
                      <td className="border border-slate-300 print:border-black p-2 text-slate-900 print:text-black">
                        {formatDate(order.delivery_date)}
                      </td>
                      <td className="border border-slate-300 print:border-black p-2 text-slate-900 print:text-black">
                        {order.client_name || '-'}
                      </td>
                      <td className="border border-slate-300 print:border-black p-2 text-slate-900 print:text-black">
                        {order.product_code || '-'}
                      </td>
                      <td className="border border-slate-300 print:border-black p-2 text-right text-slate-900 print:text-black font-medium">
                        ${(order.price || 0).toFixed(2)}
                      </td>
                      <td className="border border-slate-300 print:border-black p-2 text-center text-slate-900 print:text-black">
                        {formatStatus(order.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {orders.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 print:bg-slate-200 font-bold">
                    <td colSpan={3} className="border border-slate-300 print:border-black p-2 text-right text-slate-900 print:text-black">
                      TOTAL:
                    </td>
                    <td className="border border-slate-300 print:border-black p-2 text-right text-slate-900 print:text-black">
                      ${totalVentas.toFixed(2)}
                    </td>
                    <td className="border border-slate-300 print:border-black p-2 text-center text-slate-900 print:text-black">
                      {totalPedidos} pedidos
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Firma */}
        <div className="mt-12 print:mt-8 pt-8 print:pt-6 border-t-2 border-slate-300 print:border-black">
          <div className="max-w-xs mx-auto">
            <div className="mb-2 border-b-2 border-slate-900 print:border-black"></div>
            <p className="text-center text-sm font-semibold text-slate-900 print:text-black">
              Firma del Responsable
            </p>
          </div>
        </div>
      </div>

      {/* Estilos de impresión */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 1cm;
            size: A4;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:border-black {
            border-color: #000 !important;
          }
          
          .print\\:text-black {
            color: #000 !important;
          }
          
          .print\\:bg-white {
            background-color: #fff !important;
          }
          
          .print\\:bg-slate-200 {
            background-color: #e2e8f0 !important;
          }
          
          .print\\:p-4 {
            padding: 1rem !important;
          }
          
          .print\\:mb-6 {
            margin-bottom: 1.5rem !important;
          }
          
          .print\\:mb-2 {
            margin-bottom: 0.5rem !important;
          }
          
          .print\\:mt-8 {
            margin-top: 2rem !important;
          }
          
          .print\\:pt-6 {
            padding-top: 1.5rem !important;
          }
          
          .print\\:text-4xl {
            font-size: 2.25rem !important;
          }
          
          .print\\:text-xs {
            font-size: 0.75rem !important;
          }
          
          .print\\:grid-cols-4 {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          }
          
          .print\\:overflow-visible {
            overflow: visible !important;
          }
          
          .print\\:hover\\:bg-transparent:hover {
            background-color: transparent !important;
          }
        }
      `}</style>
    </div>
  )
}

export default function ReportePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    }>
      <ReporteContent />
    </Suspense>
  )
}
