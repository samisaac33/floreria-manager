"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Order } from "@/types/order"
import { Printer, MapPin, Phone, User, Package, Clock } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"

export default function ImprimirRecibo() {
  const { id } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [deliveryUrl, setDeliveryUrl] = useState<string>("")

  useEffect(() => {
    // Construir la URL de entrega
    if (typeof window !== 'undefined') {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      setDeliveryUrl(`${baseUrl}/entregar/${id}`)
    }
  }, [id])

  useEffect(() => {
    async function getOrder() {
      const { data } = await supabase.from("orders").select("*").eq("id", id).single()
      if (data) setOrder(data)
    }
    getOrder()
  }, [id])

  if (!order) return <p className="p-10 text-center text-slate-500">Cargando recibo...</p>

  return (
    <div className="bg-white min-h-screen p-2 md:p-4 font-sans text-slate-900">
      {/* Botón flotante que desaparece al imprimir */}
      <div className="mb-4 flex justify-center print:hidden">
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-full text-sm font-bold shadow-xl hover:bg-rose-600 transition-colors"
        >
          <Printer size={16} /> Confirmar e Imprimir Recibo
        </button>
      </div>

      {/* ÁREA DE IMPRESIÓN - Ancho A5 (148mm) */}
      <div className="max-w-[148mm] mx-auto border-2 border-slate-200 p-3 rounded-none shadow-none print:border-none print:p-2 print:max-w-[148mm]">
        
        {/* Encabezado del Recibo */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-2 mb-2">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter text-rose-600">Recibo de Entrega</h1>
            <p className="text-[10px] font-bold text-slate-500 mt-0.5">ID: {order.id?.substring(0, 8).toUpperCase()}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase">Fecha de Entrega</p>
            <p className="text-base font-black">{order.delivery_date}</p>
            <p className="text-[10px] font-medium">{order.delivery_time}</p>
          </div>
        </div>

        {/* Sección 1: Destino (Lo más importante para el delivery) */}
        <div className="grid grid-cols-1 gap-2 mb-2">
          <div className="bg-slate-100 p-2 rounded">
            <h2 className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 italic">
              <MapPin size={12} className="text-rose-600" /> Datos de Destino
            </h2>
            <div className="space-y-1.5">
              <div>
                <p className="text-[9px] uppercase font-bold text-slate-500">Destinatario</p>
                <p className="text-base font-black uppercase leading-tight">{order.recipient_name}</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <p className="text-[9px] uppercase font-bold text-slate-500">Dirección Exacta</p>
                  <p className="text-sm font-bold leading-tight">{order.recipient_address}</p>
                </div>
                {order.gps_url && (
                  <div className="flex flex-col items-center gap-1">
                    <div className="bg-white p-1 rounded border border-slate-300">
                      <QRCodeSVG value={order.gps_url} size={80} />
                    </div>
                    <p className="text-[8px] text-slate-600 font-medium text-center">Escanear para GPS</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-[9px] uppercase font-bold text-slate-500">Teléfono</p>
                <p className="text-xs font-bold tracking-widest leading-none">
                  {order.recipient_phone}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sección 2: Producto */}
        <div className="grid grid-cols-2 gap-2 mb-2 border-y border-slate-200 py-2">
          <div>
            <h2 className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 italic">
              <Package size={12} /> Detalle del Pedido
            </h2>
            <p className="text-xs font-black uppercase">{order.product_code}</p>
            <p className="text-[10px] text-slate-600">Extras: <span className="font-bold">{order.extras || "Ninguno"}</span></p>
          </div>
          <div>
             <h2 className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 italic">
              <User size={12} /> Cliente (Quien paga)
            </h2>
            <p className="text-xs font-bold">{order.client_name}</p>
            <p className="text-[10px] text-slate-500">{order.client_phone}</p>
          </div>
        </div>

        {/* Sección 3: Observaciones Críticas */}
        <div className="mb-2">
          <h2 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 italic">Notas para el Repartidor</h2>
          <div className="border-2 border-slate-900 p-2 bg-amber-50 min-h-[50px]">
            <p className="text-[10px] font-bold leading-snug">
              {order.observations || "Sin instrucciones especiales."}
            </p>
          </div>
        </div>

        {/* Sección 4: Firma de Recibido */}
        <div className="mt-6 grid grid-cols-2 gap-8">
          <div className="border-t-2 border-slate-900 pt-2 text-center">
            <p className="text-[8px] font-black uppercase">Recibido por (Nombre Legible)</p>
          </div>
          <div className="border-t-2 border-slate-900 pt-2 text-center">
            <p className="text-[8px] font-black uppercase">Firma / Sello de Recepción</p>
          </div>
        </div>

        {/* Sección 5: Control de Reparto */}
        <div className="mt-6 border-t-2 border-slate-300 pt-3">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-700 mb-2 text-center">
            REGISTRO DE ENTREGA
          </h2>
          <div className="flex flex-col items-center gap-2">
            <div className="bg-white p-2 rounded border-2 border-slate-400">
              {deliveryUrl && (
                <QRCodeSVG 
                  value={deliveryUrl} 
                  size={100} 
                />
              )}
            </div>
            <p className="text-[8px] text-slate-600 font-medium text-center max-w-[120px] leading-tight">
              Repartidor: Una vez entregado, escanea este QR para subir la foto de prueba
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-[8px] text-slate-400 uppercase font-bold border-t pt-1">
          <p>Comprobante interno de entrega - Florería Order Manager</p>
        </div>

      </div>
    </div>
  )
}
