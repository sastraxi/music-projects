import './MouseSupportRequired.css'

const MouseSupportRequired = () => (
  <div className="container">
      <div id="mouseSupportRequired">
        <h1>Desktop only!</h1>
        <p>
          Unfortunately, <code>jam-shuffle</code> requires a mouse or keyboard (for now).
          Try opening it up on your laptop or desktop computer.
          Feel free to open up an issue to share how you&apos;re using it, I&apos;d love to hear from you.
        </p>
        <p>
          <a href="https://github.com/sastraxi/jam-shuffle/issues/new">
            https://github.com/sastraxi/jam-shuffle/issues/new
          </a>
        </p>
    </div>
  </div>
)

export default MouseSupportRequired
