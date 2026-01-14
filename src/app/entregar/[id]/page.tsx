"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Order } from "@/types/order"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Camera, Upload, CheckCircle, Loader2, Package, Image } from "lucide-react"

export default function EntregarPedido() {
  const { id } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function getOrder() {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .single()
      
      if (error) {
        toast.error("Error al cargar el pedido", {
          description: "No se pudo encontrar el pedido."
        })
        return
      }
      
      setOrder(data)
      setLoading(false)
    }
    getOrder()
  }, [id])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      toast.error("Archivo inválido", {
        description: "Por favor selecciona una imagen."
      })
      return
    }

    setSelectedFile(file)

    // Crear vista previa
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!selectedFile || !order?.id) return

    setUploading(true)

    try {
      // Generar nombre único para el archivo
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${order.id}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      // Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('delivery-photos')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }

      // Obtener URL pública de la imagen
      const { data: { publicUrl } } = supabase.storage
        .from('delivery-photos')
        .getPublicUrl(filePath)

      // Actualizar la tabla orders con la URL de la foto
      const { error: updateError } = await supabase
        .from("orders")
        .update({ delivery_photo_url: publicUrl })
        .eq("id", order.id)

      if (updateError) {
        throw updateError
      }

      setUploaded(true)
      toast.success("¡Entrega registrada con éxito!", {
        description: "La foto de entrega ha sido guardada correctamente."
      })
    } catch (error: any) {
      console.error("Error al subir:", error)
      toast.error("Error al subir la foto", {
        description: error.message || "Intenta nuevamente en unos segundos."
      })
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
          <p className="text-slate-600">Cargando información del pedido...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-slate-600">No se encontró el pedido.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (uploaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md shadow-xl border-t-4 border-t-emerald-500">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-emerald-100 p-4 rounded-full">
                <CheckCircle className="h-12 w-12 text-emerald-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-emerald-600">¡Entrega registrada con éxito!</h2>
            <p className="text-slate-600">
              La foto de entrega ha sido guardada correctamente para el pedido de {order.recipient_name}.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="shadow-xl border-t-4 border-t-rose-600">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-rose-100 p-3 rounded-full">
                <Package className="h-6 w-6 text-rose-600" />
              </div>
              <div>
                <CardTitle className="text-2xl">Confirmar Entrega</CardTitle>
                <p className="text-sm text-slate-500 mt-1">Verifica que el pedido sea el correcto</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg space-y-2">
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">Destinatario</p>
                <p className="text-xl font-bold text-slate-900">{order.recipient_name}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">ID del Pedido</p>
                <p className="text-lg font-mono font-bold text-rose-600">{order.id?.substring(0, 8).toUpperCase()}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">Dirección</p>
                <p className="text-sm text-slate-700">{order.recipient_address}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Foto de Entrega
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!preview ? (
              <div className="space-y-3">
                {/* Inputs ocultos */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {/* Botón para tomar foto con cámara */}
                <Button
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white py-6 text-lg font-bold shadow-md"
                  size="lg"
                >
                  <Camera className="mr-2 h-5 w-5" />
                  📸 Tomar Foto Ahora
                </Button>
                
                {/* Botón para seleccionar de galería */}
                <Button
                  onClick={() => galleryInputRef.current?.click()}
                  variant="outline"
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 py-6 text-lg font-bold shadow-sm"
                  size="lg"
                >
                  <Image className="mr-2 h-5 w-5" />
                  🖼️ Seleccionar de Galería
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={preview}
                    alt="Vista previa"
                    className="w-full h-auto rounded-lg border-2 border-slate-200"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedFile(null)
                      setPreview(null)
                      if (cameraInputRef.current) {
                        cameraInputRef.current.value = ''
                      }
                      if (galleryInputRef.current) {
                        galleryInputRef.current.value = ''
                      }
                    }}
                    className="flex-1"
                    disabled={uploading}
                  >
                    Cambiar Foto
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="flex-1 bg-rose-600 hover:bg-rose-700"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Subir Evidencia
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
