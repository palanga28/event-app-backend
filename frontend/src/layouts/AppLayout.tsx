import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { Toaster } from 'sonner'

export default function AppLayout() {
  return (
    <div className="min-h-screen relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>
      
      <Navbar />
      
      <Toaster 
        richColors 
        position="top-right"
        toastOptions={{
          className: 'ampia-glass',
          style: {
            background: 'rgba(15, 10, 26, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
        }}
      />
      
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        <div className="animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
