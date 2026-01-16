"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Order } from "@/types/order"
import { Button } from "@/components/ui/button"
import { MapPin, Phone, Loader2 } from "lucide-react"

export default function RutaPedido() {
  const { id } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function getOrder() {
      if (!id || typeof id !== 'string') return
      
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("id", id)
          .single()

        if (error) {
          console.error("Error al cargar el pedido:", error)
        } else if (data) {
          setOrder(data)
        }
      } catch (error) {
        console.error("Error al cargar el pedido:", error)
      } finally {
        setLoading(false)
      }
    }

    getOrder()
  }, [id])

  const handleWhatsApp = () => {
    if (!order?.recipient_phone) return
    
    const phone = order.recipient_phone.replace(/\D/g, "")
    const message = encodeURIComponent("¡Hola! 🌸 Soy de la Florería Amore Mio, te escribo para comentarte que voy en camino a realizarte una entrega en los próximos minutos.")
    const whatsappUrl = `https://wa.me/${phone}?text=${message}`
    window.open(whatsappUrl, "_blank")
  }

  const handleGPS = () => {
    if (!order?.gps_url) return
    window.open(order.gps_url, "_blank")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
          <p className="text-slate-600">Cargando información del pedido...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-slate-600 mb-2">No se encontró el pedido</p>
          <p className="text-sm text-slate-400">Verifica que el ID sea correcto</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-4 md:p-6">
      <div className="max-w-md mx-auto">
        {/* Información del Pedido */}
        <div className="mb-6 md:mb-8 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
            {order.recipient_name}
          </h1>
          <div className="flex items-start justify-center gap-2 text-slate-700">
            <MapPin className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-base md:text-lg font-medium">
              {order.recipient_address}
            </p>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="space-y-4">
          {/* Botón GPS */}
          <Button
            onClick={handleGPS}
            disabled={!order.gps_url}
            className="w-full h-20 md:h-24 bg-blue-600 hover:bg-blue-700 text-white text-lg md:text-xl font-bold shadow-lg rounded-xl flex flex-col items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            <MapPin size={32} className="md:w-8 md:h-8" />
            <span>Abrir en Google Maps</span>
            {!order.gps_url && (
              <span className="text-sm font-normal opacity-75">Sin ubicación disponible</span>
            )}
          </Button>

          {/* Botón WhatsApp */}
          <Button
            onClick={handleWhatsApp}
            disabled={!order.recipient_phone}
            className="w-full h-20 md:h-24 bg-emerald-600 hover:bg-emerald-700 text-white text-lg md:text-xl font-bold shadow-lg rounded-xl flex flex-col items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            <Phone size={32} className="md:w-8 md:h-8" />
            <span>Contactar por WhatsApp</span>
            {!order.recipient_phone && (
              <span className="text-sm font-normal opacity-75">Sin teléfono disponible</span>
            )}
          </Button>
        </div>

        {/* Información adicional */}
        {order.delivery_notes && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-bold text-amber-800 uppercase mb-1">Notas de Entrega</p>
            <p className="text-sm text-amber-900">{order.delivery_notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
