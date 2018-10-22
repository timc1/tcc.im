;(function() {
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
          <p>你好，我是 张承天。</p>
          <p>我构建了可以改善离线体验的数字产品。</p>
          <p>从用于创作者，市场，商业或创建引人注目的品牌的软件工具，</p>
          <p>我在这里帮忙。</p>
        `
        form.innerHTML = `
          <div class="input-wrapper empty">
            <label for="name">你的名字</label>
            <input type="text" id="name" autocomplete="off" spellcheck="off" placeholder="张承天" tabindex="0" required="">  
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
          <p>我喜欢使用React，HTML / CSS和vanilla javascript构建可访问，高性能和交互式的用户界面。 （这个网站是一个使用WebGL和three.js的实验）</p>
          <p>
            在此之前，我曾在旧金山和上海与<a class="hover" href="https://www.verlocal.com" target="_blank" rel="noreferrer">verlocal</a>，<a class="hover" href="https://www.omnyfy.com" target="_blank" rel="noreferrer">omnyfy</a>和<a class="hover" href="https://www.handpick.com" target="_blank" rel="noreferrer">handpick</a>合作，并与<a class="hover" href="https://avresources.co" target="_blank" rel="noreferrer">avrc</a>，<a class="hover" href="https://austillery.com" target="_blank" rel="noreferrer">austillery</a>和<a class="hover" href="https://producthunt.com/@timothy_chang" target="_blank" rel="noreferrer">其他</a>公司合作。 
          </p>
          <p>目前总部设在加利福尼亚州洛杉矶。</p>
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
  setupLanguage()
})()
