"use client"

import { useEffect, useState, useRef, type ChangeEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Order, OrderStatus } from "@/types/order"
import { toast } from "sonner"
// Función helper para formatear fechas en hora local (YYYY-MM-DD) - Sin zona horaria
const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Función helper para calcular diferencia de días entre strings YYYY-MM-DD
const daysDifference = (dateStr1: string, dateStr2: string): number => {
  const date1 = new Date(dateStr1 + 'T00:00:00');
  const date2 = new Date(dateStr2 + 'T00:00:00');
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};
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
import { PlusCircle, MapPin, Phone, Package, RefreshCw, User, Copy, Printer, Clock, Truck, CheckCircle, MapPinOff, LogOut, Trash2, Upload, Image as ImageIcon, Loader2, MessageCircle, Pencil, MoreVertical, DollarSign, Receipt } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export default function Dashboard() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const today = new Date()
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>(() => {
    const todayStr = formatLocalDate(today)
    return { from: todayStr, to: todayStr }
  })
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendientes' | 'en_ruta' | 'entregados'>('todos')
  const [billingFilter, setBillingFilter] = useState<'todos' | 'pendientes' | 'facturados'>('todos')
  const [evidenceUploading, setEvidenceUploading] = useState(false)
  const [evidenceOrderId, setEvidenceOrderId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null)
  const evidenceInputRef = useRef<HTMLInputElement | null>(null)

  async function fetchOrders() {
    // Validar rango de 30 días
    const daysDiff = daysDifference(dateRange.from, dateRange.to)
    if (daysDiff > 30) {
      toast.error("Rango excedido", {
        description: "El periodo máximo de consulta es de 30 días.",
      })
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .gte("delivery_date", dateRange.from)
      .lte("delivery_date", dateRange.to)
      .order("created_at", { ascending: false })
    if (!error) setOrders(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchOrders() }, [dateRange])

  async function updateStatus(id: string, newStatus: OrderStatus) {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", id)
    if (!error) fetchOrders()
  }

  async function updateBilled(id: string, billed: boolean) {
    const { error } = await supabase
      .from("orders")
      .update({ billed })
      .eq("id", id)
    if (!error) {
      fetchOrders()
      toast.success(billed ? "Marcado como facturado" : "Marcado como pendiente")
    } else {
      toast.error("Error al actualizar el estado de facturación")
    }
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
    setDeleteDialogOpen(false)
    setOrderToDelete(null)
    fetchOrders()
  }

  const handleDeleteClick = (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation()
    setOrderToDelete(orderId)
    setDeleteDialogOpen(true)
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
    const todayStr = formatLocalDate(new Date())
    setDateRange({ from: todayStr, to: todayStr })
  }

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFrom = e.target.value // Ya es YYYY-MM-DD
    const daysDiff = daysDifference(newFrom, dateRange.to)
    
    if (daysDiff > 30) {
      toast.error("Rango excedido", {
        description: "El periodo máximo de consulta es de 30 días.",
      })
      return
    }
    
    if (newFrom > dateRange.to) {
      // Si la fecha "desde" es mayor que "hasta", ajustar "hasta" a "desde"
      setDateRange({ from: newFrom, to: newFrom })
    } else {
      setDateRange({ ...dateRange, from: newFrom })
    }
  }

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTo = e.target.value // Ya es YYYY-MM-DD
    const daysDiff = daysDifference(dateRange.from, newTo)
    
    if (daysDiff > 30) {
      toast.error("Rango excedido", {
        description: "El periodo máximo de consulta es de 30 días.",
      })
      return
    }
    
    if (newTo < dateRange.from) {
      // Si la fecha "hasta" es menor que "desde", ajustar "desde" a "hasta"
      setDateRange({ from: newTo, to: newTo })
    } else {
      setDateRange({ ...dateRange, to: newTo })
    }
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
  const ventasTotales = orders.reduce((sum, order) => sum + (order.price || 0), 0)

  // Filtrar orders basado en statusFilter
  const filteredOrders = orders.filter(order => {
    if (statusFilter === 'todos') return true
    if (statusFilter === 'pendientes') return order.status === 'pendiente' || order.status === 'en_preparacion'
    if (statusFilter === 'en_ruta') return order.status === 'en_camino'
    if (statusFilter === 'entregados') return order.status === 'entregado'
    return true
  })

  // Filtrar orders para facturación basado en billingFilter
  const filteredBillingOrders = orders.filter(order => {
    if (billingFilter === 'todos') return true
    if (billingFilter === 'pendientes') return !order.billed
    if (billingFilter === 'facturados') return order.billed === true
    return true
  })

  const statusStyles: Record<string, string> = {
    pendiente: "bg-amber-100 text-amber-700",
    en_preparacion: "bg-blue-100 text-blue-700",
    en_camino: "bg-purple-100 text-purple-700",
    entregado: "bg-emerald-100 text-emerald-700",
  }

  const rowBgStyles: Record<string, string> = {
    pendiente: "bg-amber-100 border-l-4 border-amber-500 hover:bg-amber-200",
    en_preparacion: "bg-blue-100 border-l-4 border-blue-500 hover:bg-blue-200",
    en_camino: "bg-purple-100 border-l-4 border-purple-500 hover:bg-purple-200",
    entregado: "bg-emerald-100 border-l-4 border-emerald-500 hover:bg-emerald-200",
  }

  return (
    <main className="p-2 md:p-8 max-w-7xl mx-auto gap-2 md:space-y-6 flex flex-col">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 md:gap-0">
        <div className="flex items-center gap-3">
          <div className="bg-rose-600 p-2 rounded-lg text-white font-bold text-xl">F</div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Logística Florería</h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Panel de Control</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          {/* Fila de Fechas - Móvil optimizado */}
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={dateRange.from}
              onChange={handleDateFromChange}
              placeholder="Desde"
              className="flex-1 px-2 md:px-3 py-1.5 md:py-2 border border-slate-300 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
            <input
              type="date"
              value={dateRange.to}
              onChange={handleDateToChange}
              placeholder="Hasta"
              className="flex-1 px-2 md:px-3 py-1.5 md:py-2 border border-slate-300 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
            <Button 
              variant="outline" 
              size="sm"
              onClick={resetToToday}
              className="text-xs shrink-0 px-2 md:px-3"
            >
              Hoy
            </Button>
          </div>
          {/* Fila de Botones - Móvil optimizado */}
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="icon" className="h-9 w-9 md:h-10 md:w-10 shrink-0" onClick={fetchOrders}>
              <RefreshCw size={16}/>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs md:text-sm shrink-0">
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Card 
            className={`bg-amber-50 border-amber-200 py-1.5 md:py-6 px-1.5 md:px-6 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'pendientes' ? 'ring-2 ring-amber-500' : ''}`}
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
            className={`bg-purple-50 border-purple-200 py-1.5 md:py-6 px-1.5 md:px-6 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'en_ruta' ? 'ring-2 ring-purple-500' : ''}`}
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
            className={`bg-emerald-50 border-emerald-200 py-1.5 md:py-6 px-1.5 md:px-6 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'entregados' ? 'ring-2 ring-emerald-500' : ''}`}
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

          <Card 
            className="bg-slate-50 border-slate-200 py-1.5 md:py-6 px-1.5 md:px-6 transition-all hover:shadow-md"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 p-0">
              <CardTitle className="text-[10px] md:text-sm font-medium text-slate-700">Ventas Totales</CardTitle>
              <DollarSign className="h-3 w-3 md:h-5 md:w-5 text-slate-600" />
            </CardHeader>
            <CardContent className="p-0 pt-1">
              <div className="text-lg md:text-3xl font-bold text-slate-700">${ventasTotales.toFixed(2)}</div>
              <p className="text-[9px] md:text-xs text-slate-600 mt-0.5 md:mt-1 hidden md:block">Total del período</p>
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

      <Tabs defaultValue="logistica" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-2 md:mb-4">
          <TabsTrigger value="logistica" className="data-[state=active]:bg-rose-50 data-[state=active]:text-rose-700 data-[state=active]:border-rose-600">
            <Truck className="mr-2 h-4 w-4" />
            Logística
          </TabsTrigger>
          <TabsTrigger value="facturacion" className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:border-emerald-600">
            <Receipt className="mr-2 h-4 w-4" />
            Facturación
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logistica" className="mt-0">
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
                <TableHead className="text-right text-xs md:text-sm">
                  <span className="md:hidden">Acciones</span>
                  <span className="hidden md:inline">Acciones</span>
                </TableHead>
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
                        <div className="font-bold text-slate-900">{order.delivery_date}</div>
                        <div className="text-[10px] text-slate-600 font-medium uppercase">{order.delivery_time}</div>
                </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-semibold text-slate-900 capitalize text-[10px] md:text-xs">{order.recipient_name}</div>
                        <div className="text-[9px] md:text-[10px] text-slate-700 flex items-center gap-1">
                          <MapPin size={10} className="text-rose-400 shrink-0"/> 
                          <span className="truncate">{order.recipient_address.substring(0, 20)}...</span>
                  </div>
                </TableCell>
                      <TableCell className="text-xs">
                  <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono bg-slate-50 text-slate-900 text-[9px] md:text-xs border-slate-300">{order.product_code}</Badge>
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
                        {/* Botones para Desktop */}
                        <div className="hidden md:flex justify-end gap-1 items-center">
                          {/* BOTÓN COPIAR GPS o Indicador sin ubicación */}
                          {order.gps_url ? (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                              className="h-8 w-8 text-blue-500 hover:bg-blue-50 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                copyToClipboard(order.gps_url!)
                              }}
                        title="Copiar Link GPS"
                      >
                        <Copy size={16} />
                      </Button>
                          ) : (
                            <div className="flex items-center gap-1 text-slate-400 text-xs shrink-0">
                              <MapPinOff size={16} />
                              <span>Sin ubicación</span>
                            </div>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 shrink-0"
                            asChild
                            onClick={(e) => e.stopPropagation()}
                            title="WhatsApp Destinatario"
                          >
                            <a href={`https://wa.me/${order.recipient_phone.replace(/\D/g, "")}`} target="_blank" title="WhatsApp Destinatario">
                              <Phone size={18} />
                            </a>
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-600 hover:bg-slate-50 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/editar-pedido/${order.id}`)
                            }}
                            title="Editar pedido"
                          >
                            <Pencil size={16} />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:bg-red-50 shrink-0"
                            onClick={(e) => handleDeleteClick(e, order.id!)}
                            title="Eliminar pedido"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>

                        {/* Menú de tres puntos para Mobile */}
                        <div className="flex md:hidden justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-600 hover:bg-slate-50 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical size={16} />
                        </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 z-50">
                              {order.gps_url && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    copyToClipboard(order.gps_url!)
                                  }}
                                >
                                  <Copy size={16} className="mr-2" />
                                  Copiar GPS
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.open(`https://wa.me/${order.recipient_phone.replace(/\D/g, "")}`, "_blank")
                                }}
                              >
                                <Phone size={16} className="mr-2" />
                                WhatsApp dest.
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/editar-pedido/${order.id}`)
                                }}
                              >
                                <Pencil size={16} className="mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleDeleteClick(e as any, order.id!)
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                }}
                                className="text-red-600"
                              >
                                <Trash2 size={16} className="mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                      <div className="bg-rose-50 p-2 md:p-4 rounded-xl border border-rose-100 max-h-32 overflow-y-auto relative">
                        <div className="flex items-start justify-between mb-1 md:mb-2">
                          <h4 className="text-[9px] md:text-[10px] font-bold uppercase text-rose-400 tracking-widest">Contenido de la Tarjeta</h4>
                          {order.dedication && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-100 shrink-0 absolute top-2 right-2"
                              onClick={(e) => {
                                e.stopPropagation()
                                const dedicationText = order.dedication || ""
                                navigator.clipboard.writeText(dedicationText)
                                toast.success("Mensaje copiado")
                              }}
                              title="Copiar dedicatoria"
                            >
                              <Copy size={12} className="md:w-3 md:h-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-xs md:text-sm font-serif italic text-slate-800 leading-relaxed pr-2">
                              "{order.dedication || 'Sin dedicatoria'}"
                            </p>
                          </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4">
                        <div className="p-2 md:p-3 bg-slate-50 rounded-lg relative">
                          <h4 className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase mb-1">Quien compra</h4>
                          <p className="text-xs md:text-sm font-semibold">{order.client_name}</p>
                          <p className="text-[10px] md:text-xs text-slate-500">{order.client_phone}</p>
                          {order.client_phone && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2 h-6 w-6 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
                              onClick={(e) => {
                                e.stopPropagation()
                                window.open(`https://wa.me/${order.client_phone.replace(/\D/g, "")}`, "_blank")
                              }}
                              title="WhatsApp Cliente"
                            >
                              <Phone size={12} className="md:w-3 md:h-3" />
                            </Button>
                          )}
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

                    {/* Acciones Rápidas */}
                    <div className="mt-3 md:mt-4 border-t pt-3 md:pt-4">
                      <h4 className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase mb-2 md:mb-3">Acciones Rápidas</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {order.gps_url && (
                          <Button
                            variant="outline"
                            className="w-full gap-2 text-xs md:text-sm h-10 md:h-11"
                            onClick={(e) => {
                              e.stopPropagation()
                              copyToClipboard(order.gps_url!)
                            }}
                          >
                            <Copy size={16} className="md:w-4 md:h-4" />
                            <span className="hidden sm:inline">Copiar GPS</span>
                            <span className="sm:hidden">GPS</span>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          className="w-full gap-2 text-xs md:text-sm h-10 md:h-11 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(`https://wa.me/${order.client_phone.replace(/\D/g, "")}`, "_blank")
                          }}
                        >
                          <Phone size={16} className="md:w-4 md:h-4" />
                          <span className="hidden sm:inline">WhatsApp Cliente</span>
                          <span className="sm:hidden">WA Cliente</span>
                        </Button>
                        <Button
                          className="w-full bg-slate-900 hover:bg-black gap-2 text-xs md:text-sm h-10 md:h-11 col-span-2 md:col-span-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(`/imprimir/${order.id}`, "_blank")
                          }}
                        >
                          <Printer size={16} className="md:w-4 md:h-4" />
                          <span className="hidden sm:inline">Imprimir</span>
                          <span className="sm:hidden">Recibo</span>
                           </Button>
                      </div>
                        </div>
                      </DialogContent>
                    </Dialog>
            ))}
          </TableBody>
        </Table>
      </div>
      </div>

          {/* Dialog independiente de confirmación de eliminación */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent className="max-w-sm bg-white">
              <DialogHeader>
                <DialogTitle className="text-red-600">Confirmar eliminación</DialogTitle>
                <DialogDescription>
                  ¿Estás seguro de que deseas eliminar este pedido? Esta acción no se puede deshacer.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-2">
                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setDeleteDialogOpen(false)
                    setOrderToDelete(null)
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    if (orderToDelete) {
                      deleteOrder(orderToDelete)
                    }
                  }}
                >
                  Eliminar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="facturacion" className="mt-0">
          <div className="flex flex-col gap-4">
            {/* Filtros de Facturación */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={billingFilter === 'todos' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setBillingFilter('todos')}
                className={`text-xs ${billingFilter === 'todos' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
              >
                Todos
              </Button>
              <Button
                variant={billingFilter === 'pendientes' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setBillingFilter('pendientes')}
                className={`text-xs ${billingFilter === 'pendientes' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
              >
                Pendientes de factura
              </Button>
              <Button
                variant={billingFilter === 'facturados' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setBillingFilter('facturados')}
                className={`text-xs ${billingFilter === 'facturados' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
              >
                Facturados
              </Button>
            </div>

            {/* Tabla de Facturación */}
            <div className="border rounded-xl bg-white shadow-sm overflow-hidden w-full">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-xs md:text-sm">Cliente</TableHead>
                      <TableHead className="text-xs md:text-sm">Datos Fiscales</TableHead>
                      <TableHead className="text-xs md:text-sm">Email</TableHead>
                      <TableHead className="text-right text-xs md:text-sm">Monto</TableHead>
                      <TableHead className="text-center text-xs md:text-sm">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBillingOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                          No hay pedidos para mostrar
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBillingOrders.map((order) => (
                        <TableRow key={order.id} className="hover:bg-slate-50">
                          <TableCell className="text-xs">
                            <div className="font-semibold text-slate-900">{order.client_name}</div>
                            <div className="text-[10px] text-slate-600">{order.client_phone}</div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {order.client_tax_id ? (
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] md:text-xs">{order.client_tax_id}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-emerald-600 hover:bg-emerald-50"
                                  onClick={() => {
                                    navigator.clipboard.writeText(order.client_tax_id!)
                                    toast.success("Cédula/RUC copiada")
                                  }}
                                  title="Copiar"
                                >
                                  <Copy size={14} />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[10px]">Sin datos fiscales</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {order.client_email ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] md:text-xs truncate max-w-[150px]">{order.client_email}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-emerald-600 hover:bg-emerald-50"
                                  onClick={() => {
                                    navigator.clipboard.writeText(order.client_email!)
                                    toast.success("Email copiado")
                                  }}
                                  title="Copiar"
                                >
                                  <Copy size={14} />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[10px]">Sin email</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold">
                            ${order.price?.toFixed(2) || '0.00'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant={order.billed ? "default" : "outline"}
                              size="sm"
                              onClick={() => updateBilled(order.id!, !order.billed)}
                              className={`text-xs ${
                                order.billed 
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                  : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              {order.billed ? 'Facturado' : 'Pendiente'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  )
}