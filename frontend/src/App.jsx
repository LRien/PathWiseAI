import { Routes, Route, Outlet } from 'react-router-dom'
import './index.css'
import Navbar from './Components/Navbar'
import Footer from './Components/Footer'
import ScrollToTop from './Components/ScrollToTop'
import HomePage from './Pages/HomePage/HomePage'
import AboutPage from './Pages/AboutPage/AboutPage'
import HowItWorksPage from './Pages/HowItWorksPage/HowItWorksPage'
import ContactsPage from './Pages/ContactPage/ContactPage'
import LoginPage from './Pages/AuthPages/LoginPage'
import RegisterPage from './Pages/AuthPages/RegisterPage'
import Assesment from './Pages/AssesmentPage/Assesment'


function Layout() {
  return (
    <>
      <ScrollToTop />
      <Navbar />
      <Outlet />
      <Footer />
    </>
  )
}

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} /> 
        <Route path="/contact" element={<ContactsPage />} />
        <Route path="/assesment" element={<Assesment />} />
        <Route path="*" element={<div>404 - Page not found</div>} />
      </Route>
    </Routes>
  )
}

export default App