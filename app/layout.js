import './globals.css'
import { Inter } from 'next/font/google'
import Sidebar from '@/components/ui/Sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
    title: 'Sistema Administrativo Profesional',
    description: 'Gestión de Inventario, POS, Clientes y Ventas en Venezuela',
}

export default function RootLayout({ children }) {
    return (
        <html lang="es">
            <body className={`${inter.className} bg-gray-50`}>
                <div className="flex min-h-screen">
                    <Sidebar />
                    <div className="flex-1">
                        {children}
                    </div>
                </div>
            </body>
        </html>
    )
}
