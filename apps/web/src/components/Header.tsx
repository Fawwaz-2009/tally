import { Link } from '@tanstack/react-router'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Home,
  Image,
  Menu,
  Network,
  SquareFunction,
  StickyNote,
  User,
  X,
} from 'lucide-react'
import { UserButton } from '@daveyplate/better-auth-ui'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [groupedExpanded, setGroupedExpanded] = useState<
    Record<string, boolean>
  >({})

  return (
    <>
      <header className="p-4 flex items-center justify-between bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center">
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <Menu size={24} className="text-gray-700" />
          </button>
          <h1 className="ml-4 text-xl font-semibold">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <span className="text-white text-sm font-bold">O</span>
              </div>
              <span className="text-gray-900">Orange Starter</span>
            </Link>
          </h1>
        </div>
        <div>
          <UserButton size="icon" />
        </div>
      </header>

      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col border-r border-gray-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Navigation</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X size={24} className="text-gray-700" />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors mb-2 text-gray-700"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-orange-500 hover:bg-orange-600 transition-colors mb-2 text-white',
            }}
          >
            <Home size={20} />
            <span className="font-medium">Home</span>
          </Link>

          <Link
            to="/trpc-todo"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors mb-2 text-gray-700"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-orange-500 hover:bg-orange-600 transition-colors mb-2 text-white',
            }}
          >
            <Network size={20} />
            <span className="font-medium">tRPC Todo</span>
          </Link>
          <Link
            to="/media-gallery"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors mb-2 text-gray-700"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-orange-500 hover:bg-orange-600 transition-colors mb-2 text-white',
            }}
          >
            <Image size={20} />
            <span className="font-medium">Media Gallery</span>
          </Link>
          <Link
            to="/account"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors mb-2 text-gray-700"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-orange-500 hover:bg-orange-600 transition-colors mb-2 text-white',
            }}
          >
            <User size={20} />
            <span className="font-medium">Account</span>
          </Link>
        </nav>
      </aside>
    </>
  )
}
