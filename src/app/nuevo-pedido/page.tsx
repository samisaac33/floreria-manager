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

  // Función de Smart Parsing mejorada
  function parseQuickCapture() {
    const originalText = quickCaptureText
    const text = originalText.toLowerCase()
    const errors = new Set<string>()
    const parsed: Partial<OrderFormValues> = {}

    // Buscar destinatario y teléfono (mejorado)
    const destinatarioMatch = originalText.match(/destinatario[:\s]+([^\n]+)/i)
    if (destinatarioMatch) {
      let destinatarioText = destinatarioMatch[1].trim()
      destinatarioText = cleanText(destinatarioText)
      
      // Buscar patrones numéricos más específicos: +593, 09, 098, etc.
      const phonePatterns = [
        /(\+593\s?\d{8,9})/i, // Ecuador con código
        /(0\d{9})/, // Ecuador sin código (09xxxxxxxx)
        /(\d{8,15})/, // Cualquier número de 8-15 dígitos
      ]
      
      let phoneFound = false
      for (const pattern of phonePatterns) {
        const phoneMatch = destinatarioText.match(pattern)
        if (phoneMatch) {
          parsed.recipient_phone = phoneMatch[1].replace(/\s/g, "") // Eliminar espacios
          destinatarioText = destinatarioText.replace(phoneMatch[0], "").trim()
          phoneFound = true
          break
        }
      }
      
      // Lo que sobre es el nombre (ya limpio de etiquetas)
      if (destinatarioText) {
        parsed.recipient_name = cleanText(destinatarioText)
      }
    }

    // Buscar entrega (fecha y hora)
    const entregaMatch = originalText.match(/entrega[:\s]+([^\n]+)/i)
    if (entregaMatch) {
      let entregaText = entregaMatch[1].trim()
      entregaText = cleanText(entregaText)
      
      // Buscar fecha (mejorado para capturar DD/MM/YYYY)
      const datePatterns = [
        /(\d{1,2}\/\d{1,2}\/\d{4})/, // DD/MM/YYYY
        /(\d{1,2}\/\d{1,2}\/\d{2})/, // DD/MM/YY
        /(\d{1,2}-\d{1,2}-\d{4})/, // DD-MM-YYYY
        /(\d{1,2}-\d{1,2}-\d{2})/, // DD-MM-YY
      ]
      
      for (const pattern of datePatterns) {
        const dateMatch = entregaText.match(pattern)
        if (dateMatch) {
          parsed.delivery_date = convertDateToISO(dateMatch[1])
          entregaText = entregaText.replace(dateMatch[0], "").trim()
          break
        }
      }
      
      // Buscar hora
      const timeMatch = entregaText.match(/(\d{1,2}:\d{2}(?:\s*-\s*\d{1,2}:\d{2})?)/)
      if (timeMatch) {
        parsed.delivery_time = timeMatch[1]
      } else {
        // Intentar extraer cualquier texto que parezca hora
        const timeText = entregaText.trim()
        if (timeText) {
          parsed.delivery_time = timeText
        }
      }
    }

    // Buscar dirección (mejorado para extraer GPS)
    const direccionMatch = originalText.match(/direcci[oó]n[:\s]+([^\n]+(?:\n[^\n]+)*)/i)
    if (direccionMatch) {
      let direccionText = direccionMatch[1].trim()
      
      // Buscar links de Google Maps
      const gpsPatterns = [
        /(https?:\/\/maps\.google\.com\/[^\s\n]+)/i,
        /(https?:\/\/goo\.gl\/[^\s\n]+)/i,
        /(https?:\/\/www\.google\.com\/maps\/[^\s\n]+)/i,
      ]
      
      for (const pattern of gpsPatterns) {
        const gpsMatch = direccionText.match(pattern)
        if (gpsMatch) {
          parsed.gps_url = gpsMatch[1]
          // Eliminar el link del texto de dirección
          direccionText = direccionText.replace(gpsMatch[0], "").trim()
          break
        }
      }
      
      // Limpiar etiquetas y asignar dirección
      direccionText = cleanText(direccionText)
      if (direccionText) {
        parsed.recipient_address = direccionText
      }
    }

    // Buscar tarjeta/dedicatoria
    const tarjetaMatch = originalText.match(/tarjeta[:\s]+([^\n]+(?:\n[^\n]+)*)/i)
    if (tarjetaMatch) {
      let tarjetaText = tarjetaMatch[1].trim()
      tarjetaText = cleanText(tarjetaText)
      if (tarjetaText) {
        parsed.dedication = tarjetaText
      }
    }

    // Verificar campos obligatorios
    if (!parsed.recipient_phone || parsed.recipient_phone.trim() === "") {
      errors.add("recipient_phone")
    }
    if (!parsed.recipient_address || parsed.recipient_address.trim() === "") {
      errors.add("recipient_address")
    }
    if (!parsed.delivery_date || parsed.delivery_date.trim() === "") {
      errors.add("delivery_date")
    }

    // Rellenar el formulario
    Object.keys(parsed).forEach((key) => {
      const value = parsed[key as keyof OrderFormValues]
      if (value && value.toString().trim() !== "") {
        form.setValue(key as keyof OrderFormValues, value.toString().trim())
      }
    })

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