import React, { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import Lenis from 'lenis' // older package name: import Lenis from '@studio-freight/lenis'
import UserSideBar from './UsersComponents/UserSideBar' 

/* Frame for every /dashboard/* page: sidebar + the current page (<Outlet />).
   The home page Navbar and Footer are NOT rendered here. */
const UserLayout = () => {
  const [open, setOpen] = useState(false) // mobile drawer
  const { pathname } = useLocation()

  useEffect(() => setOpen(false), [pathname])

  /* smooth scroll for the dashboard (destroyed when leaving /dashboard) */
  useEffect(() => {
    const lenis = new Lenis()
    let raf
    const loop = (time) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
    }
  }, [])

  /* lock page scroll while the mobile drawer is open */
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <div className="min-h-screen bg-[#f3e7d6] text-neutral-900 lg:flex">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-[#e6d8c3] bg-[#fbf6ee] lg:block">
        <UserSideBar />
      </aside>

      {/* mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#e6d8c3] bg-[#fbf6ee]/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/" className="text-base font-black tracking-tight text-black">
          CAREER MATCH
        </Link>
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0b0b2b] text-white"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </header>

      {/* mobile drawer */}
      <div className={`fixed inset-0 z-40 lg:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-[#0b0b2b]/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        />
        <aside
          data-lenis-prevent
          className={`absolute left-0 top-0 h-full w-72 max-w-[85%] overflow-y-auto bg-[#fbf6ee] shadow-xl transition-transform duration-300 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <UserSideBar onNavigate={() => setOpen(false)} />
        </aside>
      </div>

      {/* page content */}
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mx-auto w-full max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default UserLayout