"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Save, User, MapPin, Flower, X } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

// Función helper para obtener la fecha de hoy en formato YYYY-MM-DD (hora local)
function getTodayDate(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Validación del Formulario con Zod - Todos los campos son opcionales
const orderSchema = z.object({
  recipient_name: z.string().optional().or(z.literal("")),
  recipient_phone: z.string().optional().or(z.literal("")),
  recipient_address: z.string().optional().or(z.literal("")),
  delivery_date: z.string()
    .optional()
    .or(z.literal(""))
    .refine((val) => {
      if (!val || val === "") return true // Campo opcional
      const today = getTodayDate()
      return val >= today
    }, {
      message: "La fecha no puede ser anterior a hoy"
    }),
  delivery_time: z.string().optional().or(z.literal("")),
  gps_url: z.string().optional().or(z.literal("")),
  delivery_notes: z.string().optional().or(z.literal("")),
  dedication: z.string().optional().or(z.literal("")),
  client_name: z.string().optional().or(z.literal("")),
  client_phone: z.string().optional().or(z.literal("")),
  client_tax_id: z.string().optional().or(z.literal("")),
  client_email: z.string().email("Email inválido").optional().or(z.literal("")),
  product_code: z.string().optional().or(z.literal("")),
  price: z.preprocess((val) => (val === "" ? undefined : Number(val)), z.number().optional()),
  extras: z.string().optional().or(z.literal("")),
  observations: z.string().optional().or(z.literal("")),
})

type OrderFormValues = Omit<z.infer<typeof orderSchema>, 'price'> & { price?: number | undefined }

export default function EditarPedido() {
  const router = useRouter()
  const { id } = useParams()
  const [loading, setLoading] = useState(false)
  const [loadingOrder, setLoadingOrder] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema) as any,
    defaultValues: {}
  })

  // Cargar datos del pedido desde Supabase al inicio
  useEffect(() => {
    async function loadOrder() {
      if (!id || typeof id !== 'string') return
      
      setLoadingOrder(true)
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("id", id)
          .single()

        if (error) {
          console.error("Error al cargar el pedido:", error)
          alert("Error al cargar el pedido: " + error.message)
          router.push("/dashboard")
          return
        }

        if (data) {
          // Rellenar el formulario con los datos del pedido
          form.reset({
            recipient_name: data.recipient_name || "",
            recipient_phone: data.recipient_phone || "",
            recipient_address: data.recipient_address || "",
            delivery_date: data.delivery_date || "",
            delivery_time: data.delivery_time || "",
            gps_url: data.gps_url || "",
            delivery_notes: data.delivery_notes || "",
            dedication: data.dedication || "",
            client_name: data.client_name || "",
            client_phone: data.client_phone || "",
            client_tax_id: data.client_tax_id || "",
            client_email: data.client_email || "",
            product_code: data.product_code || "",
            price: data.price || undefined,
            extras: data.extras || "",
            observations: data.observations || "",
          })
        }
      } catch (error) {
        console.error("Error al cargar el pedido:", error)
        alert("Error al cargar el pedido")
        router.push("/dashboard")
      } finally {
        setLoadingOrder(false)
        setIsInitialized(true)
      }
    }

    loadOrder()
  }, [id, form, router])

  // Función para traducir nombres de campos a español
  function getFieldName(fieldName: string): string {
    const fieldNames: Record<string, string> = {
      recipient_name: "Nombre del destinatario",
      recipient_phone: "Teléfono del destinatario",
      recipient_address: "Dirección de entrega",
      delivery_date: "Fecha de entrega",
      delivery_time: "Hora de entrega",
      client_name: "Nombre del cliente",
      client_phone: "Teléfono del cliente",
      client_email: "Email del cliente",
      product_code: "Código del producto",
      price: "Precio de venta",
    }
    return fieldNames[fieldName] || fieldName
  }

  // Función que se ejecuta cuando el formulario tiene errores de validación
  function onInvalid(errors: any) {
    const errorMessages: string[] = []
    
    // Recorrer todos los errores del formulario
    Object.keys(errors).forEach((fieldName) => {
      const error = errors[fieldName]
      const fieldNameSpanish = getFieldName(fieldName)
      
      if (error) {
        // Si es un objeto con mensaje
        if (error.message) {
          // Validación especial para fecha pasada
          if (error.message.includes("anterior a hoy") || error.message.includes("no puede ser anterior")) {
            errorMessages.push("La fecha de entrega no puede ser anterior a hoy")
          } else {
            errorMessages.push(`${fieldNameSpanish}: ${error.message}`)
          }
        } else if (typeof error === 'string') {
          errorMessages.push(`${fieldNameSpanish}: ${error}`)
        } else {
          errorMessages.push(`Falta el campo: ${fieldNameSpanish}`)
        }
      }
    })
    
    // Mostrar error con lista de problemas
    if (errorMessages.length > 0) {
      toast.error("No se puede actualizar el pedido. Por favor revisa:", {
        description: errorMessages.join("\n"),
        duration: 10000, // 10 segundos para dar tiempo a leer
        action: {
          label: "Cerrar",
          onClick: () => {},
        },
      })
    } else {
      toast.error("No se puede actualizar el pedido. Por favor revisa los campos marcados.")
    }
  }

  async function onSubmit(data: OrderFormValues) {
    if (!id || typeof id !== 'string') return
    
    setLoading(true)
    
    const { error } = await supabase
      .from("orders")
      .update(data)
      .eq("id", id)

    if (error) {
      alert("Error al actualizar: " + error.message)
      setLoading(false)
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  if (loadingOrder) {
    return (
      <div className="max-w-3xl mx-auto pb-10">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="animate-spin mx-auto mb-4 text-rose-600" size={32} />
            <p className="text-slate-600">Cargando pedido...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto pb-10 relative px-2 md:px-4">
      <Link href="/dashboard">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0 right-0 md:right-4 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 h-8 w-8 md:h-10 md:w-10"
          title="Cerrar"
        >
          <X size={18} className="md:w-5 md:h-5" />
        </Button>
      </Link>
      <h1 className="text-3xl font-bold mb-6 text-slate-800 pr-10 md:pr-0">Editar Pedido</h1>
      
      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
        <Tabs defaultValue="destinatario" className="w-full">
          <TabsList className="grid grid-cols-3 w-full shadow-sm bg-white border border-slate-200 rounded-lg p-1 md:p-1.5 h-auto mb-6 md:mb-8">
            <TabsTrigger 
              value="destinatario" 
              className="gap-1 md:gap-2 px-2 md:px-4 py-2.5 md:py-2 h-[44px] md:h-auto data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-600 data-[state=active]:border-b-2 text-[10px] md:text-sm font-medium whitespace-nowrap"
            >
              <MapPin size={13} className="md:w-4 md:h-4 shrink-0" /> <span className="hidden sm:inline">Destinatario</span><span className="sm:hidden">Dest.</span>
            </TabsTrigger>
            <TabsTrigger 
              value="cliente" 
              className="gap-1 md:gap-2 px-2 md:px-4 py-2.5 md:py-2 h-[44px] md:h-auto data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:border-emerald-600 data-[state=active]:border-b-2 text-[10px] md:text-sm font-medium whitespace-nowrap"
            >
              <User size={13} className="md:w-4 md:h-4 shrink-0" /> Cliente
            </TabsTrigger>
            <TabsTrigger 
              value="pedido" 
              className="gap-1 md:gap-2 px-2 md:px-4 py-2.5 md:py-2 h-[44px] md:h-auto data-[state=active]:bg-rose-50 data-[state=active]:text-rose-700 data-[state=active]:border-rose-600 data-[state=active]:border-b-2 text-[10px] md:text-sm font-medium whitespace-nowrap"
            >
              <Flower size={13} className="md:w-4 md:h-4 shrink-0" /> Pedido
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: DESTINATARIO */}
          <TabsContent value="destinatario">
            <Card>
              <CardHeader>
                <CardTitle>Datos de Entrega</CardTitle>
                <CardDescription>¿A quién y dónde enviamos las flores?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre del Destinatario</Label>
                    <Input {...form.register("recipient_name")} placeholder="Ej: Maria Garcia" />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input {...form.register("recipient_phone")} type="tel" inputMode="decimal" placeholder="0999999999" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Dirección Completa</Label>
                  <Input {...form.register("recipient_address")} placeholder="Calle, número e intersección" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha de Entrega</Label>
                    <Input 
                      type="date" 
                      {...form.register("delivery_date")}
                      min={getTodayDate()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rango Horario</Label>
                    <Input {...form.register("delivery_time")} placeholder="Ej: 14:00 - 16:00" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Link de Google Maps (GPS)</Label>
                  <Input {...form.register("gps_url")} placeholder="https://maps.google.com/..." />
                </div>
                <div className="space-y-2">
                  <Label>Observaciones para el repartidor</Label>
                  <Textarea {...form.register("delivery_notes")} placeholder="Instrucciones especiales para la entrega..." />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: CLIENTE */}
          <TabsContent value="cliente">
            <Card>
              <CardHeader>
                <CardTitle>Datos del Comprador</CardTitle>
                <CardDescription>Información de quien realiza el pago.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre del Cliente</Label>
                    <Input {...form.register("client_name")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input {...form.register("client_phone")} type="tel" inputMode="decimal" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cédula / RUC (Opcional)</Label>
                    <Input {...form.register("client_tax_id")} type="tel" inputMode="decimal" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input {...form.register("client_email")} type="email" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: PRODUCTO Y LOGISTICA */}
          <TabsContent value="pedido">
            <Card>
              <CardHeader>
                <CardTitle>Detalles del Regalo</CardTitle>
                <CardDescription>¿Qué vamos a entregar?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Precio de Venta</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                    <Input 
                      id="price"
                      type="number" 
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0.00"
                      className="pl-7"
                      {...form.register("price")} 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Código del Producto (SKU)</Label>
                  <Input {...form.register("product_code")} placeholder="Ej: RAMO-ROJO-01" />
                </div>
                <div className="space-y-2">
                  <Label>Extras / Adicionales</Label>
                  <Input {...form.register("extras")} placeholder="Globos, Chocolates, Vino..." />
                </div>
                <div className="space-y-2">
                  <Label>Dedicatoria</Label>
                  <Textarea {...form.register("dedication")} placeholder="Escribe el mensaje de la tarjeta aquí..." />
                </div>
                <div className="space-y-2">
                  <Label>Notas para el Taller</Label>
                  <Textarea {...form.register("observations")} placeholder="Notas internas para el taller..." />
                </div>
              </CardContent>
            </Card>

            <div className="mt-6 flex justify-end">
              <Button 
                type="submit" 
                size="lg" 
                className="bg-rose-600 hover:bg-rose-700 w-full md:w-auto gap-2"
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                Actualizar Pedido
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  )
}
