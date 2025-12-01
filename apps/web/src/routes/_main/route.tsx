import { createFileRoute, Outlet } from '@tanstack/react-router'

import { BottomNav } from '@/components/layout/BottomNav'

export const Route = createFileRoute('/_main')({
  component: MainLayout,
})

function MainLayout() {
  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  )
}
