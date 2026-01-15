"use client"

import { useState, useEffect } from "react"
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
import { Loader2, Save, User, MapPin, Flower, X, Zap } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

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

const STORAGE_KEY = "nuevo-pedido-draft"

export default function NuevoPedido() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [quickCaptureText, setQuickCaptureText] = useState("")
  const [errorFields, setErrorFields] = useState<Set<string>>(new Set())

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {}
  })

  // Cargar datos desde localStorage al inicio
  useEffect(() => {
    if (isInitialized) return
    
    try {
      const savedData = localStorage.getItem(STORAGE_KEY)
      if (savedData) {
        const parsedData = JSON.parse(savedData)
        // Rellenar el formulario con los datos guardados
        Object.keys(parsedData).forEach((key) => {
          form.setValue(key as keyof OrderFormValues, parsedData[key] || "")
        })
      }
    } catch (error) {
      console.error("Error al cargar datos desde localStorage:", error)
    } finally {
      setIsInitialized(true)
    }
  }, [form, isInitialized])

  // Auto-guardar en localStorage cada vez que cambien los valores del formulario
  useEffect(() => {
    if (!isInitialized) return

    let timeoutId: NodeJS.Timeout

    const subscription = form.watch((value) => {
      // Limpiar errores si los campos se llenan
      if (errorFields.size > 0) {
        const newErrors = new Set(errorFields)
        if (value.recipient_phone && value.recipient_phone.trim() !== "") newErrors.delete("recipient_phone")
        if (value.recipient_address && value.recipient_address.trim() !== "") newErrors.delete("recipient_address")
        if (value.delivery_date && value.delivery_date.trim() !== "") newErrors.delete("delivery_date")
        setErrorFields(newErrors)
      }

      // Debounce: esperar 500ms antes de guardar para evitar escrituras excesivas
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
        } catch (error) {
          console.error("Error al guardar en localStorage:", error)
        }
      }, 500)
    })

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeoutId)
    }
  }, [form, isInitialized, errorFields])

  // Función para limpiar etiquetas y emojis
  function cleanText(text: string): string {
    if (!text) return ""
    // Eliminar emojis y números con puntos (1️⃣, 2️⃣, etc.)
    return text
      .replace(/[\d]️⃣/g, "") // Emojis numéricos
      .replace(/^\d+[\.\)]\s*/gm, "") // Números con punto o paréntesis al inicio de línea
      .replace(/^[^\w]*/gm, "") // Cualquier carácter no alfanumérico al inicio
      .replace(/\s+/g, " ") // Múltiples espacios a uno solo
      .trim()
  }

  // Función para convertir fechas al formato YYYY-MM-DD
  function convertDateToISO(dateStr: string): string {
    if (!dateStr) return ""
    
    // Limpiar el texto primero
    dateStr = dateStr.trim()
    
    // Intentar diferentes formatos
    // Formato: DD/MM/YY o DD/MM/YYYY
    const ddmmyyMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
    if (ddmmyyMatch) {
      const [, day, month, year] = ddmmyyMatch
      const fullYear = year.length === 2 ? `20${year}` : year
      return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
    
    // Formato: DD-MM-YY o DD-MM-YYYY
    const ddmmyyMatch2 = dateStr.match(/(\d{1,2})-(\d{1,2})-(\d{2,4})/)
    if (ddmmyyMatch2) {
      const [, day, month, year] = ddmmyyMatch2
      const fullYear = year.length === 2 ? `20${year}` : year
      return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
    
    return dateStr
  }

  // Función de Smart Parsing infalible basada en división por emojis
  function parseQuickCapture() {
    const originalText = quickCaptureText
    const errors = new Set<string>()
    
    // Dividir el texto por emojis numéricos (1️⃣, 2️⃣, 3️⃣, 4️⃣)
    const blocks = originalText.split(/[1-4]️⃣/)
    
    // Bloque 1: Destinatario (Nombre y número)
    if (blocks.length > 1 && blocks[1]) {
      let block1 = blocks[1].trim()
      
      // Eliminar etiqueta "Nombre y número..." si existe
      block1 = block1.replace(/nombre\s+y\s+n[úu]mero[^\n]*/i, "").trim()
      
      // Buscar teléfono con regex: (+?\d[\d\s-]{7,}\d)
      const phoneMatch = block1.match(/(\+?\d[\d\s-]{7,}\d)/)
      if (phoneMatch) {
        const phone = phoneMatch[1].replace(/[\s-]/g, "").trim()
        form.setValue("recipient_phone", phone)
        // Eliminar el teléfono del texto
        block1 = block1.replace(phoneMatch[0], "").trim()
      } else {
        errors.add("recipient_phone")
      }
      
      // Extraer nombre: primera línea limpia después de eliminar teléfono
      const nameLines = block1.split(/\n/).filter(line => line.trim() !== "")
      if (nameLines.length > 0) {
        const name = cleanText(nameLines[0])
        if (name) {
          form.setValue("recipient_name", name)
        }
      }
    } else {
      errors.add("recipient_phone")
    }

    // Bloque 2: Fecha/Hora
    if (blocks.length > 2 && blocks[2]) {
      let block2 = blocks[2].trim()
      
      // Buscar fecha en formato DD/MM/YYYY o DD/MM/YY
      const dateMatch = block2.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/)
      if (dateMatch) {
        const dateISO = convertDateToISO(dateMatch[1])
        form.setValue("delivery_date", dateISO)
        // Eliminar la fecha del texto
        block2 = block2.replace(dateMatch[0], "").trim()
      } else {
        errors.add("delivery_date")
      }
      
      // El resto del texto es la hora
      const timeText = cleanText(block2)
      if (timeText) {
        form.setValue("delivery_time", timeText)
      }
    } else {
      errors.add("delivery_date")
    }

    // Bloque 3: Dirección/GPS
    if (blocks.length > 3 && blocks[3]) {
      let block3 = blocks[3].trim()
      
      // Eliminar etiqueta "Dirección exacta..." si existe
      block3 = block3.replace(/direcci[óo]n\s+exacta[^\n]*/i, "").trim()
      
      // Buscar links de Google Maps: https?://(maps|goo.gl|www.google.com/maps)[^\s]+
      const gpsMatch = block3.match(/https?:\/\/(maps|goo\.gl|www\.google\.com\/maps)[^\s]+/i)
      if (gpsMatch) {
        form.setValue("gps_url", gpsMatch[0])
        // Eliminar el link del texto
        block3 = block3.replace(gpsMatch[0], "").trim()
      }
      
      // El texto restante es la dirección
      const addressText = cleanText(block3)
      if (addressText) {
        form.setValue("recipient_address", addressText)
      } else {
        errors.add("recipient_address")
      }
    } else {
      errors.add("recipient_address")
    }

    // Bloque 4: Dedicatoria
    if (blocks.length > 4 && blocks[4]) {
      let block4 = blocks[4].trim()
      
      // Eliminar etiqueta "Mensaje o dedicatoria..." si existe
      block4 = block4.replace(/mensaje\s+o\s+dedicatoria[^\n]*/i, "").trim()
      
      const dedicationText = cleanText(block4)
      if (dedicationText) {
        form.setValue("dedication", dedicationText)
      }
    }

    // Marcar campos con error
    setErrorFields(errors)

    // Mostrar mensaje
    if (errors.size > 0) {
      toast.warning("Plantilla procesada. Por favor, revisa los campos marcados en rojo.")
    } else {
      toast.success("Plantilla procesada correctamente.")
    }

    // Limpiar el texto de captura
    setQuickCaptureText("")
  }

  async function onSubmit(data: OrderFormValues) {
    setLoading(true)
    
    // Asegurar que status tenga un valor por defecto
    const orderData = {
      ...data,
      status: "pendiente" as const
    }
    
    const { error } = await supabase.from("orders").insert([orderData])

    if (error) {
      alert("Error al guardar: " + error.message)
      setLoading(false)
    } else {
      // Limpiar localStorage solo después de guardar exitosamente
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch (error) {
        console.error("Error al limpiar localStorage:", error)
      }
      router.push("/")
      router.refresh()
    }
  }

  return (
    <div className="max-w-3xl mx-auto pb-10 relative px-4 md:px-0">
      <Link href="/">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0 right-0 md:right-4 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 h-8 w-8 md:h-10 md:w-10"
          title="Cerrar"
        >
          <X size={18} className="md:w-5 md:h-5" />
        </Button>
      </Link>
      <h1 className="text-3xl font-bold mb-6 text-slate-800 pr-10 md:pr-0">Nuevo Pedido</h1>
      
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Tabs defaultValue="captura" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger 
              value="captura" 
              className="gap-2 data-[state=active]:border-purple-600 data-[state=active]:text-purple-600 data-[state=active]:border-b-2 text-xs md:text-sm"
            >
              <Zap size={14} className="md:w-4 md:h-4" /> Captura
            </TabsTrigger>
            <TabsTrigger 
              value="destinatario" 
              className="gap-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:border-b-2 text-xs md:text-sm"
            >
              <MapPin size={14} className="md:w-4 md:h-4" /> Destinatario
            </TabsTrigger>
            <TabsTrigger 
              value="cliente" 
              className="gap-2 data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-600 data-[state=active]:border-b-2 text-xs md:text-sm"
            >
              <User size={14} className="md:w-4 md:h-4" /> Cliente
            </TabsTrigger>
            <TabsTrigger 
              value="pedido" 
              className="gap-2 data-[state=active]:border-rose-600 data-[state=active]:text-rose-600 data-[state=active]:border-b-2 text-xs md:text-sm"
            >
              <Flower size={14} className="md:w-4 md:h-4" /> Pedido
            </TabsTrigger>
          </TabsList>

          {/* TAB 0: CAPTURA RÁPIDA */}
          <TabsContent value="captura">
            <Card>
              <CardHeader>
                <CardTitle>🚀 Captura Rápida</CardTitle>
                <CardDescription>Pega la plantilla de WhatsApp y analiza automáticamente los datos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Plantilla de WhatsApp</Label>
                  <Textarea
                    value={quickCaptureText}
                    onChange={(e) => setQuickCaptureText(e.target.value)}
                    placeholder="Pega aquí el mensaje de WhatsApp...&#10;&#10;Ejemplo:&#10;Destinatario: Maria Garcia 0991234567&#10;Entrega: 04/02/26 14:00 - 16:00&#10;Dirección: Av. Principal 123, esquina Calle Secundaria&#10;Tarjeta: Feliz cumpleaños, te queremos mucho!"
                    className="min-h-[200px] font-mono text-sm"
                  />
                </div>
                <Button
                  type="button"
                  onClick={parseQuickCapture}
                  className="w-full bg-purple-600 hover:bg-purple-700 gap-2"
                  disabled={!quickCaptureText.trim()}
                >
                  <Zap size={18} />
                  Analizar y Rellenar
                </Button>
                <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
                  <p className="font-semibold mb-1">Formato esperado:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Destinatario:</strong> Nombre y teléfono</li>
                    <li><strong>Entrega:</strong> Fecha (DD/MM/YY) y hora</li>
                    <li><strong>Dirección:</strong> Dirección completa</li>
                    <li><strong>Tarjeta:</strong> Mensaje de dedicatoria</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

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
                    <Input 
                      {...form.register("recipient_phone")} 
                      type="tel" 
                      inputMode="decimal" 
                      placeholder="0999999999"
                      className={errorFields.has("recipient_phone") ? "border-red-500 bg-red-50" : ""}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Dirección Completa</Label>
                  <Input 
                    {...form.register("recipient_address")} 
                    placeholder="Calle, número e intersección"
                    className={errorFields.has("recipient_address") ? "border-red-500 bg-red-50" : ""}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha de Entrega</Label>
                    <Input 
                      type="date" 
                      {...form.register("delivery_date")}
                      className={errorFields.has("delivery_date") ? "border-red-500 bg-red-50" : ""}
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
                Guardar Pedido
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  )
}