import { Metadata } from 'next';
import './globals.css';

// Force dynamic rendering (SSR) to avoid static prerender of special routes like /404 and /500 during build
export const dynamic = 'force-dynamic';
// Fully disable static generation and caching to avoid Pages runtime during build
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Smart To-Do',
  description: 'Email-driven task management with intelligent scheduling',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full relative overflow-x-hidden">
        {/* Animated background gradient */}
        <div className="fixed inset-0 bg-black">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-black to-purple-900/20" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        </div>
        
        {/* Navigation */}
        <nav className="relative glass-darker sticky top-0 z-50 border-b border-blue-500/20 animate-slideIn">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold neon-text bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent animate-fadeIn">
              Smart To-Do
            </h1>
            <div className="flex items-center gap-4">
              <button className="text-blue-400 hover:text-blue-300 transition-all duration-300 hover:scale-110 hover:rotate-12">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </button>
              <button className="text-blue-400 hover:text-blue-300 transition-all duration-300 hover:scale-110 group">
                <svg className="w-6 h-6 group-hover:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
              <button className="relative overflow-hidden px-4 py-2 rounded-lg glass border border-blue-500/30 text-blue-400 hover:text-white transition-all duration-300 hover:border-blue-400/50 group">
                <span className="relative z-10">Connect</span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
            </div>
          </div>
        </nav>
        
        <main className="relative container mx-auto px-4 py-8 max-w-7xl">
          {children}
        </main>
      </body>
    </html>
  );
}
