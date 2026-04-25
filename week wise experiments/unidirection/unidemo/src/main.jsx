import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Parent1 from './components/Parent1.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Parent1 />
  </StrictMode>,
)