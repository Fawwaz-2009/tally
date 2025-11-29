import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <section className="relative py-20 px-6 text-center overflow-hidden">
        <div className="relative max-w-5xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">O</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900">
              Orange Starter
            </h1>
          </div>

          <h2 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            Build Your SaaS
            <br />
            Faster Than Ever
          </h2>

          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-12">
            Launch your SaaS product in record time with our powerful,
            ready-to-use template. Packed with modern technologies and essential
            integrations.
          </p>

          <div className="flex flex-col items-center gap-6 mb-16">
            <Link
              to="/auth/$authView"
              params={{ authView: 'sign-up' }}
              className="group inline-flex items-center gap-2 px-8 py-4 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-full transition-all shadow-lg hover:shadow-xl"
            >
              Deploy your own
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border-8 border-gray-800">
              <div className="bg-gray-800 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-gray-400 text-sm ml-4">terminal</span>
              </div>
              <div className="p-6 font-mono text-sm md:text-base text-left">
                <div className="text-green-400 mb-2">
                  <span className="text-gray-500">$</span> git clone
                  https://github.com/yourusername/orange-starter
                </div>
                <div className="text-green-400 mb-2">
                  <span className="text-gray-500">$</span> pnpm install
                </div>
                <div className="text-green-400 mb-2">
                  <span className="text-gray-500">$</span> pnpm db:setup
                </div>
                <div className="text-green-400 mb-2">
                  <span className="text-gray-500">$</span> pnpm db:migrate
                </div>
                <div className="text-green-400 mb-2">
                  <span className="text-gray-500">$</span> pnpm db:seed
                </div>
                <div className="text-green-400">
                  <span className="text-gray-500">$</span> pnpm dev 🎉
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 max-w-7xl mx-auto">
        <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Built with Modern Technologies
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">⚡</div>
            <h4 className="text-xl font-semibold text-gray-900 mb-3">
              TanStack Start
            </h4>
            <p className="text-gray-600">
              Full-stack React framework with SSR, streaming, and type-safe
              server functions.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">🔐</div>
            <h4 className="text-xl font-semibold text-gray-900 mb-3">
              Better Auth
            </h4>
            <p className="text-gray-600">
              Complete authentication solution with email/password, sessions,
              and secure cookies.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">🚀</div>
            <h4 className="text-xl font-semibold text-gray-900 mb-3">
              tRPC + Drizzle
            </h4>
            <p className="text-gray-600">
              End-to-end type safety with tRPC API and Drizzle ORM for database
              operations.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">☁️</div>
            <h4 className="text-xl font-semibold text-gray-900 mb-3">
              Cloudflare Ready
            </h4>
            <p className="text-gray-600">
              Deploy to Cloudflare Workers with D1 database and edge computing.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">🎨</div>
            <h4 className="text-xl font-semibold text-gray-900 mb-3">
              Tailwind CSS
            </h4>
            <p className="text-gray-600">
              Beautiful UI with Tailwind CSS v4 and shadcn/ui components.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="text-4xl mb-4">📦</div>
            <h4 className="text-xl font-semibold text-gray-900 mb-3">
              Turborepo
            </h4>
            <p className="text-gray-600">
              Monorepo setup with shared packages and optimal build caching.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-gradient-to-br from-orange-50 to-orange-100">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-4xl font-bold text-gray-900 mb-6">
            Ready to Build Something Amazing?
          </h3>
          <p className="text-xl text-gray-700 mb-8">
            Get started with Orange Starter today and ship your product faster.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/auth/$authView"
              params={{ authView: 'sign-up' }}
              className="px-8 py-4 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-full transition-colors shadow-lg"
            >
              Sign Up
            </Link>
            <a
              href="https://github.com/yourusername/orange-starter"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-white hover:bg-gray-50 text-gray-900 font-semibold rounded-full transition-colors shadow-lg border-2 border-gray-900"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
