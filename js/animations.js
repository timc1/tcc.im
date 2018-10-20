;(function() {
  const apiUrl = 'http://localhost:3000/'
  /* Three.js globe inspired by Stripe.com/atlas project and https://codepen.io/Flamov/pen/MozgXb */

  // Cache DOM selector. Since we're working within our section.globe we
  // can simply reference container.whatever instead of document.whatever
  const container = document.getElementsByClassName('globe')[0]
  const canvas = container.getElementsByTagName('canvas')[0]
  // Canvas width and height.
  const width = 1000
  const height = 800
  const globeRadius = 200
  const globeSegments = 64
  const globeWidth = 4098 / 2
  const globeHeight = 1968 / 2

  // A group to hold everything.
  const groups = {
    globe: null,
    globePoints: null,
    userPoints: null,
  }

  /**
   * Three.js variables and properties we need to keep track of.
   *
   * @property {Array} data the points that make up our globe
   * @property {Object} scene three.js scene
   * @property {Object} renderer three.js renderer
   * @property {Object} camera three.js camera
   * @property {Object} globe the object that contains the elements that make up the globe
   * @property {Object} pivot the object that holds all three.js materials into one mesh in order to more
   *                    efficiently move the object (if we are not rotating via the camera)
   */
  let data, scene, renderer, globe, pivot
  const camera = {
    object: null,
    orbitControls: null,
    angles: {
      current: {
        azimuthal: null,
        polar: null,
      },
      target: {
        azimuthal: null,
        polar: null,
      },
    },
    transition: {
      current: 0,
      target: 30,
    },
  }
  // This keeps track of the values we'll use to animate in and out the globe popup.
  const popup = {
    domElement: container.getElementsByClassName('content')[0],
    cacheVertices: null,
  }

  // A state object to hold visual state.
  const state = {
    users: [],
    currentUserIndex: null,
    previousUserIndex: null,
    isFormShowing: false,
    isGlobeAnimating: false,
    autoRotateGlobeTimer: null,
    isSubmittingForm: false,
  }

  // Enter.
  if (checkWebGl()) {
    const cache = localStorage.getItem('globe_points')

    try {
      if (cache) {
        data = JSON.parse(cache)
        setup()
      } else {
        data = fetch(
          'https://s3-us-west-1.amazonaws.com/tcc.im-assets/tcc.im/points.json'
        )
          .then(response => response.json())
          .then(parsed => {
            localStorage.setItem('globe_points', JSON.stringify(parsed))
            data = parsed
            setup()
          })
      }
    } catch (err) {
      if (err) {
        console.log('error', err)
        fallback()
      }
    }
  } else {
    fallback()
  }

  function setup() {
    scene = new THREE.Scene()
    camera.object = new THREE.PerspectiveCamera(45, width / height, 1, 4000)
    camera.object.position.z = -400

    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      opacity: 1,
    })
    renderer.setSize(width, height)

    setupGlobe()
    // setupPivot will place our entire globe (the base mesh, points that make up the globe, userPoints)
    // all in one Three.Group. This way, we can rotate this one Group rather than the camera.
    // We can then use the camera to look at specific parts of the globe and not have to do much calculations.
    // setupPivot()
    setupOrbitControls()
    setupUsers()
    setupEventListeners()
    render()

    setTimeout(() => {
      container.classList.add('show')
      document.getElementsByClassName('footer-content')[0].classList.add('show')
    }, 1)
  }

  function setupGlobe() {
    // const texture = new THREE.TextureLoader().load('imgs/world-map-test.png')

    // Here we will create our own texture instead of loading an image.
    const textureLoader = new THREE.TextureLoader()
    textureLoader.setCrossOrigin(true)

    const canvasSize = 128
    const textureCanvas = document.createElement('canvas')
    textureCanvas.width = canvasSize
    textureCanvas.height = canvasSize
    const canvasContext = textureCanvas.getContext('2d')
    canvasContext.rect(0, 0, canvasSize, canvasSize)
    const canvasGradient = canvasContext.createLinearGradient(
      0,
      0,
      0,
      canvasSize
    )
    canvasGradient.addColorStop(0, '#fff')
    canvasGradient.addColorStop(0.5, '#fff')
    canvasGradient.addColorStop(1, '#fff')
    canvasContext.fillStyle = canvasGradient
    canvasContext.fill()

    const texture = new THREE.Texture(textureCanvas)
    texture.needsUpdate = true

    const geometry = new THREE.SphereGeometry(
      globeRadius,
      globeSegments,
      globeSegments
    )
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.5,
    })
    globe = new THREE.Mesh(geometry, material)

    groups.globe = globe
    groups.globe.name = 'Globe'

    scene.add(groups.globe)

    addPoints()
    //addUserPoint()
  }

  function addPoints() {
    const mergedGeometry = new THREE.Geometry()
    // The geometry that will contain all of our points.
    const pingGeometry = new THREE.SphereGeometry(0.5, 5, 5)
    // The material that our ping will be created from.
    const material = new THREE.MeshBasicMaterial({
      color: '#626177',
    })

    for (let point of data.points) {
      // Transform our latitude and longitude values to points on the sphere.
      const pos = convertFlatCoordsToSphereCoords(point.x, point.y)

      if (pos.x && pos.y && pos.z) {
        // Position ping item.
        pingGeometry.translate(pos.x, pos.y, pos.z)
        // Merge ping item onto our mergedGeometry object.
        mergedGeometry.merge(pingGeometry)
        // Reset ping item position.
        pingGeometry.translate(-pos.x, -pos.y, -pos.z)
      }
    }

    // We end up with 1 mesh to add to the scene rather than our (n) number of points.
    const total = new THREE.Mesh(mergedGeometry, material)
    groups.globePoints = total
    groups.globePoints.name = 'Globe Points'
    scene.add(groups.globePoints)
  }

  /*
  function addUserPoint() {
    // This will create all of the user points onto the globe. But we are not using it right now because
    // we want to render only one point at a time. 
    const mergedGeometry = new THREE.Geometry()
    const pingGeometry = new THREE.SphereGeometry(3, 3, 3)
    // The material that our ping will be created from.
    const material = new THREE.MeshBasicMaterial({ color: 0x000a12 })
    for (let user of users) {
      const pos = convertLatLngToSphereCoords(user.geo.lat, user.geo.lng)
      pingGeometry.translate(pos.x, pos.y, pos.z)
      mergedGeometry.merge(pingGeometry)
      pingGeometry.translate(-pos.x, -pos.y, -pos.z)
    }
    const total = new THREE.Mesh(mergedGeometry, material)
    groups.userPoints = total
    groups.userPoints.name = 'User Points'
    //scene.add(groups.userPoints)
  }
  */

  /*
  function setupPivot() {
    pivot = new THREE.Group()
    scene.add(pivot)
    pivot.add(groups.globe)
    pivot.add(groups.globePoints)
    //pivot.add(groups.userPoints)
  }
  */

  function setupOrbitControls() {
    camera.orbitControls = new THREE.OrbitControls(camera.object, canvas)
    camera.orbitControls.enableKeys = false
    camera.orbitControls.enablePan = false
    camera.orbitControls.enableZoom = false
    camera.orbitControls.enableDamping = false
    camera.orbitControls.enableRotate = false
    camera.object.position.z = -550
    camera.orbitControls.update()
  }

  /**
   * This will manage rendering users into the DOM.
   *
   * @property {Object} user a single user object to append to the already existing DOM. Will not be called on initial rendering.
   */
  async function setupUsers(user) {
    // 1. Render all users onto page
    // 2. Selects a random user to scroll to.
    // 3. Rotate the globe to point to lat/lng.
    // 4. Setup click event listners for when client clicks next.
    let finishedMarkup = ''

    const getMarkup = user =>
      `
        <h3 class="name">${user.name.toUpperCase()}</h3>
        <span class="geo">${user.geo.lat
          .toString()
          .substr(0, 7)}°, ${user.geo.lng.toString().substr(0, 7)}°</span>
        <span class="date">${user.date}</span>
      `

    if (user) {
      finishedMarkup = getMarkup(user)
      const node = document.createElement('div')
      node.className = 'user'
      node.innerHTML = getMarkup(user)
      container.getElementsByClassName('users')[0].appendChild(node)
      return
    }

    // We'll never get an error from this because our server
    // will return a cached set of data if it fails fetching.
    const response = await fetch(`${apiUrl}v0/user/all`)
    const { users } = await response.json()

    state.users = users

    state.users.forEach(user => {
      const markup = getMarkup(user)
      finishedMarkup += `<div class="user">${markup}</div>`
    })
    container.getElementsByClassName('users')[0].innerHTML = finishedMarkup

    // We'll do a check here even though our DB will always return a list of users.
    // Just for safety measures. 😃
    if (state.users.length > 0) {
      focusUser()
      // Setup a timer to automatically toggle next user every (n)ms
      state.autoRotateGlobeTimer = setInterval(() => {
        focusUser()
      }, 10000)
    }
  }
  function focusUser() {
    if (state.users.length > 0) {
      if (state.currentUserIndex === null) {
        // If there is no current user (when our page first loads), we'll pick one randomly.
        state.currentUserIndex = getRandomNumberBetween(
          0,
          state.users.length - 1
        )
      } else {
        // If we already have an index (page has already been loaded/user already clicked next), we'll continue the sequence.
        state.previousUserIndex = state.currentUserIndex
        state.currentUserIndex =
          (state.currentUserIndex + 1) % state.users.length
      }
      // 150px is our set width amount. If you change it in the css file (div.users), change it here.
      // 1. Get the new translateX amount by multiplying the index of the state.currentUserIndex by 150
      // 2. Set the new translateX amount * -1 because we're reading from left to right.
      // 4. Get element of state.previousUserIndex and remove its 'active' class.
      // 5. Get the current child div.user through getting the div.user element using state.currentUserIndex.
      // 6. Add 'active' class to div.user of state.currentUserIndex.
      const translateX = state.currentUserIndex * 150
      const el = container.getElementsByClassName('users')[0]
      el.style = `transform: translateX(-${translateX}px)`
      const children = el.getElementsByClassName('user')
      if (state.previousUserIndex !== null && state.previousUserIndex !== -1) {
        children[state.previousUserIndex].classList.remove('active')
      }
      children[state.currentUserIndex].classList.add('active')
      focusGlobe()
    }
  }
  function focusGlobe() {
    // 1. We'll get the current user's lat/lng
    // 2. Set camera.angles.current
    // 3. Calculate and set camera.angles.target
    // 4. animate method will handle animating
    const { geo } = state.users[state.currentUserIndex]
    camera.angles.current.azimuthal = camera.orbitControls.getAzimuthalAngle()
    camera.angles.current.polar = camera.orbitControls.getPolarAngle()
    const { x, y } = convertLatLngToFlatCoords(geo.lat, geo.lng)
    const { azimuthal, polar } = returnCameraAngles(x, y)
    camera.angles.target.azimuthal = azimuthal
    camera.angles.target.polar = polar
    // Updating state here will make sure our animate method will rotate our globe to the next point.
    // It will also make sure we update & cache our popup DOM element so we can use it in our animateGlobeToNextLocation.
    state.isGlobeAnimating = true
    if (popup.cacheVertices) {
      updatePopup('HIDE')
    }
  }
  function setupEventListeners() {
    // Setup event listeners for toggling buttons.
    const buttons = container.querySelectorAll('button')
    buttons.forEach(button => {
      button.addEventListener('click', function(e) {
        const classname = e.target.getAttribute('class')
        if (classname.indexOf('arrow-next') !== -1) {
          focusUser()
          // Reset our autoRotateGlobeTimer
          clearInterval(state.autoRotateGlobeTimer)
          state.autoRotateGlobeTimer = setInterval(() => {
            focusUser()
          }, 10000)
        }
        if (classname.indexOf('send-wave') !== -1) {
          toggleForm()
        }
      })
    })
    // Setup event listener for form.
    const form = container.getElementsByClassName('send-wave-form')[0]
    form.addEventListener('submit', submitForm)
    // Setup event listeners for input/textarea focus/blur
    const inputs = container.querySelectorAll('input,textarea')
    inputs.forEach(input => {
      input.addEventListener('focus', function(e) {
        // Add focused class
        e.target.parentNode.classList.remove('empty')
        e.target.parentNode.classList.add('active')
      })
      input.addEventListener('blur', function(e) {
        // Remove focused class
        if (e.target.value.length === 0) {
          e.target.parentNode.classList.add('empty')
        } else {
          e.target.parentNode.classList.remove('empty')
        }
        e.target.parentNode.classList.remove('active')
      })
    })
    // Setup event listeners for outer click.
    document.addEventListener('click', function(e) {
      // Manage outer click for our form.
      if (state.isFormShowing) {
        if (
          form.contains(e.target) ||
          e.target.classList.contains('send-wave')
        ) {
          // Do nothing.
        } else {
          toggleForm()
        }
      }
    })
    document.addEventListener('keydown', function(e) {
      // Close form when user clicks escape.
      if (e.keyCode === 27 && state.isFormShowing) {
        toggleForm()
      }
    })
  }
  function submitForm(e) {
    e.preventDefault()
    const form = container.getElementsByClassName('send-wave-form')[0]
    const submitButton = form.getElementsByClassName('submit-button')[0]
    const loader = form.getElementsByClassName('loader')[0]
    state.isSubmittingForm = true
    updateSpinner(loader, submitButton)
    window.navigator.geolocation.getCurrentPosition(onSuccess, onError)
    async function onSuccess(location) {
      const name = e.target.name.value
      const message = e.target.message.value
      const {
        coords: { latitude, longitude },
      } = location
      let location_name
      // Get name of location by using Google Maps API to reverse geocode latitude and longitude.
      const geocoder = new google.maps.Geocoder()
      geocoder.geocode(
        {
          location: {
            lat: latitude,
            lng: longitude,
          },
        },
        async (results, status) => {
          if (status === 'OK') {
            if (results[0]) {
              // We only want to extract the city and state/province.
              const filtered = results[0].address_components.reduce(
                (acc, curr) => {
                  const type = curr.types[0]
                  const short_name = curr.short_name
                  acc[type] = short_name
                  return acc
                },
                {}
              )
              location_name = `${filtered.locality}, ${
                filtered.administrative_area_level_1
              }`
              // Add user to database.
              const { error, user } = await httpPost(`${apiUrl}v0/user`, {
                name,
                message,
                latitude,
                longitude,
                location_name,
              })
              state.isSubmittingForm = false
              if (error) {
                updateSpinner(loader, submitButton, false, true)
                // Display error message
              } else {
                updateSpinner(loader, submitButton, true, false)
                // Once we have a new user, we can push them onto our state.
                // 1. Hide form after (n)ms.
                // 2. Add user to state and gets it's position index in state.users array.
                // 3. Add user to DOM.
                // 4. Update currentUserIndex to be that index so user will see themselves in the next iteration.
                setTimeout(() => {
                  toggleForm()
                  state.users.push(user)
                  // Append new user to DOM
                  setupUsers(user)
                  state.currentUserIndex =
                    state.users.findIndex(u => u.id === user.id) - 1
                  //Reset our autoRotateGlobeTimer
                  clearInterval(state.autoRotateGlobeTimer)
                  focusUser()
                  state.autoRotateGlobeTimer = setInterval(() => {
                    focusUser()
                  }, 10000)
                }, 800)
              }
              // Send an email to self 😊
              const { error: emailError, success } = await httpPost(
                `${apiUrl}v0/email`,
                {
                  from: `New tcc.im visitor`,
                  to: 'timchang.tcc@gmail.com',
                  subject: `New Submission! <${name}>`,
                  text: '',
                  html: `
                    <p>New submission from: ${name}</p>
                    <p>Message: ${message}</p>
                  `,
                }
              )
            } else {
              // Display error
              updateSpinner(loader, submitButton, false, true)
            }
          } else {
            // Display error
            updateSpinner(loader, submitButton, false, true)
          }
        }
      )
    }
    function onError(error) {
      state.isSubmittingForm = false
      updateSpinner(loader, submitButton, false, true)
    }
  }
  function toggleForm() {
    state.isFormShowing = !state.isFormShowing
    const form = container.getElementsByClassName('send-wave-form')[0]
    const toggle = container.getElementsByClassName('send-wave')[0]
    const inputs = form.querySelectorAll('input,textarea')
    if (state.isFormShowing) {
      form.classList.add('show')
      toggle.classList.add('exit')
      inputs[0].focus()
      inputs.forEach(input => (input.tabIndex = 0))
    } else {
      form.classList.remove('show')
      toggle.classList.remove('exit')
      inputs.forEach(input => {
        input.tabIndex = -1
        input.blur()
      })
    }
  }
  function updateSpinner(spinner, toggler, isSuccess, isError) {
    if (state.isSubmittingForm) {
      spinner.classList.add('show')
      toggler.disabled = true
      return
    } else if (isSuccess) {
      spinner.classList.remove('error')
      spinner.classList.add('success')
      // We'll keep the toggler disabled so people don't double submit.
    } else if (isError) {
      spinner.classList.remove('success')
      spinner.classList.add('error')
      toggler.disabled = false
    } else {
      spinner.classList.remove('show', 'error', 'success')
      toggler.disabled = false
    }
  }
  function render() {
    renderer.render(scene, camera.object)
    requestAnimationFrame(render)
    animate()
  }
  function animate() {
    if (state.isGlobeAnimating) {
      // Here we update azimuthal and polar angles.
      // Our focusGlobe() method will trigger state.isGlobeAnimating
      // and update the current and target azimuthal/polar angles of
      // our camera. Then, animateGlobeToNextLocation() will
      // animate globe from the current azimuthal/polar angles to the target.
      // It will then set state.isGlobeAnimating to false when the angles are equal.
      animateGlobeToNextLocation()
      camera.orbitControls.update()
    }
  }
  function animateGlobeToNextLocation() {
    const { current, target } = camera.transition
    if (current <= target) {
      const progress = easeInOutQuad(current / target)
      const {
        current: { azimuthal: currentAzimuthal, polar: currentPolar },
        target: { azimuthal: targetAzimuthal, polar: targetPolar },
      } = camera.angles
      var azimuthalDifference = (currentAzimuthal - targetAzimuthal) * progress
      azimuthalDifference = currentAzimuthal - azimuthalDifference
      camera.orbitControls.setAzimuthalAngle(azimuthalDifference)
      var polarDifference = (currentPolar - targetPolar) * progress
      polarDifference = currentPolar - polarDifference
      camera.orbitControls.setPolarAngle(polarDifference)
      camera.transition.current++
    } else {
      updatePopup('SHOW')
      state.isGlobeAnimating = false
      camera.transition.current = 0
    }
  }
  function setupPopup() {
    // Setup will only be called at the beginning in order to position our popup correctly
    // on the screen so the first animation won't flow in from a crazy angle.
    const { x, y } = calculatePopupLocation()
    popup.cacheVertices = { x, y }
    updatePopup('HIDE')
    setTimeout(() => updatePopup('SHOW'), 250)
  }
  function updatePopup(action) {
    const user = state.users[state.currentUserIndex]
    const { domElement: el, cacheVertices } = popup
    if (!cacheVertices) {
      setupPopup()
      return
    }
    let scale, x, y
    switch (action) {
      case 'SHOW':
        const target = calculatePopupLocation()
        x = target.x
        y = target.y
        popup.cacheVertices = { x, y }
        el.classList.add('animating')
        const contentContainer = el.getElementsByTagName('div')[0]
        contentContainer.innerHTML = `
          <span class="name">${user.name.toUpperCase()}</span>
          <span class="location">${user.geo.name}</span>
        `
        scale = 1
        break
      case 'HIDE':
        x = cacheVertices.x
        y = cacheVertices.y
        el.classList.remove('animating')
        scale = 0
        break
    }
    el.style.webkitTransform = `translate3D(${x}px, ${y}px, 0) scale(${scale})`
    el.style.WebkitTransform = `translate3D(${x}px, ${y}px, 0) scale(${scale})`
    el.style.mozTransform = `translate3D(${x}px, ${y}px, 0) scale(${scale})`
    el.style.msTransform = `translate3D(${x}px, ${y}px, 0) scale(${scale})`
    el.style.oTransform = `translate3D(${x}px, ${y}px, 0) scale(${scale})`
    el.style.transform = `translate3D(${x}px, ${y}px, 0) scale(${scale})`
  }
  function calculatePopupLocation() {
    const { domElement: el } = popup
    const user = state.users[state.currentUserIndex]
    const coords = convertLatLngToSphereCoords(user.geo.lat, user.geo.lng)
    const { x, y } = getProjectedPosition(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2,
      coords,
      el.clientWidth,
      el.clientHeight
    )
    return { x, y }
  }
  // Helpers
  // =======
  function convertLatLngToSphereCoords(latitude, longitude) {
    const phi = (latitude * Math.PI) / 180
    const theta = ((longitude - 180) * Math.PI) / 180
    const x = -(globeRadius + -1) * Math.cos(phi) * Math.cos(theta)
    const y = (globeRadius + -1) * Math.sin(phi)
    const z = (globeRadius + -1) * Math.cos(phi) * Math.sin(theta)
    return new THREE.Vector3(x, y, z)
  }
  function convertFlatCoordsToSphereCoords(x, y) {
    // Calculate the relative 3d coordinates using Mercator projection relative to the radius of the globe.
    // Convert latitude and longitude on the 90/180 degree axis.
    let latitude = ((x - globeWidth) / globeWidth) * -180
    let longitude = ((y - globeHeight) / globeHeight) * -90
    latitude = (latitude * Math.PI) / 180 //(latitude / 180) * Math.PI
    longitude = (longitude * Math.PI) / 180 //(longitude / 180) * Math.PI
    // Calculate the projected starting point
    const radius = Math.cos(longitude) * globeRadius
    const targetX = Math.cos(latitude) * radius
    const targetY = Math.sin(longitude) * globeRadius
    const targetZ = Math.sin(latitude) * radius
    return {
      x: targetX,
      y: targetY,
      z: targetZ,
    }
  }
  function convertLatLngToFlatCoords(latitude, longitude) {
    // Reference: https://stackoverflow.com/questions/7019101/convert-pixel-location-to-latitude-longitude-vise-versa
    const x = Math.round((longitude + 180) * (globeWidth / 360)) * 2
    const y = Math.round((-1 * latitude + 90) * (globeHeight / 180)) * 2
    return { x, y }
  }
  // Returns a 2d position based off of the canvas width and height to position popups on the globe.
  function getProjectedPosition(
    width,
    height,
    position,
    contentWidth,
    contentHeight
  ) {
    position = position.clone()
    var projected = position.project(camera.object)
    return {
      x: projected.x * width + width - contentWidth / 2,
      y: -(projected.y * height) + height - contentHeight - 10, // -10 for a small offset
    }
  }
  // Returns an object of the azimuthal and polar angles of a given a points x,y coord on the globe
  function returnCameraAngles(x, y) {
    let targetAzimuthalAngle = ((x - globeWidth) / globeWidth) * Math.PI
    targetAzimuthalAngle = targetAzimuthalAngle + Math.PI / 2
    targetAzimuthalAngle += 0.3 // Add a small horizontal offset
    let targetPolarAngle = (y / (globeHeight * 2)) * Math.PI
    targetPolarAngle += 0.1 // Add a small vertical offset
    return {
      azimuthal: targetAzimuthalAngle,
      polar: targetPolarAngle,
    }
  }
  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  }
  function getRandomNumberBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
  }
  function checkWebGl() {
    const gl =
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (gl && gl instanceof WebGLRenderingContext) {
      return true
    } else {
      return false
    }
  }
  function fallback() {
    container.innerHTML =
      'Your browser does not support this part of the page! 😭 Use another browser to experience it!'
  }
  function httpPost(url = ``, data = {}) {
    // Default options are marked with *
    return fetch(url, {
      method: 'POST', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, cors, *same-origin
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      //credentials: 'same-origin', // include, same-origin, *omit
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        // "Content-Type": "application/x-www-form-urlencoded",
      },
      redirect: 'follow', // manual, *follow, error
      referrer: 'no-referrer', // no-referrer, *client
      body: JSON.stringify(data), // body data type must match "Content-Type" header
    }).then(response => response.json()) // parses response to JSON
  }
})()
