import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/certificates/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello /certificates!</div>
}
