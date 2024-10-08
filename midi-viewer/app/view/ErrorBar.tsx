import { Progress } from "@nextui-org/progress"

const colourForAmount = (amount: number) => {
  if (amount < 0.3) return "success"
  if (amount < 0.6) return "warning"
  return "danger"
}

type ErrorBarProps = {
  amount: number
}

const ErrorBar = ({ amount }: ErrorBarProps) => (
  <div className="flex flex-row items-center w-48">
    <span className="text-xs">
      Error
    </span>
    <Progress
      aria-label="Error"
      value={amount}
      minValue={0}
      maxValue={1}
      size="sm"
      className="ml-2 mt-[3px]"
      color={colourForAmount(amount)}
    />
  </div>
)

export default ErrorBar
