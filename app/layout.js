import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
    title: 'Sistema Administrativo',
    description: 'Gestión de Inventario, POS y Ventas',
}

export default function RootLayout({ children }) {
    return (
        <html lang="es">
            <body className={inter.className}>{children}</body>
        </html>
    )
}
