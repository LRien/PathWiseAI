import React from 'react'
import { Outlet } from 'react-router-dom'
/* Change this path to wherever UserSideBar.jsx really is relative to this file */
import UserSideBar from './UsersComponents/UserSideBar'

/*
  The sidebar is now an overlay that manages itself (closed by default, opened with the
  triple-dot button), so the layout no longer needs any open/close state or a sidebar column.
  If your old layout had other things in it (a top bar, footer, providers), keep them
  and only remove the old sidebar wrapper + SidebarShowButton.
*/
const UserLayout = () => (
  <div className="min-h-screen bg-[#f3e7d6]">
    <UserSideBar />
    {/* pt-24 leaves room for the floating triple-dot button so it never covers the content */}
    <main className="mx-auto w-full max-w-[1280px] px-5 pb-16 pt-24 sm:px-8 lg:px-10">
      <Outlet />
    </main>
  </div>
)

export default UserLayout