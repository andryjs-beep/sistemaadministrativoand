import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/ui/Sidebar";

const outfit = Outfit({ subsets: ["latin"], weight: ["100", "300", "400", "500", "700", "900"] });

export const metadata = {
    title: "SIS.ADMI - Sistema Administrativo Senior",
    description: "Plataforma administrativa de alta precisión para inventario y ventas",
};

export default function RootLayout({ children }) {
    return (
        <html lang="es">
            <body className={`${outfit.className} bg-gray-50`}>
                <div className="flex flex-col lg:flex-row min-h-screen">
                    <Sidebar />
                    <main className="flex-1 w-full overflow-x-hidden relative">
                        <div className="p-0 min-h-full">
                            {children}
                        </div>
                    </main>
                </div>
            </body>
        </html>
    );
}
