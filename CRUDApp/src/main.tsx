import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.css' 
import App from './App.tsx'

// The reason why 'bootstrap/dist/css/bootstrap.css' is imported here is to ensure that Bootstrap styling is applied globally in the application.
// This makes it so any component or TSX files I edit will have access to Bootstrap's CSS classes and styles.
// Make sure to incorporate your own custom CSS styling in case Bootstrap's default styles do not fit your needs.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)