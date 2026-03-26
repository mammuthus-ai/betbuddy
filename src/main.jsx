import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider } from './AuthContext'
import PutUpOrShutUp from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <PutUpOrShutUp />
    </AuthProvider>
  </React.StrictMode>,
)
