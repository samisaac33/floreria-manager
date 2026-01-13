"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Order, OrderStatus } from "@/types/order"
import { toast } from "sonner"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription 
} from "@/components/ui/dialog"
import { 
  Card, CardContent, CardHeader, CardTitle 
} from "@/components/ui/card"
import { PlusCircle, MapPin, Phone, Package, RefreshCw, Eye, User, Copy, Printer, Clock, Truck, CheckCircle, MapPinOff } from "lucide-react"

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDate, setFilterDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0] // YYYY-MM-DD
  })

  async function fetchOrders() {
    setLoading(true)
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("delivery_date", filterDate)
      .order("created_at", { ascending: false })
    if (!error) setOrders(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchOrders() }, [filterDate])

  async function updateStatus(id: string, newStatus: OrderStatus) {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", id)
    if (!error) fetchOrders()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Ruta copiada", {
      description: "El link de GPS ya está en tu portapapeles.",
    });
  };

  const resetToToday = () => {
    const today = new Date()
    setFilterDate(today.toISOString().split('T')[0])
  }

  // Calcular KPIs
  const pendientes = orders.filter(o => o.status === 'pendiente' || o.status === 'en_preparacion').length
  const enRuta = orders.filter(o => o.status === 'en_camino').length
  const entregados = orders.filter(o => o.status === 'entregado').length

  const statusStyles: Record<string, string> = {
    pendiente: "bg-amber-100 text-amber-700",
    en_preparacion: "bg-blue-100 text-blue-700",
    en_camino: "bg-purple-100 text-purple-700",
    entregado: "bg-emerald-100 text-emerald-700",
  }

  return (
    <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-rose-600 p-2 rounded-lg text-white font-bold text-xl">F</div>
          <div>
            <h1 className="text-2xl font-bold">Logística Florería</h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Panel de Control</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={resetToToday}
              className="text-xs"
            >
              Hoy
            </Button>
          </div>
          <Button variant="outline" size="icon" onClick={fetchOrders}><RefreshCw size={16}/></Button>
          <Link href="/nuevo-pedido">
            <Button className="bg-rose-600 hover:bg-rose-700 shadow-md transition-transform active:scale-95">
              <PlusCircle className="mr-2 h-4 w-4" /> Registrar Pedido
            </Button>
          </Link>
        </div>
      </div>

      {/* Resumen de Operaciones (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-amber-50 border-amber-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-amber-700">Pendientes</CardTitle>
            <Clock className="h-5 w-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-700">{pendientes}</div>
            <p className="text-xs text-amber-600 mt-1">Pendiente + En Taller</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">En Ruta</CardTitle>
            <Truck className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700">{enRuta}</div>
            <p className="text-xs text-purple-600 mt-1">En camino</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50 border-emerald-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">Entregados</CardTitle>
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700">{entregados}</div>
            <p className="text-xs text-emerald-600 mt-1">Entregado</p>
          </CardContent>
        </Card>
      </div>

      <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Entrega</TableHead>
              <TableHead>Destinatario</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Ubicación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id} className="border-b last:border-0">
                <TableCell>
                  <div className="text-sm font-bold text-slate-700">{order.delivery_date}</div>
                  <div className="text-[10px] text-slate-400 font-medium uppercase">{order.delivery_time}</div>
                </TableCell>
                <TableCell>
                  <div className="font-semibold text-slate-900 capitalize">{order.recipient_name}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin size={10} className="text-rose-400"/> {order.recipient_address.substring(0, 25)}...
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono bg-slate-50">{order.product_code}</Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <select 
                    className={`text-[11px] font-bold rounded-full px-3 py-1 border-none focus:ring-2 focus:ring-rose-500 cursor-pointer ${statusStyles[order.status]}`}
                    value={order.status}
                    onChange={(e) => updateStatus(order.id!, e.target.value as OrderStatus)}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en_preparacion">En Taller</option>
                    <option value="en_camino">En Camino</option>
                    <option value="entregado">Entregado</option>
                  </select>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 items-center">
                    {/* BOTÓN COPIAR GPS o Indicador sin ubicación */}
                    {order.gps_url ? (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-blue-500 hover:bg-blue-50"
                        onClick={() => copyToClipboard(order.gps_url!)}
                        title="Copiar Link GPS"
                      >
                        <Copy size={16} />
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1 text-slate-400 text-xs">
                        <MapPinOff size={16} />
                        <span className="hidden sm:inline">Sin ubicación</span>
                      </div>
                    )}

                    {/* MODAL DETALLES */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600">
                          <Eye size={18} />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md bg-white">
                        <DialogHeader>
                          <DialogTitle className="text-rose-600 flex items-center gap-2">
                            <Package /> Detalle de Entrega
                          </DialogTitle>
                          {/* Esto arregla el warning de la consola */}
                          <DialogDescription>
                            Información completa del pedido para el equipo de logística.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4 pt-4">
                          <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                            <h4 className="text-[10px] font-bold uppercase text-rose-400 mb-1 tracking-widest">Contenido de la Tarjeta</h4>
                            <p className="text-sm font-serif italic text-slate-800 leading-relaxed">
                              "{order.dedication || 'Sin dedicatoria'}"
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">Quien compra</h4>
                              <p className="text-sm font-semibold">{order.client_name}</p>
                              <p className="text-xs text-slate-500">{order.client_phone}</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">Producto</h4>
                              <p className="text-sm font-semibold">{order.product_code}</p>
                              <p className="text-xs text-slate-500">{order.extras || 'Sin extras'}</p>
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">Notas del Taller</h4>
                            <p className="text-xs text-slate-600 bg-amber-50 p-2 rounded border border-amber-100 italic">
                              {order.observations || 'Sin observaciones'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                           <Button className="w-full bg-slate-900 hover:bg-black gap-2"
                           onClick={() => window.open(`/imprimir/${order.id}`, '_blank')}
                           >
                             <Printer size={16} /> Generar Recibo de Entrega
                           </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" asChild>
                      <a href={`https://wa.me/${order.recipient_phone.replace(/\D/g,'')}`} target="_blank">
                        <Phone size={18} />
                      </a>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  )
}