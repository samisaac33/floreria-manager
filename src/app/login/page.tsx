"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { Flower2, Loader2 } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error("Error de acceso", { description: "Credenciales incorrectas" })
    } else {
      toast.success("¡Bienvenido!", { description: "Accediendo al sistema..." })
      window.location.href = "/"
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-rose-600">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="bg-rose-100 p-3 rounded-full text-rose-600">
              <Flower2 size={32} />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Florería Manager</CardTitle>
          <CardDescription>Ingresa tus credenciales para gestionar pedidos</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input 
                type="email" 
                placeholder="correo@ejemplo.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Input 
                type="password" 
                placeholder="Contraseña" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2" /> : null}
              Entrar al Sistema
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}