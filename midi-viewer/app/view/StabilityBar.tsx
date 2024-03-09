import { Progress } from "@nextui-org/react"

const colourForAmount = (amount: number) => {
  if (amount < 0.4) return "danger"
  if (amount < 0.7) return "warning"
  return "success"
}

const StabilityBar = ({ amount }: { amount: number }) => (
  <div className="flex flex-row items-center w-48">
    <span className="text-xs">
      Stability
    </span>
    <Progress
      aria-label="Stability"
      value={amount}
      minValue={0}
      maxValue={1}
      size="sm"
      className="ml-2 mt-[3px]"
      color={colourForAmount(amount)}
    />
  </div>
)

export default StabilityBar
