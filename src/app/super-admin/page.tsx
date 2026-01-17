"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { 
  Shield, 
  Store, 
  Package, 
  DollarSign, 
  Loader2, 
  LogOut,
  Eye,
  RefreshCw
} from "lucide-react"
import Link from "next/link"

interface StoreWithOwner {
  id: string
  name: string
  logo_url?: string
  owner_id: string
  owner_email?: string
  created_at: string
  is_active?: boolean
}

export default function SuperAdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [stores, setStores] = useState<StoreWithOwner[]>([])
  const [kpis, setKpis] = useState({
    totalStores: 0,
    totalOrders: 0,
    totalSales: 0
  })

  useEffect(() => {
    checkAuthorization()
  }, [])

  async function checkAuthorization() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        router.push("/login")
        return
      }

      // Verificar si el usuario es super admin
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_super_admin")
        .eq("id", user.id)
        .single()

      if (profileError || !profile?.is_super_admin) {
        // No es super admin, redirigir al dashboard
        toast.error("Acceso denegado", {
          description: "No tienes permisos para acceder a esta sección."
        })
        router.push("/dashboard")
        return
      }

      setIsAuthorized(true)
      fetchData()
    } catch (error: any) {
      console.error("Error al verificar autorización:", error)
      router.push("/dashboard")
    }
  }

  async function fetchData() {
    setLoading(true)
    try {
      // Obtener todas las tiendas
      const { data: storesData, error: storesError } = await supabase
        .from("stores")
        .select("*")
        .order("created_at", { ascending: false })

      if (storesError) throw storesError

      // Obtener emails de los dueños desde auth.users
      // Nota: Esto requiere hacer queries separadas o usar una función RPC
      // Por ahora, asumimos que podemos obtener el email del owner
      const storesWithEmail = await Promise.all(
        (storesData || []).map(async (store) => {
          // Intentar obtener el email del usuario desde auth.users
          // En Supabase, necesitamos usar una función RPC o hacer esto del lado del servidor
          // Por ahora, dejamos owner_email como opcional
          return {
            ...store,
            owner_email: undefined // Se llenará si hay acceso a auth.users
          }
        })
      )

      setStores(storesWithEmail as StoreWithOwner[])

      // Obtener KPIs globales
      const { count: storesCount } = await supabase
        .from("stores")
        .select("*", { count: "exact", head: true })

      const { count: ordersCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })

      const { data: ordersData } = await supabase
        .from("orders")
        .select("price")

      const totalSales = (ordersData || []).reduce((sum, order) => sum + (order.price || 0), 0)

      setKpis({
        totalStores: storesCount || 0,
        totalOrders: ordersCount || 0,
        totalSales
      })
    } catch (error: any) {
      console.error("Error al cargar datos:", error)
      toast.error("Error al cargar datos", {
        description: error.message || "Intenta nuevamente."
      })
    } finally {
      setLoading(false)
    }
  }

  async function toggleStoreStatus(storeId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from("stores")
        .update({ is_active: !currentStatus })
        .eq("id", storeId)

      if (error) throw error

      // Actualizar estado local
      setStores(stores.map(store => 
        store.id === storeId 
          ? { ...store, is_active: !currentStatus }
          : store
      ))

      toast.success(
        !currentStatus ? "Tienda activada" : "Tienda suspendida",
        {
          description: `El estado de la tienda ha sido actualizado.`
        }
      )
    } catch (error: any) {
      console.error("Error al actualizar estado:", error)
      toast.error("Error al actualizar estado", {
        description: error.message || "Intenta nuevamente."
      })
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  // Formatear fecha
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })
  }

  if (loading || !isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-slate-300">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-slate-800 p-3 rounded-lg">
              <Shield className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Panel de Administración</h1>
              <p className="text-sm text-slate-400 uppercase tracking-widest">Control Maestro del Sistema</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={fetchData}
            >
              <RefreshCw size={16} />
            </Button>
            <Link href="/dashboard">
              <Button 
                variant="outline" 
                size="sm" 
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Ir al Dashboard
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-slate-300 hover:bg-slate-800"
            >
              <LogOut className="mr-2 h-4 w-4" /> Salir
            </Button>
          </div>
        </div>

        {/* KPIs Globales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Total de Tiendas</CardTitle>
              <Store className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{kpis.totalStores}</div>
              <p className="text-xs text-slate-500 mt-1">Tiendas registradas</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Total de Pedidos</CardTitle>
              <Package className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{kpis.totalOrders}</div>
              <p className="text-xs text-slate-500 mt-1">Pedidos en el sistema</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Ventas Totales</CardTitle>
              <DollarSign className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">${kpis.totalSales.toFixed(2)}</div>
              <p className="text-xs text-slate-500 mt-1">Histórico acumulado</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de Tiendas */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Gestión de Tiendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-slate-800">
                    <TableHead className="text-slate-300">Florería</TableHead>
                    <TableHead className="text-slate-300">Email del Dueño</TableHead>
                    <TableHead className="text-slate-300">Fecha de Registro</TableHead>
                    <TableHead className="text-slate-300 text-center">Estado</TableHead>
                    <TableHead className="text-slate-300 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.length === 0 ? (
                    <TableRow className="border-slate-800">
                      <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                        No hay tiendas registradas
                      </TableCell>
                    </TableRow>
                  ) : (
                    stores.map((store) => (
                      <TableRow 
                        key={store.id} 
                        className="border-slate-800 hover:bg-slate-800/50"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {store.logo_url ? (
                              <img 
                                src={store.logo_url} 
                                alt={store.name}
                                className="h-10 w-10 rounded object-contain bg-white p-1"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded bg-slate-700 flex items-center justify-center text-white font-bold">
                                {store.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="font-semibold text-white">{store.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {store.owner_email || "N/A"}
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">
                          {formatDate(store.created_at)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={store.is_active !== false}
                            onCheckedChange={() => toggleStoreStatus(store.id, store.is_active !== false)}
                            className="data-[state=checked]:bg-emerald-600"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-slate-300 hover:bg-slate-800 hover:text-white"
                              onClick={() => {
                                // Opcional: implementar vista de pedidos de esta tienda
                                toast.info("Función en desarrollo", {
                                  description: "La vista de pedidos por tienda estará disponible próximamente."
                                })
                              }}
                              title="Ver pedidos de esta tienda"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
