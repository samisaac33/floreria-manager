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

// Función helper para obtener la fecha de hoy en formato YYYY-MM-DD (hora local)
function getTodayDate(): string {
  return new Date().toLocaleDateString('sv-SE')
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
  extras: z.string().optional().or(z.literal("")),
  observations: z.string().optional().or(z.literal("")),
})

type OrderFormValues = z.infer<typeof orderSchema>

const STORAGE_KEY = "floreria_nuevo_pedido_cache"

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

  // Auto-load: Cargar datos desde localStorage al inicio
  useEffect(() => {
    if (isInitialized) return
    
    try {
      const savedData = localStorage.getItem(STORAGE_KEY)
      if (savedData) {
        const parsedData = JSON.parse(savedData)
        // Rellenar el formulario automáticamente usando form.reset()
        form.reset(parsedData as OrderFormValues)
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

  // Función de Smart Parsing línea por línea - Análisis preciso
  function parseQuickCapture() {
    const originalText = quickCaptureText
    const errors = new Set<string>()
    
    // Dividir el texto por emojis numéricos (1️⃣, 2️⃣, 3️⃣, 4️⃣)
    const blocks = originalText.split(/[1-4]️⃣/)
    
    // Validar fecha ANTES de procesar cualquier campo
    let extractedDate: string | null = null
    if (blocks.length > 2 && blocks[2]) {
      let block2Content = blocks[2].trim()
      block2Content = block2Content.replace(/fecha\s+y\s+hora\s+de\s+entrega[:\s]*/i, "").trim()
      
      const dateMatch = block2Content.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)
      if (dateMatch) {
        const [day, month, year] = dateMatch[1].split("/")
        extractedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        
        // Validar que la fecha no sea anterior a hoy (comparar solo fechas, sin horas)
        const today = getTodayDate()
        if (extractedDate < today) {
          toast.error("Fecha inválida", {
            description: "La captura contiene una fecha pasada. Por favor, corrígela antes de procesar."
          })
          return // Detener el proceso, no rellenar ningún campo
        }
      }
    }
    
    // Bloque 1: Destinatario
    if (blocks.length > 1 && blocks[1]) {
      const lines = blocks[1].split(/\n/).map(line => line.trim()).filter(line => line !== "")
      
      // Eliminar la primera línea (etiqueta)
      if (lines.length > 0) {
        lines.shift()
      }
      
      // Unir las líneas restantes
      let block1Content = lines.join("\n").trim()
      
      // Buscar teléfono con regex: (+?\d[\d\s-]{7,}\d)
      const phoneMatch = block1Content.match(/(\+?\d[\d\s-]{7,}\d)/)
      if (phoneMatch) {
        const phone = phoneMatch[1].replace(/[\s-]/g, "").trim()
        form.setValue("recipient_phone", phone)
        // Eliminar el teléfono del texto
        block1Content = block1Content.replace(phoneMatch[0], "").trim()
      } else {
        errors.add("recipient_phone")
        form.setValue("recipient_phone", "")
      }
      
      // Lo que quede (limpio de etiquetas y teléfono) es el nombre
      const name = cleanText(block1Content).trim()
      if (name) {
        form.setValue("recipient_name", name)
      } else {
        form.setValue("recipient_name", "")
      }
    } else {
      errors.add("recipient_phone")
      form.setValue("recipient_phone", "")
      form.setValue("recipient_name", "")
    }

    // Bloque 2: Fecha/Hora (usar la fecha ya extraída y validada)
    if (blocks.length > 2 && blocks[2]) {
      let block2Content = blocks[2].trim()
      
      // Eliminar texto "Fecha y hora de entrega:" si existe
      block2Content = block2Content.replace(/fecha\s+y\s+hora\s+de\s+entrega[:\s]*/i, "").trim()
      
      // Si ya extrajimos y validamos la fecha, usarla directamente
      if (extractedDate) {
        form.setValue("delivery_date", extractedDate)
        // Eliminar la fecha del texto para extraer la hora
        const dateMatch = block2Content.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)
        if (dateMatch) {
          block2Content = block2Content.replace(dateMatch[0], "").trim()
        }
      } else {
        // Si no se encontró fecha, buscar nuevamente
        const dateMatch = block2Content.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)
        if (dateMatch) {
          const [day, month, year] = dateMatch[1].split("/")
          const dateISO = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
          form.setValue("delivery_date", dateISO)
          block2Content = block2Content.replace(dateMatch[0], "").trim()
        } else {
          errors.add("delivery_date")
          form.setValue("delivery_date", "")
        }
      }
      
      // El resto de la línea (como "14h00") es la hora
      const timeText = block2Content.trim()
      if (timeText) {
        form.setValue("delivery_time", timeText)
      } else {
        form.setValue("delivery_time", "")
      }
    } else {
      errors.add("delivery_date")
      form.setValue("delivery_date", "")
      form.setValue("delivery_time", "")
    }

    // Bloque 3: Dirección
    if (blocks.length > 3 && blocks[3]) {
      const block3Content = blocks[3].trim()
      
      // Buscar la posición del primer símbolo de dos puntos (:)
      const colonIndex = block3Content.indexOf(":")
      
      if (colonIndex !== -1) {
        // Extraer todo lo que esté después de la posición del dos puntos
        let extractedText = block3Content.substring(colonIndex + 1).trim()
        
        // GPS Link: Si dentro de ese texto detectas un link de Google Maps
        const gpsMatch = extractedText.match(/https?:\/\/(maps|goo\.gl|www\.google\.com\/maps)[^\s\n]+/i)
        if (gpsMatch) {
          form.setValue("gps_url", gpsMatch[0].trim())
          // Eliminar el link del texto
          extractedText = extractedText.replace(gpsMatch[0], "").trim()
        } else {
          form.setValue("gps_url", "")
        }
        
        // El texto resultante (limpio de espacios y saltos de línea) asignarlo a recipient_address
        const addressText = extractedText.replace(/\s+/g, " ").trim()
        if (addressText) {
          form.setValue("recipient_address", addressText)
        } else {
          errors.add("recipient_address")
          form.setValue("recipient_address", "")
        }
      } else {
        // Si no hay dos puntos, intentar procesar todo el bloque
        let block3Text = block3Content.trim()
        
        // Buscar GPS link
        const gpsMatch = block3Text.match(/https?:\/\/(maps|goo\.gl|www\.google\.com\/maps)[^\s\n]+/i)
        if (gpsMatch) {
          form.setValue("gps_url", gpsMatch[0].trim())
          block3Text = block3Text.replace(gpsMatch[0], "").trim()
        } else {
          form.setValue("gps_url", "")
        }
        
        const addressText = block3Text.replace(/\s+/g, " ").trim()
        if (addressText) {
          form.setValue("recipient_address", addressText)
        } else {
          errors.add("recipient_address")
          form.setValue("recipient_address", "")
        }
      }
    } else {
      errors.add("recipient_address")
      form.setValue("recipient_address", "")
      form.setValue("gps_url", "")
    }

    // Bloque 4: Dedicatoria
    if (blocks.length > 4 && blocks[4]) {
      let block4Content = blocks[4].trim()
      
      // Toma todo el contenido después de "Mensaje o dedicatoria para la tarjeta:"
      block4Content = block4Content.replace(/mensaje\s+o\s+dedicatoria\s+para\s+la\s+tarjeta[:\s]*/i, "").trim()
      
      const dedicationText = block4Content.trim()
      if (dedicationText) {
        form.setValue("dedication", dedicationText)
      } else {
        form.setValue("dedication", "")
      }
    } else {
      form.setValue("dedication", "")
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
      toast.error("No se puede guardar el pedido. Por favor revisa:", {
        description: errorMessages.join("\n"),
        duration: 10000, // 10 segundos para dar tiempo a leer
        action: {
          label: "Cerrar",
          onClick: () => {},
        },
      })
    } else {
      toast.error("No se puede guardar el pedido. Por favor revisa los campos marcados.")
    }
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
    <div className="max-w-3xl mx-auto pb-10 relative px-2 md:px-4">
      <Link 
        href="/"
        onClick={() => {
          // Limpiar localStorage cuando el usuario cancela voluntariamente
          try {
            localStorage.removeItem(STORAGE_KEY)
          } catch (error) {
            console.error("Error al limpiar localStorage:", error)
          }
        }}
      >
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
      
      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
        <Tabs defaultValue="captura" className="w-full">
          <TabsList className="flex flex-wrap md:grid md:grid-cols-4 w-full shadow-sm bg-white border border-slate-200 rounded-lg p-1 md:p-1.5 h-auto mb-6 md:mb-8">
            {/* Fila 1 en móvil: Captura al 100% del ancho */}
            <TabsTrigger 
              value="captura" 
              className="w-full md:w-auto gap-1.5 md:gap-2 px-2.5 md:px-4 py-2.5 md:py-2 h-[44px] md:h-auto mb-2 md:mb-0 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:border-slate-600 data-[state=active]:border-b-2 text-[10px] md:text-sm font-medium whitespace-nowrap"
            >
              <Zap size={13} className="md:w-4 md:h-4 shrink-0" /> <span>Captura</span>
            </TabsTrigger>
            {/* Fila 2 en móvil: Las otras 3 pestañas en 3 columnas */}
            <TabsTrigger 
              value="destinatario" 
              className="flex-1 md:flex-none gap-1 md:gap-2 px-2 md:px-4 py-2.5 md:py-2 h-[44px] md:h-auto data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-600 data-[state=active]:border-b-2 text-[10px] md:text-sm font-medium whitespace-nowrap"
            >
              <MapPin size={13} className="md:w-4 md:h-4 shrink-0" /> <span className="hidden sm:inline">Destinatario</span><span className="sm:hidden">Dest.</span>
            </TabsTrigger>
            <TabsTrigger 
              value="cliente" 
              className="flex-1 md:flex-none gap-1 md:gap-2 px-2 md:px-4 py-2.5 md:py-2 h-[44px] md:h-auto data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:border-emerald-600 data-[state=active]:border-b-2 text-[10px] md:text-sm font-medium whitespace-nowrap"
            >
              <User size={13} className="md:w-4 md:h-4 shrink-0" /> Cliente
            </TabsTrigger>
            <TabsTrigger 
              value="pedido" 
              className="flex-1 md:flex-none gap-1 md:gap-2 px-2 md:px-4 py-2.5 md:py-2 h-[44px] md:h-auto data-[state=active]:bg-rose-50 data-[state=active]:text-rose-700 data-[state=active]:border-rose-600 data-[state=active]:border-b-2 text-[10px] md:text-sm font-medium whitespace-nowrap"
            >
              <Flower size={13} className="md:w-4 md:h-4 shrink-0" /> Pedido
            </TabsTrigger>
          </TabsList>

          {/* TAB 0: CAPTURA RÁPIDA */}
          <TabsContent value="captura">
            <Card>
              <CardHeader>
                <CardTitle>🚀 Captura Rápida</CardTitle>
                <CardDescription>Pega la captura de pedido y analiza automáticamente los datos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Captura de Pedido</Label>
                  <Textarea
                    value={quickCaptureText}
                    onChange={(e) => setQuickCaptureText(e.target.value)}
                    placeholder="Pega aquí la captura de pedido...&#10;&#10;Ejemplo:&#10;Destinatario: Maria Garcia 0991234567&#10;Entrega: 04/02/26 14:00 - 16:00&#10;Dirección: Av. Principal 123, esquina Calle Secundaria&#10;Tarjeta: Feliz cumpleaños, te queremos mucho!"
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
                      min={getTodayDate()}
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