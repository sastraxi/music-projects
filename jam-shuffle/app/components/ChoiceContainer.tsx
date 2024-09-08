import './ChoiceContainer.css'

const ChoiceContainer = ({
  caption,
  children,
  alignItems = 'start',
  buttons = undefined,
}: {
  caption: string,
  children: React.ReactNode,
  alignItems?: 'start' | 'center' | 'end',
  buttons?: React.ReactNode,
}) => {
  return (
    <div className="choiceContainer">
      {buttons && <div className="buttons">
        {buttons}
      </div>}
      <div className="content" style={{ alignItems }}>
        <h3>{caption}</h3>
        <h2>
          {children}
        </h2>
      </div>
    </div>
  )
}

export default ChoiceContainer
