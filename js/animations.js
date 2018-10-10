;(async function() {
  // Cache DOM selector.
  const container = document.getElementsByClassName('globe')[0]
  const canvas = container.getElementsByTagName('canvas')[0]
  // Canvas width and height.
  const width = 1000
  const height = 850
  const pos_x = 1800
  const pos_y = 0
  const pos_z = 1800
  const globeRadius = 200
  const globeSegments = 64
  const globeWidth = 2048 / 2
  const globeHeight = 1024 / 2

  // Three.js variables.
  let data, scene, renderer, camera, globe

  // Enter.
  if (checkWebGl()) {
    const cache = localStorage.getItem('globe_points')

    try {
      if (cache) {
        data = JSON.parse(cache)
        setup()
      } else {
        data = fetch(
          'https://s3-us-west-2.amazonaws.com/s.cdpn.io/617753/globe-points.json'
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

    render()

    setTimeout(() => container.classList.add('show'), 1)
  }

  function setupGlobe() {
    //const texture = new THREE.TextureLoader().load('imgs/world-map-test.png')
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

    scene.add(globe)

    addPoints()
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
      const pos = returnSphericalCoordinates(point.x, point.y)
      // Position ping item.
      pingGeometry.translate(pos.x, pos.y, pos.z)
      // Merge ping item onto our mergedGeometry object.
      mergedGeometry.merge(pingGeometry)
      // Reset ping item position.
      pingGeometry.translate(-pos.x, -pos.y, -pos.z)
    }

    // We end up with 1 mesh to add to the scene rather than our (n) number of points.
    const total = new THREE.Mesh(mergedGeometry, material)
    scene.add(total)
  }

  function render() {
    renderer.render(scene, camera)
    const timer = Date.now() * 0.00001
    camera.position.x = Math.cos(timer) * 400
    camera.position.z = Math.sin(timer) * 400
    camera.lookAt(0, 100, 0)
    requestAnimationFrame(render)
  }

  // Returns an object of 3D spherical coordinates
  function returnSphericalCoordinates(latitude, longitude) {
    /*
		This function will take a latitude and longitude and calcualte the
		projected 3D coordiantes using Mercator projection relative to the
		radius of the globe.

		Reference: https://stackoverflow.com/a/12734509
	*/

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
