import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import HomePage from './pages/HomePage'
import AccordionPage from './pages/AccordionPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/accordion" element={<AccordionPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
