import React from 'react'
import ReactDOM from 'react-dom/client'
import { Checkbox, MantineProvider, Modal, createTheme } from '@mantine/core'
import '@mantine/core/styles.css'
import App from './App.jsx'
import './index.css'

const theme = createTheme({
  primaryColor: 'sage',
  primaryShade: { light: 6, dark: 5 },
  // Filled accents (buttons, active tab) pick a readable text color for the
  // brighter sage instead of forcing white on a dark-green fill.
  autoContrast: true,
  // Honor the OS "reduce motion" setting for Mantine's own animations
  // (modals, tooltips, transitions). Custom CSS motion is handled in index.css.
  respectReducedMotion: true,
  defaultRadius: 'lg',
  colors: {
    // Sage-teal accent — soft but bright enough to read clearly on the dark UI.
    sage: [
      '#e6f7f0',
      '#cdede1',
      '#a3dcc8',
      '#74cbae',
      '#4dbd98',
      '#34b389',
      '#27a079',
      '#1c8765',
      '#136d51',
      '#06543d',
    ],
    // Warm charcoal instead of cold black — cozy for long sessions.
    dark: [
      '#c9c8c6',
      '#b0afac',
      '#8e8d8a',
      '#6b6a67',
      '#4a4946',
      '#3a3936',
      '#2e2d2b',
      '#252422',
      '#1e1d1b',
      '#171614',
    ],
  },
  components: {
    // Every modal opens centered. `returnFocus: false` stops focus snapping
    // back to the trigger button on close, which otherwise leaves a focus ring
    // on it after closing with ESC.
    Modal: Modal.extend({
      defaultProps: { centered: true, returnFocus: false },
    }),
    // Slightly smaller than Mantine's default 'sm' checkbox across the app.
    Checkbox: Checkbox.extend({
      defaultProps: { size: 'xs' },
    }),
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <App />
    </MantineProvider>
  </React.StrictMode>,
)
