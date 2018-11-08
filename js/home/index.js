;(function() {
  const setupLogoAnimation = () => {
    const logo = document.getElementsByClassName('logo')[0]
    logo.classList.add('show')
    const link = logo.getElementsByTagName('a')[0]
    link.addEventListener('click', function(e) {
      e.preventDefault()
      logo.classList.remove('show')
      setTimeout(() => {
        logo.classList.add('show')
      }, 350)
    })
  }
  // Check language from window.location
  const getQueryString = (field, url) => {
    const href = url ? url : window.location.href
    const reg = new RegExp('[?&]' + field + '=([^&#]*)', 'i')
    const string = reg.exec(href)
    return string ? string[1] : null
  }

  const setupLanguage = () => {
    const lang = getQueryString('lang')
    const html = document.documentElement
    const verse = document.getElementsByClassName('verse')[0]
    const footer = document.getElementsByClassName('footer-content')[0]
    const form = document.getElementsByClassName('send-wave-form')[0]

    switch (lang) {
      case 'zh':
        html.setAttribute('lang', 'zh')
        verse.innerHTML = `
          <p>你好，我是張承天。</p>
          <p>我是一名軟件開發人員，負責構建改善離線體驗的產品</>
          <p>面向自由職業者，從市場和商業的軟件工具，到開發一個引人注目的品牌，</p>
          <p>我都可以幫忙做。</p>
        `
        form.innerHTML = `
          <div class="input-wrapper empty">
            <label for="name">你的名字</label>
            <input type="text" id="name" autocomplete="off" spellcheck="off" placeholder="我的名字" tabindex="0" required="">  
          </div>
          <div class="input-wrapper empty">
            <label for="message">添加消息</label>
            <textarea type="text" id="message" autocomplete="off" spellcheck="off" placeholder="你好！🇯🇵 🇦🇺 🇬🇧!" tabindex="0"></textarea>
          </div>
          <div class="actions">
            <div class="loader"></div>
            <button class="submit-button">
              <div>
                发送 
              </div> 
            </button>
          </div>
          <div class="carat"></div>
        `
        footer.innerHTML = `
          <h1 class="hidden">关于</h1>
          <p>我喜歡使用React，HTML / CSS和vanilla javascript來構建無障礙的，高性能和交互式的用戶界面。 （這個網站是一個使用WebGL和three.js的實驗)
在此之前，我曾在舊金山和上海與<a class="hover" href="https://www.verlocal.com" target="_blank" rel="noreferrer">verlocal</a>，<a class="hover" href="https://www.omnyfy.com" target="_blank" rel="noreferrer">omnyfy</a>和<a class="hover" href="https://www.handpick.com" target="_blank" rel="noreferrer">handpick</a>合作，並與<a class="hover" href="https://avresources.co" target="_blank" rel="noreferrer">avrc</a>，<a class="hover" href="https://austillery.com" target="_blank" rel="noreferrer">austillery</a>和其他公司合作。
          <p>我目前住在洛杉磯。</p>
          <ul class="social">
            <li><a class="hover" href="https://instagram.com/timm.c" target="_blank" rel="noreferrer">IG</a></li>
            <li><a class="hover" href="mailto:timchang.tcc@gmail.com?subject=Hello!">联系</a></li>
          </ul>
        `
        break
      default:
    }
    verse.classList.add('show')
  }
  // Enter.
  setupLogoAnimation()
  setupLanguage() // Animate logo and setup event listener to animate when clicked.
})()
