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
  const [rutaUrl, setRutaUrl] = useState<string>("")

  useEffect(() => {
    // Construir las URLs
    if (typeof window !== 'undefined') {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      setDeliveryUrl(`${baseUrl}/entregar/${id}`)
      setRutaUrl(`${baseUrl}/ruta/${id}`)
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
    <>
      <style jsx global>{`
        @media print {
          html, body {
            height: auto;
            margin: 0;
            padding: 0;
          }
          body {
            overflow: visible;
          }
          @page {
            margin: 0;
            size: A4;
          }
        }
      `}</style>
      <div className="bg-white min-h-screen p-2 md:p-4 font-sans text-slate-900 print:p-0 print:m-0">
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
      <div className="max-w-[148mm] mx-auto border-2 border-slate-200 p-2 rounded-none shadow-none print:border-none print:p-1.5 print:max-w-[148mm] print:max-h-[210mm] print:m-0 print:mx-auto print:overflow-hidden">
        
        {/* Encabezado del Recibo */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-1 mb-2">
          <div>
            <h1 className="text-lg font-black uppercase tracking-tighter text-rose-600">Recibo de Entrega</h1>
            <p className="text-[9px] font-bold text-slate-500 mt-0.5">ID: {order.id?.substring(0, 8).toUpperCase()}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase">Fecha</p>
            <p className="text-sm font-black">{order.delivery_date}</p>
            <p className="text-[9px] font-medium">{order.delivery_time}</p>
          </div>
        </div>

        {/* Sección de Cabecera Logística: 3 Columnas */}
        <div className="grid grid-cols-3 gap-2 mb-2 items-start">
          {/* Columna Izquierda: QR Registro de Entrega */}
          <div className="flex flex-col items-center">
            <div className="bg-white p-1 rounded border border-slate-300">
              {deliveryUrl && (
                <QRCodeSVG value={deliveryUrl} size={70} />
              )}
            </div>
            <p className="text-[7px] text-slate-600 font-medium text-center mt-0.5 leading-tight">
              Escanear al entregar
            </p>
          </div>

          {/* Columna Centro: Datos de Destino */}
          <div className="text-center space-y-1">
            <div>
              <p className="text-[8px] uppercase font-bold text-slate-500">Destinatario</p>
              <p className="text-sm font-black uppercase leading-tight">{order.recipient_name}</p>
            </div>
            <div>
              <p className="text-[8px] uppercase font-bold text-slate-500">Dirección</p>
              <p className="text-[10px] font-bold leading-tight">{order.recipient_address}</p>
            </div>
            <div>
              <p className="text-[8px] uppercase font-bold text-slate-500">Teléfono</p>
              <p className="text-xs font-bold tracking-widest">
                {order.recipient_phone}
              </p>
            </div>
          </div>

          {/* Columna Derecha: QR Portal de Ruta */}
          <div className="flex flex-col items-center">
            {rutaUrl ? (
              <>
                <div className="bg-white p-1 rounded border border-slate-300">
                  <QRCodeSVG value={rutaUrl} size={70} />
                </div>
                <p className="text-[7px] text-slate-600 font-medium text-center mt-0.5 leading-tight">
                  GESTIÓN DE RUTA<br />(Mapa y WhatsApp)
                </p>
              </>
            ) : (
              <div className="bg-slate-100 p-1 rounded border border-slate-300 w-[70px] h-[70px] flex items-center justify-center">
                <p className="text-[7px] text-slate-400 text-center">Sin Ruta</p>
              </div>
            )}
          </div>
        </div>

        {/* Detalles Inferiores: Producto y Cliente */}
        <div className="grid grid-cols-2 gap-2 mb-2 border-y border-slate-200 py-1.5">
          <div>
            <h2 className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
              Producto
            </h2>
            <p className="text-[10px] font-black uppercase">{order.product_code}</p>
            <p className="text-[8px] text-slate-600">Extras: <span className="font-bold">{order.extras || "Ninguno"}</span></p>
          </div>
          <div>
            <h2 className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
              Cliente
            </h2>
            <p className="text-[10px] font-bold">{order.client_name}</p>
            <p className="text-[8px] text-slate-500">{order.client_phone}</p>
          </div>
        </div>

        {/* Notas del Repartidor */}
        <div className="mb-2">
          <h2 className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Notas para el Repartidor</h2>
          <div className="border-2 border-slate-900 p-1.5 bg-amber-50 min-h-[40px]">
            <p className="text-[9px] font-bold leading-snug">
              {order.delivery_notes || "Sin instrucciones especiales."}
            </p>
          </div>
        </div>

        {/* Firma de Recibido */}
        <div className="mt-3 grid grid-cols-2 gap-6">
          <div className="border-t-2 border-slate-900 pt-1.5 text-center">
            <p className="text-[7px] font-black uppercase">Recibido por</p>
          </div>
          <div className="border-t-2 border-slate-900 pt-1.5 text-center">
            <p className="text-[7px] font-black uppercase">Firma / Sello</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-2 text-center text-[7px] text-slate-400 uppercase font-bold border-t pt-1">
          <p>Comprobante interno - Florería Order Manager</p>
        </div>

      </div>
    </div>
    </>
  )
}
