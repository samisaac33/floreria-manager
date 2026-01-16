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

  // Permitir acceso público a las rutas de entrega, ruta y landing page
  if (
    request.nextUrl.pathname.startsWith('/entregar/') || 
    request.nextUrl.pathname.startsWith('/ruta/') ||
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname === '/login'
  ) {
    return response
  }

  // Si no hay usuario, redirigir a login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Si el usuario está en login pero ya está autenticado, redirigir al dashboard
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Si el usuario está en /configuracion, permitir el acceso (necesario para configurar)
  if (request.nextUrl.pathname === '/configuracion') {
    return response
  }

  // Para todas las demás rutas protegidas, verificar si tiene tienda configurada
  if (user && request.nextUrl.pathname !== '/configuracion') {
    // Verificar si el usuario tiene una tienda
    const { data: store, error } = await supabase
      .from("stores")
      .select("id")
      .eq("owner_id", user.id)
      .single()

    // Si no hay tienda y no está en /configuracion, redirigir a configuración
    if ((error || !store) && request.nextUrl.pathname !== '/configuracion') {
      return NextResponse.redirect(new URL('/configuracion', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}