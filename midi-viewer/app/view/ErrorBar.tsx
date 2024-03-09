import { Progress } from "@nextui-org/react"

const ErrorBar = ({ amount }: { amount: number }) => (
  <div className="flex flex-row items-center">
    <span className="text-xs">
      Error
    </span>
    <Progress value={amount} minValue={0} maxValue={1} size="sm" className="ml-2 mt-[3px] w-32" color="danger" />  </div>
)

export default ErrorBar
