import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
// App design system: tokens first, then component classes. Loaded AFTER
// index.css so they take precedence over Tailwind's base layer.
import './styles/tokens.css'
import './mockui/mockui.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
