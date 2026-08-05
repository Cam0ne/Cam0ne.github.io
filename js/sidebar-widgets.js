(function () {
  'use strict'

  var fallbackHitokoto = '保持好奇，保持清醒。'
  var weekNames = ['日', '一', '二', '三', '四', '五', '六']

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char]
    })
  }

  function pad(value) {
    return String(value).padStart(2, '0')
  }

  function formatMonthLabel(date) {
    return date.getFullYear() + ' 年 ' + pad(date.getMonth() + 1) + ' 月'
  }

  function buildCalendar(days) {
    var map = days.reduce(function (result, item) {
      result[item.date] = item.count
      return result
    }, {})

    var dates = days.map(function (item) {
      return item.date
    }).sort()
    var baseDate = dates.length ? new Date(dates[dates.length - 1] + 'T00:00:00') : new Date()
    var year = baseDate.getFullYear()
    var month = baseDate.getMonth()
    var first = new Date(year, month, 1)
    var last = new Date(year, month + 1, 0)
    var html = '<div class="cam-calendar-head">'
      + '<span>' + formatMonthLabel(first) + '</span>'
      + '<span>' + days.length + ' 天有更新</span>'
      + '</div>'
      + '<div class="cam-calendar-week">'
      + weekNames.map(function (name) { return '<span>' + name + '</span>' }).join('')
      + '</div><div class="cam-calendar-grid">'

    for (var empty = 0; empty < first.getDay(); empty += 1) {
      html += '<span class="cam-calendar-day is-empty"></span>'
    }

    for (var day = 1; day <= last.getDate(); day += 1) {
      var dateKey = year + '-' + pad(month + 1) + '-' + pad(day)
      var count = map[dateKey] || 0
      var cls = count ? 'cam-calendar-day has-posts' : 'cam-calendar-day'
      var title = count ? dateKey + ' 发布 ' + count + ' 篇' : dateKey
      html += '<span class="' + cls + '" title="' + title + '" data-count="' + count + '">' + day + '</span>'
    }

    return html + '</div>'
  }

  function createCard(className, icon, title, body) {
    var card = document.createElement('div')
    card.className = 'card-widget ' + className
    card.innerHTML = '<div class="item-headline"><i class="' + icon + '"></i><span>' + title + '</span></div>' + body
    return card
  }

  function insertCards() {
    var aside = document.getElementById('aside-content')
    var layout = document.getElementById('content-inner')
    if (!aside || !layout) return

    layout.classList.add('cam-three-column')

    if (document.getElementById('cam-calendar-card')) return

    var rightColumn = document.getElementById('cam-right-widgets')
    if (!rightColumn) {
      rightColumn = document.createElement('aside')
      rightColumn.id = 'cam-right-widgets'
      rightColumn.className = 'cam-right-widgets aside-content'
      layout.appendChild(rightColumn)
    }

    var calendarCard = createCard(
      'card-cam-calendar',
      'far fa-calendar-alt',
      '博客文章日历',
      '<div id="cam-calendar-card" class="cam-calendar-widget"><div class="cam-widget-loading">日历加载中...</div></div>'
    )

    var quoteCard = createCard(
      'card-cam-hitokoto',
      'fas fa-quote-left',
      '每日一言',
      '<div class="cam-hitokoto-widget">'
      + '<p id="cam-hitokoto-text">' + fallbackHitokoto + '</p>'
      + '<div id="cam-hitokoto-from" class="cam-hitokoto-from">Hitokoto</div>'
      + '</div>'
    )

    var webinfoCard = aside.querySelector('.card-webinfo')

    rightColumn.appendChild(calendarCard)
    rightColumn.appendChild(quoteCard)
    if (webinfoCard) rightColumn.appendChild(webinfoCard)
  }

  function renderCalendar(data) {
    var root = document.getElementById('cam-calendar-card')
    if (!root) return

    var days = Array.isArray(data && data.calendar) ? data.calendar : []
    root.innerHTML = buildCalendar(days)
  }

  function loadCalendar() {
    var root = document.getElementById('cam-calendar-card')
    if (!root || root.getAttribute('data-static') === 'true') return

    fetch('/learning-widgets.json', { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('Failed to load calendar')
        return response.json()
      })
      .then(renderCalendar)
      .catch(function () {
        renderCalendar({ calendar: [] })
      })
  }

  function loadHitokoto() {
    fetch('https://v1.hitokoto.cn', { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('Failed to load hitokoto')
        return response.json()
      })
      .then(function (data) {
        var text = document.getElementById('cam-hitokoto-text')
        var from = document.getElementById('cam-hitokoto-from')
        if (!text || !from) return

        text.innerHTML = escapeHtml(data.hitokoto || fallbackHitokoto)
        from.innerHTML = escapeHtml(data.from ? '《' + data.from + '》' : 'Hitokoto')
      })
      .catch(function () {
        var text = document.getElementById('cam-hitokoto-text')
        var from = document.getElementById('cam-hitokoto-from')
        if (text) text.textContent = fallbackHitokoto
        if (from) from.textContent = '本地备用'
      })
  }

  function init() {
    insertCards()
    loadCalendar()
    loadHitokoto()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }

  document.addEventListener('pjax:complete', init)
})()
