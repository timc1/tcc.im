;(async function init() {
  // Cache globe container element.
  const container = document.getElementsByClassName('globe')[0]

  // Variables.
  const canvas = container.getElementsByTagName('canvas')[0]
  const _width = 1000 //canvas.clientWidth
  const _height = 600 //canvas.clientHeight
  let directionalLight, ambientLight, geometry, material, globe
  const _pos_x = 1800
  const _pos_y = 500
  const _pos_z = 1800

  // Check if WebGL is available
  const exists = await checkWebGl()
  if (!exists) {
    fallback()
    return
  }

  // Setup Three.js scene, camera, renderer.
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#fff')
  const camera = new THREE.PerspectiveCamera(45, _width / _height, 1, 4000)
  camera.position.set(_pos_x, _pos_y, _pos_z)
  camera.lookAt(new THREE.Vector3(0, 0, 0))
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
  })
  renderer.setSize(_width, _height)

  // Render and setup globe logic.
  await setupLighting()
  await setupGlobe()
  await setupPoints()
  render()

  // Functions
  async function checkWebGl() {
    return new Promise(resolve => {
      const gl =
        canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      if (gl && gl instanceof WebGLRenderingContext) {
        resolve(true)
      } else {
        resolve(false)
      }
    })
  }

  async function setupLighting() {
    return new Promise(resolve => {
      directionalLight = new THREE.DirectionalLight(0xeeeeee, 0.3)
      ambientLight = new THREE.AmbientLight(0xffffff, 1)
      directionalLight.position.set(0, 300, 0.1)
      scene.add(directionalLight)
      scene.add(ambientLight)
      resolve()
    })
  }

  async function setupGlobe() {
    return new Promise(resolve => {
      geometry = new THREE.SphereGeometry(600, 100, 100)
      material = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        map: new THREE.TextureLoader().load('imgs/world-map-test.png'),
        transparent: true,
        opacity: 1,
        shininess: 0.2,
      })
      globe = new THREE.Mesh(geometry, material)

      scene.add(globe)
      camera.position.z = 700
      camera.position.y = 500
      camera.position.x = 350
      resolve()
    })
  }

  async function setupPoints() {
    return new Promise(async resolve => {
      const mergedGeometry = new THREE.Geometry()
      // The geometry that will contain all of our points.
      const pingGeometry = new THREE.SphereGeometry(5, 10, 10)
      // The material that our ping will be created from.
      const material = new THREE.MeshBasicMaterial({ color: 0x555553 })
      // Fetch data.
      const points = await getData()

      for (let point of points) {
        // Transform our latitude and longitude values to points on the sphere.
        const pos = latLongToVector3(point.lat, point.lng, 600, -1)
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

      resolve()
    })
  }

  function render() {
    requestAnimationFrame(render)
    //const timer = Date.now() * 0.0001
    // Rotates globe by moving our camera.
    //camera.position.x = Math.cos(timer) * 1800
    //camera.position.z = Math.sin(timer) * 1800
    //camera.lookAt(scene.position)

    renderer.render(scene, camera)
  }

  function fallback() {
    container.innerHTML =
      'Your browser does not support this part of the page! 😭 Use another browser to experience it!'
  }
  // Helpers
  function latLongToVector3(lat, lon, radius, height) {
    const phi = (lat * Math.PI) / 180
    const theta = ((lon - 180) * Math.PI) / 180
    const x = -(radius + height) * Math.cos(phi) * Math.cos(theta)
    const y = (radius + height) * Math.sin(phi)
    const z = (radius + height) * Math.cos(phi) * Math.sin(theta)
    return new THREE.Vector3(x, y, z)
  }
  function getData() {
    return new Promise(resolve => {
      resolve([
        { lat: 37.7749, lng: -122.4194 },
        { lat: 40.7128, lng: -74.006 },
        { lat: 29.7604, lng: -95.3698 },
      ])
    })
  }
})()
