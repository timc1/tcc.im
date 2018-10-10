;(function() {
  // Handle view next user button click.
  document.addEventListener('click', function(e) {
    const classname = e.target.getAttribute('class')
    const isButton = e.target.tagName === 'BUTTON'
    if (classname === 'arrow-next' && isButton) {
      console.log('next')
    }
  })
})()
