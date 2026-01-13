"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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

// Validación del Formulario con Zod
const orderSchema = z.object({
  recipient_name: z.string().min(3, "Nombre requerido"),
  recipient_phone: z.string().min(7, "Teléfono inválido"),
  recipient_address: z.string().min(5, "Dirección requerida"),
  delivery_date: z.string().min(1, "Fecha requerida"),
  delivery_time: z.string().min(1, "Hora requerida"),
  gps_url: z.string().optional(),
  dedication: z.string().optional(),
  client_name: z.string().min(3, "Nombre del cliente requerido"),
  client_phone: z.string().min(7, "Teléfono del cliente requerido"),
  client_tax_id: z.string().optional(),
  client_email: z.string().email("Email inválido").optional().or(z.literal("")),
  product_code: z.string().min(1, "Código de producto requerido"),
  extras: z.string().optional(),
  observations: z.string().optional(),
})

type OrderFormValues = z.infer<typeof orderSchema>

export default function NuevoPedido() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      delivery_time: "Mañana (09:00 - 13:00)",
    }
  })

  async function onSubmit(data: OrderFormValues) {
    setLoading(true)
    const { error } = await supabase.from("orders").insert([data])

    if (error) {
      alert("Error al guardar: " + error.message)
    } else {
      router.push("/")
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="max-w-3xl mx-auto pb-10">
      <h1 className="text-3xl font-bold mb-6 text-slate-800">Nuevo Pedido</h1>
      
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Tabs defaultValue="destinatario" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="destinatario" className="gap-2"><MapPin size={16}/> Destinatario</TabsTrigger>
            <TabsTrigger value="cliente" className="gap-2"><User size={16}/> Cliente</TabsTrigger>
            <TabsTrigger value="pedido" className="gap-2"><Flower size={16}/> Pedido</TabsTrigger>
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
                    <Input {...form.register("recipient_phone")} placeholder="0999999999" />
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
                    <Input {...form.register("client_phone")} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cédula / RUC (Opcional)</Label>
                    <Input {...form.register("client_tax_id")} />
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
                  <Label>Observaciones Internas</Label>
                  <Textarea {...form.register("observations")} placeholder="Notas para el taller o el repartidor..." />
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
                Guardar Pedido
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  )
}