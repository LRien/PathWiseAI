import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../../Components/Navbar'
import Footer from '../../Components/Footer' // adjust to where your Footer is

/* Frame for the public pages (home, about, login...): Navbar + page + Footer.
   Dashboard pages do NOT use this, so they never show the home Navbar / Footer. */
const PublicLayout = () => (
  <>
    <Navbar />
    <Outlet />
    <Footer />
  </>
)

export default PublicLayout