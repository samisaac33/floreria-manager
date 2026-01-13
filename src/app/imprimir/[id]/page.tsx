"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Order } from "@/types/order"
import { Printer, MapPin, Phone, User, Package, Clock } from "lucide-react"

export default function ImprimirRecibo() {
  const { id } = useParams()
  const [order, setOrder] = useState<Order | null>(null)

  useEffect(() => {
    async function getOrder() {
      const { data } = await supabase.from("orders").select("*").eq("id", id).single()
      if (data) setOrder(data)
    }
    getOrder()
  }, [id])

  if (!order) return <p className="p-10 text-center text-slate-500">Cargando recibo...</p>

  return (
    <div className="bg-white min-h-screen p-4 md:p-10 font-sans text-slate-900">
      {/* Botón flotante que desaparece al imprimir */}
      <div className="mb-8 flex justify-center print:hidden">
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full font-bold shadow-xl hover:bg-rose-600 transition-colors"
        >
          <Printer size={20} /> Confirmar e Imprimir Recibo
        </button>
      </div>

      {/* ÁREA DE IMPRESIÓN */}
      <div className="max-w-[800px] mx-auto border-2 border-slate-200 p-8 rounded-none shadow-none print:border-none print:p-0">
        
        {/* Encabezado del Recibo */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-rose-600">Recibo de Entrega</h1>
            <p className="text-sm font-bold text-slate-500 mt-1">ID PEDIDO: {order.id?.substring(0, 8).toUpperCase()}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold uppercase">Fecha de Entrega</p>
            <p className="text-xl font-black">{order.delivery_date}</p>
            <p className="text-sm font-medium">{order.delivery_time}</p>
          </div>
        </div>

        {/* Sección 1: Destino (Lo más importante para el delivery) */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          <div className="bg-slate-100 p-6 rounded-lg">
            <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 mb-4 italic">
              <MapPin size={16} className="text-rose-600" /> Datos de Destino
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase font-bold text-slate-500">Destinatario</p>
                <p className="text-2xl font-black uppercase">{order.recipient_name}</p>
              </div>
              <div>
                <p className="text-xs uppercase font-bold text-slate-500">Dirección Exacta</p>
                <p className="text-xl font-bold leading-tight">{order.recipient_address}</p>
              </div>
              <div className="flex gap-10">
                <div>
                  <p className="text-xs uppercase font-bold text-slate-500">Teléfono</p>
                  <p className="text-lg font-bold flex items-center gap-2 tracking-widest leading-none mt-1">
                     {order.recipient_phone}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sección 2: Producto */}
        <div className="grid grid-cols-2 gap-6 mb-8 border-y-2 border-slate-100 py-6">
          <div>
            <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 mb-3 italic">
              <Package size={16} /> Detalle del Pedido
            </h2>
            <p className="text-lg font-black uppercase">{order.product_code}</p>
            <p className="text-sm text-slate-600">Extras: <span className="font-bold">{order.extras || "Ninguno"}</span></p>
          </div>
          <div>
             <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 mb-3 italic">
              <User size={16} /> Cliente (Quien paga)
            </h2>
            <p className="text-md font-bold">{order.client_name}</p>
            <p className="text-xs text-slate-500">{order.client_phone}</p>
          </div>
        </div>

        {/* Sección 3: Observaciones Críticas */}
        <div className="mb-10">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 italic">Notas para el Repartidor</h2>
          <div className="border-2 border-slate-900 p-4 bg-amber-50 min-h-[80px]">
            <p className="text-sm font-bold leading-relaxed">
              {order.observations || "Sin instrucciones especiales."}
            </p>
          </div>
        </div>

        {/* Sección 4: Firma de Recibido */}
        <div className="mt-20 grid grid-cols-2 gap-20">
          <div className="border-t-2 border-slate-900 pt-4 text-center">
            <p className="text-[10px] font-black uppercase">Recibido por (Nombre Legible)</p>
          </div>
          <div className="border-t-2 border-slate-900 pt-4 text-center">
            <p className="text-[10px] font-black uppercase">Firma / Sello de Recepción</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-[10px] text-slate-400 uppercase font-bold border-t pt-4">
          <p>Este documento es un comprobante interno de entrega para logística.</p>
          <p>Florería Order Manager - {new Date().toLocaleDateString()}</p>
        </div>

      </div>
    </div>
  )
}
