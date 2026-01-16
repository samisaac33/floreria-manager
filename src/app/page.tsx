"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Zap, 
  QrCode, 
  Camera, 
  Receipt, 
  ArrowRight, 
  MessageCircle,
  Calendar,
  CheckCircle,
  Truck,
  Shield,
  TrendingUp
} from "lucide-react"

export default function LandingPage() {
  const handleWhatsApp = () => {
    // Reemplaza con tu número de WhatsApp (formato internacional sin +)
    const phoneNumber = "593999999999" // Cambia esto a tu número
    const message = encodeURIComponent("Hola, me interesa adquirir Florería Manager para mi negocio.")
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation Bar */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-rose-600 p-2 rounded-lg text-white font-bold text-xl">
                F
              </div>
              <span className="text-xl font-bold text-slate-900">Florería Manager</span>
            </div>
            <Link href="/login">
              <Button variant="outline" className="border-rose-600 text-rose-600 hover:bg-rose-50">
                Acceso Clientes
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 mb-6 leading-tight">
              Controla tu florería
              <span className="text-rose-600 block mt-2">como nunca antes</span>
            </h1>
            <p className="text-xl sm:text-2xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              Gestión logística, recibos con QR y cierre de caja automático para fechas de alta demanda
            </p>
            <Link href="/login">
              <Button 
                size="lg" 
                className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-6 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all"
              >
                Acceso Clientes
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-rose-100 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-slate-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      </section>

      {/* San Valentín Banner */}
      <section className="bg-gradient-to-r from-rose-600 to-pink-600 text-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Calendar className="h-8 w-8 sm:h-10 sm:w-10" />
            <div className="text-center sm:text-left">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                Prepárate para el 14 de febrero
              </h2>
              <p className="text-lg sm:text-xl opacity-90">
                No pierdas ni un solo pedido
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              Todo lo que necesitas
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Herramientas diseñadas específicamente para florerías
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {/* Smart Capture */}
            <Card className="border-2 border-slate-200 hover:border-rose-500 transition-all hover:shadow-xl group">
              <CardHeader>
                <div className="bg-rose-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-rose-600 transition-colors">
                  <Zap className="h-6 w-6 text-rose-600 group-hover:text-white transition-colors" />
                </div>
                <CardTitle className="text-xl font-bold text-slate-900">Smart Capture</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-600 text-base">
                  Pega tus mensajes de WhatsApp y deja que el sistema haga el trabajo
                </CardDescription>
              </CardContent>
            </Card>

            {/* Logística QR */}
            <Card className="border-2 border-slate-200 hover:border-rose-500 transition-all hover:shadow-xl group">
              <CardHeader>
                <div className="bg-rose-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-rose-600 transition-colors">
                  <QrCode className="h-6 w-6 text-rose-600 group-hover:text-white transition-colors" />
                </div>
                <CardTitle className="text-xl font-bold text-slate-900">Logística QR</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-600 text-base">
                  Recibos inteligentes que guían a tus repartidores con GPS y aviso de llegada
                </CardDescription>
              </CardContent>
            </Card>

            {/* Evidencia Digital */}
            <Card className="border-2 border-slate-200 hover:border-rose-500 transition-all hover:shadow-xl group">
              <CardHeader>
                <div className="bg-rose-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-rose-600 transition-colors">
                  <Camera className="h-6 w-6 text-rose-600 group-hover:text-white transition-colors" />
                </div>
                <CardTitle className="text-xl font-bold text-slate-900">Evidencia Digital</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-600 text-base">
                  Confirmación de entrega con fotografía enviada directamente al cliente
                </CardDescription>
              </CardContent>
            </Card>

            {/* Cierre de Caja */}
            <Card className="border-2 border-slate-200 hover:border-rose-500 transition-all hover:shadow-xl group">
              <CardHeader>
                <div className="bg-rose-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-rose-600 transition-colors">
                  <Receipt className="h-6 w-6 text-rose-600 group-hover:text-white transition-colors" />
                </div>
                <CardTitle className="text-xl font-bold text-slate-900">Cierre de Caja</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-600 text-base">
                  Reportes financieros al instante para cuadrar tus ventas sin errores
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-rose-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Gestión de Rutas</h3>
              <p className="text-slate-600">
                Optimiza las entregas con seguimiento en tiempo real
              </p>
            </div>
            <div className="text-center">
              <div className="bg-rose-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Seguro y Confiable</h3>
              <p className="text-slate-600">
                Tus datos protegidos con tecnología de última generación
              </p>
            </div>
            <div className="text-center">
              <div className="bg-rose-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Aumenta Ventas</h3>
              <p className="text-slate-600">
                Mejora la eficiencia y atiende más pedidos
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            Listo para transformar tu florería?
          </h2>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            Únete a las florerías que ya están optimizando sus procesos
          </p>
          <Button
            size="lg"
            onClick={handleWhatsApp}
            className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-6 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all"
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            Adquirir para mi Florería
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="bg-rose-600 p-2 rounded-lg text-white font-bold text-xl">
              F
            </div>
            <span className="text-lg font-bold text-white">Florería Manager</span>
          </div>
          <p className="text-sm">
            © {new Date().getFullYear()} Florería Manager. Todos los derechos reservados.
          </p>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={handleWhatsApp}
          size="lg"
          className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xl h-14 w-14 p-0 animate-pulse"
          title="Contactar por WhatsApp"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>

      {/* Custom Styles for animations */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  )
}
