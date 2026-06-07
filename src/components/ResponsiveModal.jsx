import { Modal } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'

// Shared modal wrapper. The app is desktop-first, so on phones (below Mantine's
// `sm` breakpoint) modals go full-screen — that way their content reflows into
// the full viewport instead of overflowing off the right edge with no way to
// scroll to it. On wider screens the modal keeps whatever `size` it was given.
// All app modals render through this so the behavior stays consistent.
export default function ResponsiveModal(props) {
  const fullScreen = useMediaQuery('(max-width: 48em)')
  return <Modal fullScreen={fullScreen} {...props} />
}
