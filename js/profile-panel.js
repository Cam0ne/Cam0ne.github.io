(function () {
  'use strict'

  var state = {
    data: null,
    loaded: false
  }

  function createModal() {
    if (document.getElementById('skill-profile-modal')) return

    var modal = document.createElement('div')
    modal.id = 'skill-profile-modal'
    modal.className = 'skill-profile-modal'
    modal.setAttribute('role', 'dialog')
    modal.setAttribute('aria-modal', 'true')
    modal.setAttribute('aria-labelledby', 'skill-profile-title')
    modal.innerHTML = [
      '<div class="skill-profile-dialog">',
      '<div class="skill-profile-header">',
      '<div>',
      '<h2 id="skill-profile-title" class="skill-profile-title">能力分布</h2>',
      '<div class="skill-profile-subtitle">由文章标签和发布日期自动生成</div>',
      '</div>',
      '<button class="skill-profile-close" type="button" aria-label="关闭">×</button>',
      '</div>',
      '<div class="skill-profile-body">',
      '<section>',
      '<h3 class="skill-profile-section-title">标签能力雷达</h3>',
      '<div class="skill-radar-wrap"><canvas id="skill-radar" width="640" height="640"></canvas></div>',
      '<div id="skill-profile-meta" class="skill-profile-meta"></div>',
      '</section>',
      '<section>',
      '<h3 class="skill-profile-section-title">文章提交热力图</h3>',
      '<div class="heatmap-wrap"><div id="article-heatmap" class="heatmap-grid"></div></div>',
      '<div class="heatmap-legend"><span>少</span><span class="heatmap-cell" data-level="0"></span><span class="heatmap-cell" data-level="1"></span><span class="heatmap-cell" data-level="2"></span><span class="heatmap-cell" data-level="3"></span><span class="heatmap-cell" data-level="4"></span><span>多</span></div>',
      '<h3 class="skill-profile-section-title" style="margin-top:22px">标签明细</h3>',
      '<div id="skill-bars" class="skill-bars"></div>',
      '</section>',
      '</div>',
      '</div>'
    ].join('')

    document.body.appendChild(modal)
    modal.querySelector('.skill-profile-close').addEventListener('click', closeModal)
    modal.addEventListener('click', function (event) {
      if (event.target === modal) closeModal()
    })
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeModal()
    })
  }

  function attachTrigger() {
    renderAboutShell()
    numberArticleHeadings()
    formatTocNumbers()
    ensurePrismHighlight()
    if (document.getElementById('skill-profile-dashboard')) loadData()
  }

  function ensurePrismHighlight() {
    var article = document.getElementById('article-container')
    if (!article) return

    var run = function () {
      if (!window.Prism) return
      if (typeof window.Prism.highlightAllUnder === 'function') {
        window.Prism.highlightAllUnder(article, true)
      }
    }

    run()
    window.setTimeout(run, 500)
    window.setTimeout(run, 1200)
  }

  function cleanHeadingText(node) {
    var firstText = Array.from(node.childNodes).find(function (child) {
      return child.nodeType === 3 && child.textContent.trim()
    })
    if (!firstText) return

    firstText.textContent = firstText.textContent.replace(/^\s*(?:\[(?:0x[0-9a-f]+|[A-Z]-\d+(?:\.\d+)*)\]|0x[0-9a-f]+(?:\.[0-9a-f]+)*|\d+(?:\.\d+)*\.?)\s*/i, '')
  }

  function formatHeadingNumber(parts) {
    if (parts.length === 1) return '[0x' + String(parts[0]).padStart(2, '0') + ']'

    var chapterIndex = Math.max(parts[0], 1)
    var letter = String.fromCharCode(64 + ((chapterIndex - 1) % 26) + 1)
    var sectionParts = parts.slice(1).map(function (part) {
      return String(part).padStart(2, '0')
    })

    return '[' + letter + '-' + sectionParts.join('.') + ']'
  }

  function numberArticleHeadings() {
    var article = document.getElementById('article-container')
    if (!article) return

    var counters = [0, 0, 0, 0, 0, 0]
    article.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(function (heading) {
      if (heading.closest('pre, code, figure, .mermaid-wrap')) return
      heading.querySelectorAll('.heading-auto-number').forEach(function (node) {
        node.remove()
      })
      cleanHeadingText(heading)

      var level = Number(heading.tagName.slice(1))
      counters[level - 1] += 1
      for (var i = level; i < counters.length; i++) counters[i] = 0

      var parts = counters.slice(0, level).filter(function (value) {
        return value > 0
      })
      if (!parts.length) return

      var number = formatHeadingNumber(parts)
      heading.dataset.autoNumber = number

      var label = document.createElement('span')
      label.className = 'heading-auto-number'
      label.textContent = number

      var anchor = heading.querySelector(':scope > a.anchor, :scope > a.headerlink')
      if (!heading.id && anchor && anchor.id) heading.id = anchor.id
      if (anchor) anchor.insertAdjacentElement('afterend', label)
      else heading.insertBefore(label, heading.firstChild)
    })
  }

  function formatTocNumbers() {
    var headingNumbers = Array.from(document.querySelectorAll('#article-container h1,h2,h3,h4,h5,h6')).map(function (heading) {
      return {
        id: heading.id || heading.querySelector(':scope > a.anchor, :scope > a.headerlink')?.id || '',
        number: heading.dataset.autoNumber,
        text: (heading.textContent || '').replace(/^\s*(?:\[(?:0x[0-9a-f]+|[A-Z]-\d+(?:\.\d+)*)\]|0x[0-9a-f]+(?:\.[0-9a-f]+)*|\d+(?:\.\d+)*\.?)\s*/i, '').trim()
      }
    }).filter(function (item) {
      return item.number
    })

    document.querySelectorAll('#card-toc .toc-link').forEach(function (link, index) {
      var numberNode = link.querySelector('.toc-number')
      var textNode = link.querySelector('.toc-text')
      var item = headingNumbers[index]
      if (!numberNode || !textNode || !item) return

      if (item.id) link.setAttribute('href', '#' + item.id)
      numberNode.textContent = item.number + ' '
      textNode.textContent = item.text
    })
  }

  function renderAboutShell() {
    var root = document.getElementById('skill-profile-dashboard')
    if (!root || root.dataset.ready) return
    root.dataset.ready = 'true'
    root.innerHTML = [
      '<section class="resume-hero">',
      '<div>',
      '<p class="resume-kicker">Camer / Security Research</p>',
      '<h2>网络安全与工程能力统计</h2>',
      '<p>专注研究网络安全、逆向分析、应急响应、代码编程、二进制研究。</p>',
      '</div>',
      '<div class="resume-metrics" id="about-skill-meta"></div>',
      '</section>',
      '<section class="resume-grid">',
      '<div class="resume-panel resume-panel-radar">',
      '<div class="resume-panel-head"><span>分类分布</span><small>Category Radar</small></div>',
      '<div class="skill-radar-wrap"><canvas id="about-category-radar" width="640" height="640"></canvas></div>',
      '</div>',
      '<div class="resume-panel">',
      '<div class="resume-panel-head"><span>标签条目</span><small>Tag Index</small></div>',
      '<div id="about-skill-bars" class="skill-bars"></div>',
      '</div>',
      '<div class="resume-panel">',
      '<div class="resume-panel-head"><span>分类占比</span><small>Category Mix</small></div>',
      '<div class="donut-wrap"><canvas id="about-category-donut" width="520" height="360"></canvas></div>',
      '</div>',
      '<div class="resume-panel">',
      '<div class="resume-panel-head"><span>月度趋势</span><small>Monthly Output</small></div>',
      '<div class="trend-wrap"><canvas id="about-month-trend" width="640" height="360"></canvas></div>',
      '</div>',
      '<div class="resume-panel resume-panel-wide">',
      '<div class="resume-panel-head"><span>写作活跃度</span><small>Last 365 Days</small></div>',
      '<div class="heatmap-wrap"><div id="about-article-heatmap" class="heatmap-grid"></div></div>',
      '<div class="heatmap-legend"><span>少</span><span class="heatmap-cell" data-level="0"></span><span class="heatmap-cell" data-level="1"></span><span class="heatmap-cell" data-level="2"></span><span class="heatmap-cell" data-level="3"></span><span class="heatmap-cell" data-level="4"></span><span>多</span></div>',
      '</div>',
      '</section>'
    ].join('')
  }

  function openModal() {
    createModal()
    document.getElementById('skill-profile-modal').classList.add('is-open')
    document.documentElement.classList.add('skill-profile-lock')
    loadData()
  }

  function closeModal() {
    var modal = document.getElementById('skill-profile-modal')
    if (!modal) return
    modal.classList.remove('is-open')
    document.documentElement.classList.remove('skill-profile-lock')
  }

  function loadData() {
    if (state.loaded) {
      render(state.data)
      return
    }

    fetch('/skill-profile.json', { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('Failed to load profile data')
        return response.json()
      })
      .then(function (data) {
        state.data = data
        state.loaded = true
        render(data)
      })
      .catch(function () {
        render({ totalPosts: 0, totalTags: 0, skills: [], heatmap: [] })
      })
  }

  function render(data) {
    renderMeta(data, 'skill-profile-meta')
    renderBars(data.skills || [], 'skill-bars')
    renderRadar((data.skills || []).slice(0, 8), 'skill-radar')
    renderHeatmap(data.heatmap || [], 'article-heatmap')
    renderAbout(data)
  }

  function renderAbout(data) {
    if (!document.getElementById('skill-profile-dashboard')) return
    renderMeta(data, 'about-skill-meta', true)
    renderBars(data.skills || [], 'about-skill-bars')
    renderRadar((data.categories || []).slice(0, 8), 'about-category-radar')
    renderDonut((data.categories || []).slice(0, 8), 'about-category-donut')
    renderTrend(data.months || [], 'about-month-trend')
    renderHeatmap(data.heatmap || [], 'about-article-heatmap')
  }

  function renderMeta(data, id, large) {
    var meta = document.getElementById(id)
    if (!meta) return
    if (large) {
      meta.innerHTML = [
        '<div class="resume-metric"><strong>' + (data.totalPosts || 0) + '</strong><span>文章</span></div>',
        '<div class="resume-metric"><strong>' + (data.totalTags || 0) + '</strong><span>标签能力</span></div>',
        '<div class="resume-metric"><strong>' + (data.totalCategories || 0) + '</strong><span>内容分类</span></div>'
      ].join('')
    } else {
      meta.innerHTML = [
        '<span class="skill-profile-pill">文章 ' + (data.totalPosts || 0) + '</span>',
        '<span class="skill-profile-pill">标签 ' + (data.totalTags || 0) + '</span>'
      ].join('')
    }
  }

  function renderBars(skills, id) {
    var root = document.getElementById(id)
    if (!root) return
    if (!skills.length) {
      root.innerHTML = '<div class="skill-profile-empty">暂无标签数据</div>'
      return
    }

    root.innerHTML = skills.map(function (skill) {
      return [
        '<div class="skill-bar-row">',
        '<span class="skill-bar-label" title="' + escapeHtml(skill.name) + '">' + escapeHtml(skill.name) + '</span>',
        '<span class="skill-bar-track"><span class="skill-bar-fill" style="width:' + skill.score + '%"></span></span>',
        '<span>' + skill.count + '</span>',
        '</div>'
      ].join('')
    }).join('')
  }

  function renderRadar(skills, id) {
    var canvas = document.getElementById(id)
    if (!canvas) return
    var ctx = canvas.getContext('2d')
    var width = canvas.width
    var height = canvas.height
    var center = width / 2
    var radius = width * .34

    ctx.clearRect(0, 0, width, height)
    if (!skills.length) {
      ctx.fillStyle = getTextColor(.7)
      ctx.font = '28px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('暂无标签数据', center, center)
      return
    }

    var count = Math.max(3, skills.length)
    var points = []

    ctx.strokeStyle = 'rgba(148, 163, 184, .34)'
    ctx.lineWidth = 2
    for (var ring = 1; ring <= 4; ring++) {
      drawPolygon(ctx, center, center, radius * ring / 4, count, 0, false)
    }

    for (var i = 0; i < count; i++) {
      var angle = -Math.PI / 2 + Math.PI * 2 * i / count
      var skill = skills[i] || { name: '', score: 0 }
      var pointRadius = radius * (skill.score || 0) / 100
      points.push({
        x: center + Math.cos(angle) * pointRadius,
        y: center + Math.sin(angle) * pointRadius
      })

      ctx.beginPath()
      ctx.moveTo(center, center)
      ctx.lineTo(center + Math.cos(angle) * radius, center + Math.sin(angle) * radius)
      ctx.stroke()

      if (skill.name) {
        ctx.fillStyle = getTextColor(.82)
        ctx.font = '24px sans-serif'
        ctx.textAlign = Math.cos(angle) > .2 ? 'left' : Math.cos(angle) < -.2 ? 'right' : 'center'
        ctx.textBaseline = Math.sin(angle) > .2 ? 'top' : Math.sin(angle) < -.2 ? 'bottom' : 'middle'
        ctx.fillText(skill.name, center + Math.cos(angle) * (radius + 34), center + Math.sin(angle) * (radius + 34))
      }
    }

    ctx.beginPath()
    points.forEach(function (point, index) {
      if (index === 0) ctx.moveTo(point.x, point.y)
      else ctx.lineTo(point.x, point.y)
    })
    ctx.closePath()
    ctx.fillStyle = 'rgba(14, 165, 233, .24)'
    ctx.strokeStyle = '#0ea5e9'
    ctx.lineWidth = 4
    ctx.fill()
    ctx.stroke()
  }

  function drawPolygon(ctx, x, y, radius, sides) {
    ctx.beginPath()
    for (var i = 0; i < sides; i++) {
      var angle = -Math.PI / 2 + Math.PI * 2 * i / sides
      var px = x + Math.cos(angle) * radius
      var py = y + Math.sin(angle) * radius
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.stroke()
  }

  function chartColors() {
    return ['#2dd4bf', '#38bdf8', '#22c55e', '#a78bfa', '#f59e0b', '#fb7185', '#14b8a6', '#60a5fa']
  }

  function renderDonut(items, id) {
    var canvas = document.getElementById(id)
    if (!canvas) return
    var ctx = canvas.getContext('2d')
    var width = canvas.width
    var height = canvas.height
    var centerX = width * .34
    var centerY = height / 2
    var radius = Math.min(width, height) * .28
    var colors = chartColors()
    var total = items.reduce(function (sum, item) {
      return sum + item.count
    }, 0)

    ctx.clearRect(0, 0, width, height)
    if (!total) {
      drawEmptyChart(ctx, width, height, '暂无分类数据')
      return
    }

    var start = -Math.PI / 2
    items.forEach(function (item, index) {
      var angle = Math.PI * 2 * item.count / total
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, start, start + angle)
      ctx.closePath()
      ctx.fillStyle = colors[index % colors.length]
      ctx.fill()
      start += angle
    })

    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius * .58, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'

    ctx.fillStyle = getTextColor(.92)
    ctx.font = '700 28px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(total, centerX, centerY - 8)
    ctx.fillStyle = getTextColor(.62)
    ctx.font = '18px sans-serif'
    ctx.fillText('篇', centerX, centerY + 22)

    ctx.textAlign = 'left'
    items.forEach(function (item, index) {
      var x = width * .64
      var y = 74 + index * 34
      ctx.fillStyle = colors[index % colors.length]
      ctx.fillRect(x, y - 10, 14, 14)
      ctx.fillStyle = getTextColor(.82)
      ctx.font = '18px sans-serif'
      ctx.fillText(item.name + ' ' + item.count, x + 24, y + 2)
    })
  }

  function renderTrend(items, id) {
    var canvas = document.getElementById(id)
    if (!canvas) return
    var ctx = canvas.getContext('2d')
    var width = canvas.width
    var height = canvas.height
    var data = items.slice(-12)
    var max = data.reduce(function (value, item) {
      return Math.max(value, item.count)
    }, 0)

    ctx.clearRect(0, 0, width, height)
    if (!max) {
      drawEmptyChart(ctx, width, height, '暂无月度数据')
      return
    }

    var padding = 48
    var chartWidth = width - padding * 2
    var chartHeight = height - padding * 1.8
    var gap = 12
    var barWidth = Math.max(12, (chartWidth - gap * (data.length - 1)) / Math.max(data.length, 1))

    ctx.strokeStyle = 'rgba(148, 163, 184, .18)'
    ctx.lineWidth = 1
    for (var line = 0; line <= 3; line++) {
      var yLine = padding + chartHeight * line / 3
      ctx.beginPath()
      ctx.moveTo(padding, yLine)
      ctx.lineTo(width - padding, yLine)
      ctx.stroke()
    }

    data.forEach(function (item, index) {
      var x = padding + index * (barWidth + gap)
      var barHeight = chartHeight * item.count / max
      var y = padding + chartHeight - barHeight
      var gradient = ctx.createLinearGradient(0, y, 0, padding + chartHeight)
      gradient.addColorStop(0, '#2dd4bf')
      gradient.addColorStop(1, '#2563eb')
      ctx.fillStyle = gradient
      roundRect(ctx, x, y, barWidth, barHeight, 5)
      ctx.fill()

      ctx.fillStyle = getTextColor(.62)
      ctx.font = '15px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(item.month.slice(5), x + barWidth / 2, height - 18)
    })
  }

  function roundRect(ctx, x, y, width, height, radius) {
    var r = Math.min(radius, width / 2, height / 2)
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + width - r, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + r)
    ctx.lineTo(x + width, y + height - r)
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
    ctx.lineTo(x + r, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  function drawEmptyChart(ctx, width, height, text) {
    ctx.fillStyle = getTextColor(.7)
    ctx.font = '24px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, width / 2, height / 2)
  }

  function renderHeatmap(items, id) {
    var root = document.getElementById(id)
    if (!root) return
    var counts = items.reduce(function (map, item) {
      map[item.date] = item.count
      return map
    }, {})
    var max = items.reduce(function (value, item) {
      return Math.max(value, item.count)
    }, 1)
    var end = new Date()
    var start = new Date(end)
    start.setDate(start.getDate() - 364)
    start = startOfWeek(start)

    var html = []
    for (var date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      var key = formatDate(date)
      var count = counts[key] || 0
      var level = count === 0 ? 0 : Math.max(1, Math.ceil(count / max * 4))
      html.push('<span class="heatmap-cell" data-level="' + level + '" title="' + key + '：' + count + ' 篇"></span>')
    }
    root.innerHTML = html.join('')
  }

  function startOfWeek(date) {
    var next = new Date(date)
    next.setDate(next.getDate() - next.getDay())
    next.setHours(0, 0, 0, 0)
    return next
  }

  function formatDate(date) {
    var month = String(date.getMonth() + 1).padStart(2, '0')
    var day = String(date.getDate()).padStart(2, '0')
    return date.getFullYear() + '-' + month + '-' + day
  }

  function getTextColor(alpha) {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark'
    return dark ? 'rgba(255, 255, 255, ' + alpha + ')' : 'rgba(31, 41, 55, ' + alpha + ')'
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char]
    })
  }

  function boot() {
    attachTrigger()
  }

  document.addEventListener('DOMContentLoaded', boot)
  document.addEventListener('pjax:complete', boot)
})()
