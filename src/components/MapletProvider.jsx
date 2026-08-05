import {
  Checkbox,
  MantineProvider,
  Modal,
  Switch,
  createTheme,
} from '@mantine/core'

export const theme = createTheme({
  primaryColor: 'sage',
  primaryShade: { light: 6, dark: 5 },
  // Filled accents (buttons, active tab) pick a readable text color for the
  // brighter sage instead of forcing white on a dark-green fill.
  autoContrast: true,
  // Honor the OS "reduce motion" setting for Mantine's own animations
  // (modals, tooltips, transitions). Custom CSS motion is handled in index.css.
  respectReducedMotion: true,
  // Switches/checkboxes show a pointer cursor like the rest of the controls.
  cursorType: 'pointer',
  // One radius everywhere — the planner panes set the app-wide look.
  defaultRadius: 'md',
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
    // Plain track + solid round knob per the design — no inner indicator dot.
    Switch: Switch.extend({
      defaultProps: { withThumbIndicator: false },
    }),
  },
})

// The app's theme root: Mantine provider preconfigured with the cozy-dark
// Maplet theme. Every screen (and every design-system preview) renders inside
// this — Mantine components are unstyled without it.
export default function MapletProvider({ children }) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      {children}
    </MantineProvider>
  )
}
