;(function() {
  /* Three.js globe inspired by Stripe.com/atlas project and https://codepen.io/Flamov/pen/MozgXb */

  // Cache DOM selector. Since we're working within our section.globe we
  // can simply reference container.whatever instead of document.whatever!!
  const container = document.getElementsByClassName('globe')[0]
  const canvas = container.getElementsByTagName('canvas')[0]
  // Canvas width and height.
  const width = 1000
  const height = 850
  const globeRadius = 200
  const globeSegments = 64
  const globeWidth = 4098 / 2
  const globeHeight = 1968 / 2

  // A group to hold everything.
  const groups = {
    globe: null,
    globePoints: null,
  }

  // Three.js variables.
  let data, scene, renderer, camera, globe
  // User data
  const users = [
    {
      name: 'Tim Chang',
      geo: { lat: 34.0522, lng: -118.2437, name: 'Los Angeles, CA' },
      date: '10.09.2018',
    },
    {
      name: 'Other Friend',
      geo: { lat: 40.7128, lng: -74.006, name: 'New York, NY' },
      date: '10.29.2018',
    },
    {
      name: 'More Friend',
      geo: { lat: 40.7128, lng: -74.006, name: 'New York, NY' },
      date: '11.08.2018',
    },
    {
      name: 'Tims Mom',
      geo: { lat: 40.7128, lng: -74.006, name: 'New York, NY' },
      date: '11.01.2018',
    },
  ]

  // A state object to hold visual state.
  const state = {
    currentUserIndex: null,
    previousUserIndex: null,
    isFormShowing: false,
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
    camera = new THREE.PerspectiveCamera(45, width / height, 1, 4000)

    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      opacity: 1,
    })
    renderer.setSize(width, height)

    setupGlobe()
    setupUsers()
    setupEventListeners()
    render()

    setTimeout(() => container.classList.add('show'), 1)
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
    canvasGradient.addColorStop(1, '#f7f7f7')
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
    addUserPoint()
  }

  function addPoints() {
    const mergedGeometry = new THREE.Geometry()
    // The geometry that will contain all of our points.
    const pingGeometry = new THREE.SphereGeometry(0.5, 0.5, 0.5)
    // The material that our ping will be created from.
    const material = new THREE.MeshBasicMaterial({
      color: '#626177',
    })

    for (let point of data.points) {
      // Transform our latitude and longitude values to points on the sphere.
      const pos = convertFlatCoordsToSphereCoords(
        point.x,
        point.y,
        globeRadius,
        globeHeight
      )
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

  function addUserPoint() {
    const mergedGeometry = new THREE.Geometry()
    const pingGeometry = new THREE.SphereGeometry(3, 3, 3)
    // The material that our ping will be created from.
    const material = new THREE.MeshBasicMaterial({ color: 0x000a12 })
    for (let user of users) {
      const pos = convertLatLngToSphereCoords(
        user.geo.lat,
        user.geo.lng,
        globeRadius,
        -1
      )
      pingGeometry.translate(pos.x, pos.y, pos.z)
      mergedGeometry.merge(pingGeometry)
      pingGeometry.translate(-pos.x, -pos.y, -pos.z)
    }
    const total = new THREE.Mesh(mergedGeometry, material)
    scene.add(total)
  }

  function setupUsers() {
    // 1. Render all users onto page
    // 2. Selects a random user to scroll to.
    // 3. Rotate the globe to point to lat/lng.
    // 4. Setup click event listners for when client clicks next.

    // 1.
    let finishedMarkup = ''
    users.forEach(user => {
      const markup = `
        <div class="user">
          <h3 class="name">${user.name}</h3> 
          <span class="geo">${user.geo.lat}°, ${user.geo.lng}°</span>
          <span class="geo-name">${user.geo.name}</span>
          <span class="date">${user.date}</span>
        </div>
      `
      finishedMarkup += markup
    })
    container.getElementsByClassName('users')[0].innerHTML = finishedMarkup

    // 2.
    focusUser()
    // positionGlobe()
  }

  function focusUser() {
    if (state.currentUserIndex === null) {
      // If there is no current user (when our page first loads), we'll pick one randomly.
      state.currentUserIndex = getRandomNumberBetween(0, users.length - 1)
    } else {
      // If we already have an index (page has already been loaded/user already clicked next), we'll continue the sequence.
      state.previousUserIndex = state.currentUserIndex
      state.currentUserIndex = (state.currentUserIndex + 1) % users.length
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
    if (state.previousUserIndex !== null) {
      children[state.previousUserIndex].classList.remove('active')
    }
    children[state.currentUserIndex].classList.add('active')
  }

  function setupEventListeners() {
    // Setup event listeners for toggling buttons.
    container.addEventListener('click', function(e) {
      const isButton = e.target.tagName === 'BUTTON'
      // Handles displaying the next user and locating them on the globe.
      if (isButton) {
        const classname = e.target.getAttribute('class')
        if (classname.indexOf('arrow-next') !== -1) {
          focusUser()
        }
        if (classname.indexOf('send-wave') !== -1) {
          toggleForm()
        }
      }
    })

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

    // Setup event listener for form.
    const form = container.getElementsByClassName('send-wave-form')[0]
    form.addEventListener('submit', function(e) {
      e.preventDefault()
      const name = e.target.name.value
      const message = e.target.message.value
    })
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
      inputs.forEach(input => (input.tabIndex = -1))
    }
  }

  function render() {
    renderer.render(scene, camera)
    const timer = Date.now() * 0.00001
    camera.position.x = Math.cos(timer) * 400
    camera.position.z = Math.sin(timer) * 400
    camera.lookAt(0, 100, 0)
    requestAnimationFrame(render)
  }

  // Helpers
  // =======

  function convertLatLngToSphereCoords(lat, lon, radius, height) {
    const phi = (lat * Math.PI) / 180
    const theta = ((lon - 180) * Math.PI) / 180
    const x = -(radius + height) * Math.cos(phi) * Math.cos(theta)
    const y = (radius + height) * Math.sin(phi)
    const z = (radius + height) * Math.cos(phi) * Math.sin(theta)
    return { x, y, z }
  }

  function convertFlatCoordsToSphereCoords(latitude, longitude) {
    //Calculate the relative 3d coordinates using Mercator projection relative to
    //the radius of the globe.

    // Convert latitude and longitude on the 90/180 degree axis
    latitude = ((latitude - globeWidth) / globeWidth) * -180
    longitude = ((longitude - globeHeight) / globeHeight) * -90

    // Calculate the projected starting point
    var radius = Math.cos((longitude / 180) * Math.PI) * globeRadius
    var targetX = Math.cos((latitude / 180) * Math.PI) * radius
    var targetY = Math.sin((longitude / 180) * Math.PI) * globeRadius
    var targetZ = Math.sin((latitude / 180) * Math.PI) * radius

    return {
      x: targetX,
      y: targetY,
      z: targetZ,
    }
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
})()
