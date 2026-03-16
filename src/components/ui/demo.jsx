import { MinimalToggle, OrangeToggle } from './toggle'

function MinimalToggleDemo() {
  return (
    <div className="flex flex-col items-center gap-4 p-1 text-center xl:gap-8">
      <MinimalToggle tabIndex={0} />
      <span>Toggle-minimal</span>
    </div>
  )
}

function OrangeToggleDemo() {
  return (
    <div className="flex flex-col items-center gap-4 p-1 text-center xl:gap-8">
      <OrangeToggle />
      <span>Toggle-orange</span>
    </div>
  )
}

export { MinimalToggleDemo, OrangeToggleDemo }