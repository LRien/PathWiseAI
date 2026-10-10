import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import './index.css'

/* layouts */
import PublicLayout from './Pages/Layouts/PublicLayout'
import UserLayout from './Pages/UsersPage/UserLayout'

import Home from './Pages/HomePage/HomePage'
import About from './Pages/AboutPage/AboutPage'
import Contact from './Pages/ContactPage/ContactPage'
import HowItWorks from './Pages/HowItWorksPage/HowItWorksPage'
import Login from './Pages/AuthPages/LoginPage'
import Register from './Pages/AuthPages/RegisterPage'

/* assessment form */
import AssesmentTest from './Pages/AssesmentPage/AssesmentTest'
import Assesment from './Pages/AssesmentPage/Assesment'


/* dashboard pages */
import UserDashboard from './Pages/UsersPage/UserDashboard'
import PredictionDetail from './Pages/UsersPage/PredictionDetail'
import UserRoadMap from './Pages/UsersPage/UserRoadMap'
import SettingsPage from './Pages/UsersPage/UserSettings'

const App = () => (
  <Routes>
    {/* WITH Navbar + Footer */}
    <Route element={<PublicLayout />}>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} /> 
      <Route path="/contact" element={<Contact />} /> 
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/assessment-test" element={<AssesmentTest />} />
      <Route path="/assessment" element={<Assesment/>} />
      <Route path="/login" element={<Login />} /> 
      <Route path="/register" element={<Register />} /> 
    </Route>

    {/* no Navbar / Footer: distraction-free form */}
    

    {/* dashboard: sidebar layout, no home Navbar / Footer */}
    <Route path="/dashboard" element={<UserLayout />}>
      <Route index element={<Navigate to="recommendations" replace />} />
      <Route path="recommendations" element={<UserDashboard />} />
      <Route path="recommendations/:id" element={<PredictionDetail />} />
      <Route path="roadmap" element={<UserRoadMap />} />
      <Route path="settings" element={<SettingsPage />} />
    </Route>

    {/* anything unknown goes home */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
)

export default App