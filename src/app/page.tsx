"use client"

import { useEffect, useState, useRef, type ChangeEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Order, OrderStatus } from "@/types/order"
import { toast } from "sonner"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter, DialogClose 
} from "@/components/ui/dialog"
import { 
  Card, CardContent, CardHeader, CardTitle 
} from "@/components/ui/card"
import { PlusCircle, MapPin, Phone, Package, RefreshCw, User, Copy, Printer, Clock, Truck, CheckCircle, MapPinOff, LogOut, Trash2, Upload, Image as ImageIcon, Loader2, MessageCircle, Pencil } from "lucide-react"

export default function Dashboard() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDate, setFilterDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0] // YYYY-MM-DD
  })
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendientes' | 'en_ruta' | 'entregados'>('todos')
  const [evidenceUploading, setEvidenceUploading] = useState(false)
  const [evidenceOrderId, setEvidenceOrderId] = useState<string | null>(null)
  const evidenceInputRef = useRef<HTMLInputElement | null>(null)

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

  const deleteOrder = async (id: string) => {
    const { error } = await supabase.from("orders").delete().eq("id", id)

    if (error) {
      toast.error("No se pudo eliminar el pedido", {
        description: "Intenta nuevamente en unos segundos.",
      })
      return
    }

    toast.success("Pedido eliminado")
    fetchOrders()
  }

  const handleEvidenceUploadClick = (orderId: string) => {
    setEvidenceOrderId(orderId)
    evidenceInputRef.current?.click()
  }

  const handleEvidenceFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !evidenceOrderId) return

    if (!file.type.startsWith("image/")) {
      toast.error("Archivo inválido", {
        description: "Por favor selecciona una imagen.",
      })
      return
    }

    setEvidenceUploading(true)

    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${evidenceOrderId}-admin-${Date.now()}.${fileExt}`
      const filePath = fileName

      const { error: uploadError } = await supabase.storage
        .from("delivery-photos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        })

      if (uploadError) {
        throw uploadError
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("delivery-photos").getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from("orders")
        .update({ delivery_photo_url: publicUrl })
        .eq("id", evidenceOrderId)

      if (updateError) {
        throw updateError
      }

      toast.success("Evidencia subida correctamente")
      fetchOrders()
    } catch (error: any) {
      toast.error("Error al subir la evidencia", {
        description: error.message || "Intenta nuevamente en unos segundos.",
      })
    } finally {
      setEvidenceUploading(false)
      setEvidenceOrderId(null)
      if (evidenceInputRef.current) {
        evidenceInputRef.current.value = ""
      }
    }
  }

  const resetToToday = () => {
    const today = new Date()
    setFilterDate(today.toLocaleDateString('sv-SE'))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  // Calcular KPIs
  const pendientes = orders.filter(o => o.status === 'pendiente' || o.status === 'en_preparacion').length
  const enRuta = orders.filter(o => o.status === 'en_camino').length
  const entregados = orders.filter(o => o.status === 'entregado').length

  // Filtrar orders basado en statusFilter
  const filteredOrders = orders.filter(order => {
    if (statusFilter === 'todos') return true
    if (statusFilter === 'pendientes') return order.status === 'pendiente' || order.status === 'en_preparacion'
    if (statusFilter === 'en_ruta') return order.status === 'en_camino'
    if (statusFilter === 'entregados') return order.status === 'entregado'
    return true
  })

  const statusStyles: Record<string, string> = {
    pendiente: "bg-amber-100 text-amber-700",
    en_preparacion: "bg-blue-100 text-blue-700",
    en_camino: "bg-purple-100 text-purple-700",
    entregado: "bg-emerald-100 text-emerald-700",
  }

  const rowBgStyles: Record<string, string> = {
    pendiente: "bg-amber-50/50 hover:bg-amber-50",
    en_preparacion: "bg-blue-50/50 hover:bg-blue-50",
    en_camino: "bg-purple-50/50 hover:bg-purple-50",
    entregado: "bg-emerald-50/50 hover:bg-emerald-50",
  }

  return (
    <main className="p-2 md:p-8 max-w-7xl mx-auto space-y-2 md:space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 md:gap-0">
        <div className="flex items-center gap-3">
          <div className="bg-rose-600 p-2 rounded-lg text-white font-bold text-xl">F</div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Logística Florería</h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Panel de Control</p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center">
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="flex-1 md:flex-none px-2 md:px-3 py-1.5 md:py-2 border border-slate-300 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={resetToToday}
              className="text-xs shrink-0"
            >
              Hoy
            </Button>
          </div>
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="icon" className="h-9 w-9 md:h-10 md:w-10" onClick={fetchOrders}>
              <RefreshCw size={16}/>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs md:text-sm">
              <LogOut className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" /> Salir
            </Button>
            <Link href="/nuevo-pedido" className="flex-1 md:flex-none">
              <Button className="w-full md:w-auto bg-rose-600 hover:bg-rose-700 shadow-md transition-transform active:scale-95 text-xs md:text-sm">
                <PlusCircle className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" /> Registrar Pedido
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Resumen de Operaciones (KPIs) */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-4">
          <Card 
            className={`bg-amber-50 border-amber-200 py-2 md:py-6 px-2 md:px-6 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'pendientes' ? 'ring-2 ring-amber-500' : ''}`}
            onClick={() => setStatusFilter('pendientes')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 p-0">
              <CardTitle className="text-[10px] md:text-sm font-medium text-amber-700">Pendientes</CardTitle>
              <Clock className="h-3 w-3 md:h-5 md:w-5 text-amber-600" />
            </CardHeader>
            <CardContent className="p-0 pt-1">
              <div className="text-lg md:text-3xl font-bold text-amber-700">{pendientes}</div>
              <p className="text-[9px] md:text-xs text-amber-600 mt-0.5 md:mt-1 hidden md:block">Pendiente + En Taller</p>
            </CardContent>
          </Card>

          <Card 
            className={`bg-purple-50 border-purple-200 py-2 md:py-6 px-2 md:px-6 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'en_ruta' ? 'ring-2 ring-purple-500' : ''}`}
            onClick={() => setStatusFilter('en_ruta')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 p-0">
              <CardTitle className="text-[10px] md:text-sm font-medium text-purple-700">En Ruta</CardTitle>
              <Truck className="h-3 w-3 md:h-5 md:w-5 text-purple-600" />
            </CardHeader>
            <CardContent className="p-0 pt-1">
              <div className="text-lg md:text-3xl font-bold text-purple-700">{enRuta}</div>
              <p className="text-[9px] md:text-xs text-purple-600 mt-0.5 md:mt-1 hidden md:block">En camino</p>
            </CardContent>
          </Card>

          <Card 
            className={`bg-emerald-50 border-emerald-200 py-2 md:py-6 px-2 md:px-6 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'entregados' ? 'ring-2 ring-emerald-500' : ''}`}
            onClick={() => setStatusFilter('entregados')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 p-0">
              <CardTitle className="text-[10px] md:text-sm font-medium text-emerald-700">Entregados</CardTitle>
              <CheckCircle className="h-3 w-3 md:h-5 md:w-5 text-emerald-600" />
            </CardHeader>
            <CardContent className="p-0 pt-1">
              <div className="text-lg md:text-3xl font-bold text-emerald-700">{entregados}</div>
              <p className="text-[9px] md:text-xs text-emerald-600 mt-0.5 md:mt-1 hidden md:block">Entregado</p>
            </CardContent>
          </Card>
        </div>
        {statusFilter !== 'todos' && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusFilter('todos')}
              className="text-xs"
            >
              Mostrar Todos
            </Button>
          </div>
        )}
      </div>

      <div className="border rounded-xl bg-white shadow-sm overflow-hidden w-full">
        <div className="overflow-x-auto">
          <input
            ref={evidenceInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleEvidenceFileChange}
          />
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-xs md:text-sm">Entrega</TableHead>
                <TableHead className="text-xs md:text-sm">Destinatario</TableHead>
                <TableHead className="text-xs md:text-sm">Producto</TableHead>
                <TableHead className="text-xs md:text-sm">Estado</TableHead>
                <TableHead className="text-center text-xs md:text-sm">Evidencia</TableHead>
                <TableHead className="text-right text-xs md:text-sm">Ubicación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <Dialog key={order.id}>
                  <DialogTrigger asChild>
                    <TableRow 
                      className={`border-b last:border-0 ${rowBgStyles[order.status] || ''} cursor-pointer [&>td:has(button)]:cursor-default [&>td:has(select)]:cursor-default`}
                      onClick={(e) => {
                        // No abrir dialog si se hace clic en botones o inputs
                        const target = e.target as HTMLElement
                        if (target.closest('button') || target.closest('select') || target.closest('a')) {
                          e.stopPropagation()
                          return
                        }
                      }}
                    >
                      <TableCell className="text-xs">
                        <div className="font-bold text-slate-700">{order.delivery_date}</div>
                        <div className="text-[10px] text-slate-400 font-medium uppercase">{order.delivery_time}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-semibold text-slate-900 capitalize">{order.recipient_name}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <MapPin size={10} className="text-rose-400 shrink-0"/> 
                          <span className="truncate">{order.recipient_address.substring(0, 20)}...</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono bg-slate-50 text-[10px] md:text-xs">{order.product_code}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <select 
                          className={`text-[10px] md:text-[11px] font-bold rounded-full px-2 md:px-3 py-1 border-none focus:ring-2 focus:ring-rose-500 cursor-pointer ${statusStyles[order.status]}`}
                          value={order.status}
                          onChange={(e) => updateStatus(order.id!, e.target.value as OrderStatus)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="en_camino">En Camino</option>
                          <option value="entregado">Entregado</option>
                        </select>
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {order.delivery_photo_url ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 md:h-8 md:w-8 text-slate-600 hover:bg-slate-50 shrink-0"
                                title="Ver evidencia"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ImageIcon size={14} className="md:w-4 md:h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-sm md:max-w-lg bg-white">
                              <DialogHeader>
                                <DialogTitle className="text-slate-800">Evidencia de entrega</DialogTitle>
                                <DialogDescription>
                                  Foto registrada para este pedido.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="mt-2 relative">
                                <img
                                  src={order.delivery_photo_url}
                                  alt="Evidencia de entrega"
                                  className="w-full h-auto rounded-md border border-slate-200"
                                />
                                <div className="mt-3 flex justify-end">
                                  <Button
                                    onClick={() => {
                                      const phoneNumber = order.client_phone.replace(/\D/g, '')
                                      const message = encodeURIComponent(
                                        `¡Hola! Tu pedido ha sido entregado. Aquí puedes ver la foto: ${order.delivery_photo_url}`
                                      )
                                      window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank')
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                                    size="sm"
                                  >
                                    <MessageCircle size={16} />
                                    Enviar foto al cliente
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 md:h-8 md:w-8 text-amber-600 hover:bg-amber-50 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEvidenceUploadClick(order.id!)
                            }}
                            disabled={evidenceUploading && evidenceOrderId === order.id}
                            title="Subir evidencia"
                          >
                            {evidenceUploading && evidenceOrderId === order.id ? (
                              <Loader2 className="h-3 w-3 md:w-4 md:h-4 animate-spin" />
                            ) : (
                              <Upload size={14} className="md:w-4 md:h-4" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5 md:gap-1 items-center">
                          {/* BOTÓN COPIAR GPS o Indicador sin ubicación */}
                          {order.gps_url ? (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 md:h-8 md:w-8 text-blue-500 hover:bg-blue-50 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                copyToClipboard(order.gps_url!)
                              }}
                              title="Copiar Link GPS"
                            >
                              <Copy size={14} className="md:w-4 md:h-4" />
                            </Button>
                          ) : (
                            <div className="flex items-center gap-1 text-slate-400 text-[10px] md:text-xs shrink-0">
                              <MapPinOff size={14} className="md:w-4 md:h-4" />
                              <span className="hidden sm:inline">Sin ubicación</span>
                            </div>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 md:h-8 md:w-8 text-emerald-600 hover:bg-emerald-50 shrink-0"
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <a href={`https://wa.me/${order.recipient_phone.replace(/\D/g, "")}`} target="_blank">
                              <Phone size={14} className="md:w-[18px] md:h-[18px]" />
                            </a>
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 md:h-8 md:w-8 text-slate-600 hover:bg-slate-50 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/editar-pedido/${order.id}`)
                            }}
                            title="Editar pedido"
                          >
                            <Pencil size={14} className="md:w-4 md:h-4" />
                          </Button>

                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 md:h-8 md:w-8 text-red-600 hover:bg-red-50 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 size={14} className="md:w-4 md:h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-sm bg-white">
                              <DialogHeader>
                                <DialogTitle className="text-red-600">Confirmar eliminación</DialogTitle>
                                <DialogDescription>
                                  ¿Estás seguro de que deseas eliminar este pedido? Esta acción no se puede deshacer.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter className="mt-2">
                                <DialogClose asChild>
                                  <Button variant="outline" className="w-full sm:w-auto">
                                    Cancelar
                                  </Button>
                                </DialogClose>
                                <DialogClose asChild>
                                  <Button
                                    variant="destructive"
                                    className="w-full sm:w-auto"
                                    onClick={() => deleteOrder(order.id!)}
                                  >
                                    Eliminar
                                  </Button>
                                </DialogClose>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  </DialogTrigger>
                  <DialogContent className="max-w-md bg-white max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="sticky top-0 bg-white z-10 pb-2 border-b border-slate-200">
                      <DialogTitle className="text-rose-600 flex items-center gap-2 text-base md:text-lg">
                        <Package size={18} className="md:w-5 md:h-5" /> Detalle de Entrega
                      </DialogTitle>
                      <DialogDescription className="text-xs md:text-sm">
                        Información completa del pedido para el equipo de logística.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-3 md:space-y-4 pt-3 md:pt-4 px-1">
                      <div className="bg-rose-50 p-2 md:p-4 rounded-xl border border-rose-100 max-h-32 overflow-y-auto">
                        <h4 className="text-[9px] md:text-[10px] font-bold uppercase text-rose-400 mb-1 md:mb-2 tracking-widest">Contenido de la Tarjeta</h4>
                        <p className="text-xs md:text-sm font-serif italic text-slate-800 leading-relaxed">
                          "{order.dedication || 'Sin dedicatoria'}"
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4">
                        <div className="p-2 md:p-3 bg-slate-50 rounded-lg">
                          <h4 className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase mb-1">Quien compra</h4>
                          <p className="text-xs md:text-sm font-semibold">{order.client_name}</p>
                          <p className="text-[10px] md:text-xs text-slate-500">{order.client_phone}</p>
                        </div>
                        <div className="p-2 md:p-3 bg-slate-50 rounded-lg">
                          <h4 className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase mb-1">Producto</h4>
                          <p className="text-xs md:text-sm font-semibold">{order.product_code}</p>
                          <p className="text-[10px] md:text-xs text-slate-500">{order.extras || 'Sin extras'}</p>
                        </div>
                      </div>

                      <div className="border-t pt-2 md:pt-4">
                        <h4 className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase mb-1">Notas del Taller</h4>
                        <p className="text-[10px] md:text-xs text-slate-600 bg-amber-50 p-2 rounded border border-amber-100 italic">
                          {order.observations || 'Sin observaciones'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 md:mt-4 flex gap-2 sticky bottom-0 bg-white pt-2 border-t border-slate-200">
                      <Button
                        className="w-full bg-slate-900 hover:bg-black gap-2 text-xs md:text-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(`/imprimir/${order.id}`, "_blank")
                        }}
                      >
                        <Printer size={14} className="md:w-4 md:h-4" /> Generar Recibo de Entrega
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </main>
  )
}