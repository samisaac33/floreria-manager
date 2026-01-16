"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Settings, Upload, Loader2, Save, X } from "lucide-react"
import Link from "next/link"
import imageCompression from 'browser-image-compression'

interface Store {
  id: string
  name: string
  logo_url?: string
  owner_id: string
}

export default function ConfiguracionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [store, setStore] = useState<Store | null>(null)
  const [storeName, setStoreName] = useState("")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchStore()
  }, [])

  async function fetchStore() {
    setLoading(true)
    try {
      // Obtener usuario actual
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        toast.error("Error de autenticación", {
          description: "Por favor, inicia sesión nuevamente."
        })
        router.push("/login")
        return
      }

      // Buscar tienda del usuario
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("owner_id", user.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }

      if (data) {
        setStore(data)
        setStoreName(data.name || "")
        if (data.logo_url) {
          setLogoPreview(data.logo_url)
        }
      }
    } catch (error: any) {
      console.error("Error al cargar tienda:", error)
      toast.error("Error al cargar la configuración", {
        description: error.message || "Intenta nuevamente."
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      toast.error("Archivo inválido", {
        description: "Por favor selecciona una imagen."
      })
      return
    }

    setLogoFile(file)

    // Crear vista previa
    const reader = new FileReader()
    reader.onloadend = () => {
      setLogoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!storeName.trim()) {
      toast.error("Nombre requerido", {
        description: "Por favor ingresa el nombre de tu florería."
      })
      return
    }

    setSaving(true)
    let logoUrl = store?.logo_url || null

    try {
      // Obtener usuario actual PRIMERO - necesario para owner_id y RLS
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user || !user.id) {
        throw new Error("No se pudo obtener el usuario. Por favor, inicia sesión nuevamente.")
      }

      // Guardar user.id en variable para uso posterior
      const userId = user.id

      // Si hay un archivo de logo, comprimirlo y subirlo
      if (logoFile) {
        setCompressing(true)
        
        // Opciones de compresión
        const options = {
          maxSizeMB: 0.8,
          maxWidthOrHeight: 1280,
          useWebWorker: true
        }

        // Comprimir imagen
        const compressedFile = await imageCompression(logoFile, options)
        
        setCompressing(false)

        // Generar nombre único para el logo
        const fileExt = compressedFile.name.split('.').pop()
        const fileName = `logo-${userId}-${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        // Subir a Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('store-assets')
          .upload(filePath, compressedFile, {
            cacheControl: '3600',
            upsert: true
          })

        if (uploadError) {
          throw uploadError
        }

        // Obtener URL pública del logo
        const { data: { publicUrl } } = supabase.storage
          .from('store-assets')
          .getPublicUrl(filePath)

        logoUrl = publicUrl
      }

      // Crear o actualizar tienda
      // CRÍTICO: Incluir owner_id explícitamente para que RLS lo reconozca
      if (store) {
        // Actualizar tienda existente - incluir owner_id explícitamente
        const { error: updateError } = await supabase
          .from("stores")
          .update({
            name: storeName.trim(),
            logo_url: logoUrl,
            owner_id: userId  // Incluir explícitamente para RLS
          })
          .eq("id", store.id)
          .eq("owner_id", userId)  // Doble verificación para seguridad RLS

        if (updateError) {
          throw updateError
        }

        // Actualizar estado local
        setStore({ ...store, name: storeName.trim(), logo_url: logoUrl })
      } else {
        // Crear nueva tienda - incluir owner_id explícitamente
        const { data: newStore, error: insertError } = await supabase
          .from("stores")
          .insert({
            name: storeName.trim(),
            logo_url: logoUrl,
            owner_id: userId  // Incluir explícitamente para RLS
          })
          .select()
          .single()

        if (insertError) {
          throw insertError
        }

        setStore(newStore)
      }

      toast.success("Configuración guardada", {
        description: "Tu florería ha sido configurada correctamente."
      })

      // Limpiar estado del archivo
      setLogoFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error: any) {
      console.error("Error al guardar:", error)
      toast.error("Error al guardar la configuración", {
        description: error.message || "Intenta nuevamente en unos segundos."
      })
    } finally {
      setSaving(false)
      setCompressing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
          <p className="text-slate-600">Cargando configuración...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-slate-600 p-2 rounded-lg text-white">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Configuración</h1>
              <p className="text-sm text-slate-500">Gestiona la información de tu florería</p>
            </div>
          </div>
          <Link href="/">
            <Button variant="ghost" size="icon">
              <X className="h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Formulario */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Información de la Florería</CardTitle>
            <CardDescription>
              Configura el nombre y logo que aparecerá en tus reportes y recibos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Nombre de la florería */}
            <div className="space-y-2">
              <Label htmlFor="storeName">Nombre de la Florería</Label>
              <Input
                id="storeName"
                type="text"
                placeholder="Ej: Florería Amore Mio"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                disabled={saving || compressing}
              />
            </div>

            {/* Logo */}
            <div className="space-y-2">
              <Label>Logo de la Florería</Label>
              {logoPreview ? (
                <div className="space-y-3">
                  <div className="relative inline-block">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-32 w-auto rounded-lg border-2 border-slate-200 object-contain bg-white p-2"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setLogoFile(null)
                        setLogoPreview(store?.logo_url || null)
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ''
                        }
                      }}
                      disabled={saving || compressing}
                      className="flex-1"
                    >
                      Quitar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={saving || compressing}
                      className="flex-1"
                    >
                      Cambiar Logo
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoSelect}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={saving || compressing}
                    className="w-full"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Subir Logo
                  </Button>
                </div>
              )}
              <p className="text-xs text-slate-500">
                El logo se comprimirá automáticamente para optimizar el almacenamiento.
              </p>
            </div>

            {/* Botón Guardar */}
            <div className="flex gap-2 pt-4">
              <Link href="/" className="flex-1">
                <Button variant="outline" className="w-full" disabled={saving || compressing}>
                  Cancelar
                </Button>
              </Link>
              <Button
                onClick={handleSave}
                disabled={saving || compressing || !storeName.trim()}
                className="flex-1 bg-rose-600 hover:bg-rose-700"
              >
                {compressing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Comprimiendo...
                  </>
                ) : saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Configuración
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
