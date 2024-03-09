import { Progress } from "@nextui-org/react"

const ErrorBar = ({ amount }: { amount: number }) => (
  <div className="flex flex-row items-center w-48">
    <span className="text-xs">
      Error
    </span>
    <Progress aria-label="Error" value={amount} minValue={0} maxValue={1} size="sm" className="ml-2 mt-[3px]" color="danger" />  </div>
)

export default ErrorBar
