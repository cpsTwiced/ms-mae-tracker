import React from 'react'
import ReactDOM from 'react-dom/client'
import '@mantine/core/styles.css'
import App from './App.jsx'
import MapletProvider from '@/components/MapletProvider'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MapletProvider>
      <App />
    </MapletProvider>
  </React.StrictMode>,
)
