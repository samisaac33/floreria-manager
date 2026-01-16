import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Rutas públicas que no requieren autenticación
  const publicRoutes = [
    '/',
    '/login',
    '/entregar',
    '/ruta',
  ]

  // Verificar si la ruta es pública (exacta o que empiece con alguna ruta pública)
  const isPublicRoute = 
    pathname === '/' || 
    pathname === '/login' ||
    pathname.startsWith('/entregar/') || 
    pathname.startsWith('/ruta/')

  // Si el usuario está logueado e intenta acceder a rutas públicas, redirigir al dashboard
  if (user && (pathname === '/' || pathname === '/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Si es una ruta pública y no hay usuario, permitir el acceso
  if (isPublicRoute && !user) {
    return response
  }

  // Si no hay usuario y no es ruta pública, redirigir a login
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // A partir de aquí, el usuario está autenticado
  
  // Si está en /configuracion, permitir el acceso (necesario para configurar)
  if (pathname === '/configuracion') {
    return response
  }

  // Para todas las demás rutas protegidas, verificar si tiene tienda configurada
  if (user && pathname !== '/configuracion') {
    // Verificar si el usuario tiene una tienda
    const { data: store, error } = await supabase
      .from("stores")
      .select("id")
      .eq("owner_id", user.id)
      .single()

    // Si no hay tienda y no está en /configuracion, redirigir a configuración
    if (error || !store) {
      return NextResponse.redirect(new URL('/configuracion', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}