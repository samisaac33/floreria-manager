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
import { Loader2, Save, User, MapPin, Flower } from "lucide-react"

// Validación del Formulario con Zod - Todos los campos son opcionales
const orderSchema = z.object({
  recipient_name: z.string().optional().or(z.literal("")),
  recipient_phone: z.string().optional().or(z.literal("")),
  recipient_address: z.string().optional().or(z.literal("")),
  delivery_date: z.string().optional().or(z.literal("")),
  delivery_time: z.string().optional().or(z.literal("")),
  gps_url: z.string().optional().or(z.literal("")),
  delivery_notes: z.string().optional().or(z.literal("")),
  dedication: z.string().optional().or(z.literal("")),
  client_name: z.string().optional().or(z.literal("")),
  client_phone: z.string().optional().or(z.literal("")),
  client_tax_id: z.string().optional().or(z.literal("")),
  client_email: z.string().email("Email inválido").optional().or(z.literal("")),
  product_code: z.string().optional().or(z.literal("")),
  extras: z.string().optional().or(z.literal("")),
  observations: z.string().optional().or(z.literal("")),
})

type OrderFormValues = z.infer<typeof orderSchema>

export default function EditarPedido() {
  const router = useRouter()
  const { id } = useParams()
  const [loading, setLoading] = useState(false)
  const [loadingOrder, setLoadingOrder] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
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
          router.push("/")
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
            extras: data.extras || "",
            observations: data.observations || "",
          })
        }
      } catch (error) {
        console.error("Error al cargar el pedido:", error)
        alert("Error al cargar el pedido")
        router.push("/")
      } finally {
        setLoadingOrder(false)
        setIsInitialized(true)
      }
    }

    loadOrder()
  }, [id, form, router])

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
      router.push("/")
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
    <div className="max-w-3xl mx-auto pb-10">
      <h1 className="text-3xl font-bold mb-6 text-slate-800">Editar Pedido</h1>
      
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Tabs defaultValue="destinatario" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger 
              value="destinatario" 
              className="gap-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:border-b-2"
            >
              <MapPin size={16}/> Destinatario
            </TabsTrigger>
            <TabsTrigger 
              value="cliente" 
              className="gap-2 data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-600 data-[state=active]:border-b-2"
            >
              <User size={16}/> Cliente
            </TabsTrigger>
            <TabsTrigger 
              value="pedido" 
              className="gap-2 data-[state=active]:border-rose-600 data-[state=active]:text-rose-600 data-[state=active]:border-b-2"
            >
              <Flower size={16}/> Pedido
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
                    <Input {...form.register("recipient_phone")} type="tel" inputMode="numeric" placeholder="0999999999" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Dirección Completa</Label>
                  <Input {...form.register("recipient_address")} placeholder="Calle, número e intersección" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha de Entrega</Label>
                    <Input type="date" {...form.register("delivery_date")} />
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
                    <Input {...form.register("client_phone")} type="tel" inputMode="numeric" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cédula / RUC (Opcional)</Label>
                    <Input {...form.register("client_tax_id")} type="tel" inputMode="numeric" />
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
