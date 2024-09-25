import { range } from "~/util"

import './CarouselRevealer.css'

export type CarouselRevealerProps = {
  currentIndex: number
  totalItems: number
  /**
   * 
   * @param index 
   * @param currentDelta the delta of this index to the revealer's currentIndex,
   *                     where 0 is the current item, negative numbers are past
   *                     items, and positive numbers indicate "future" items.
   * @returns a rendered <tr> JSX element, or undefined to hide the row.
   */
  renderTableRow: (index: number, currentDelta: number) => JSX.Element | undefined
}

function CarouselRevealer({
  currentIndex,
  totalItems,
  renderTableRow,
}: CarouselRevealerProps) {
  const nextIndex = currentIndex + 1
  return (
    <>
      <table className="carousel-revealer table-fixed w-full">
        <tbody className="past">
          {range(currentIndex).map(i => renderTableRow(i, i - currentIndex))}
        </tbody>
        <tbody className="current">
          {renderTableRow(currentIndex, 0)}
        </tbody>
        <tbody className="future">
          {range(totalItems - nextIndex).map(i => renderTableRow(i + nextIndex, i + 1))}
        </tbody>
      </table>
      <div className="carousel-shadow" />
    </>
  )
}

export default CarouselRevealer
