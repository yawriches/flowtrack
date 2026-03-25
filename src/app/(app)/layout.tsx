import Sidebar from '@/components/Sidebar'

export const dynamic = 'force-dynamic'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="lg:ml-64 pt-14 lg:pt-0">
        <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
