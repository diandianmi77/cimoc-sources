/** @type {import('./_venera_.js')} */
/**
 * 997700（hhxxee）—— 由 Cimoc 源 Hhxxee.java 转换
 * 原站：http://99770.hhxxee.com（图片走 20.125084.com 的多台分服）
 */
class HHxxee extends ComicSource {
  name = "997700"
  key = "hhxxee"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/venera-app/cimoc-sources@main/hhxxee.js"

  get baseUrl() {
    return "http://99770.hhxxee.com"
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
      "Referer": this.baseUrl,
    }
  }

  // 16 台图片分服
  get servers() {
    const arr = []
    for (let i = 1; i <= 16; i++) {
      arr.push(`http://20.125084.com/dm${String(i).padStart(2, "0")}/`)
    }
    return arr
  }

  abs(url) {
    if (!url) return ""
    if (/^https?:\/\//.test(url)) return url
    if (url.startsWith("//")) return "http:" + url
    if (url.startsWith("/")) return this.baseUrl + url
    return this.baseUrl + "/" + url
  }

  search = {
    load: async (keyword, options, page) => {
      const res = await Network.post(
        `${this.baseUrl}/search/s.aspx`,
        {
          ...this.headers,
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
        `tbSTxt=${encodeURIComponent(keyword)}`
      )
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const div of doc.querySelectorAll(".cInfoItem")) {
        const a = div.querySelector(".cListTitle > a")
        const titleEl = div.querySelector(".cListTitle > span")
        const img = div.querySelector(".cListSlt > img")
        const updateEl = div.querySelector(".cListh2 > span")
        const authorEl = div.querySelector(".cl1_2")
        if (!a) continue
        const href = a.attributes["href"] || ""
        const cid = href.replace(`${this.baseUrl}/comic/`, "")
        let title = titleEl ? titleEl.text : ""
        title = title.replace(/^\[|\]$/g, "")
        comics.push(
          new Comic({
            id: cid,
            title,
            cover: img ? this.abs(img.attributes["src"]) : "",
            subTitle: authorEl ? authorEl.text.slice(3) : "",
            description: updateEl ? updateEl.text.slice(8) : "",
          })
        )
      }
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(`${this.baseUrl}/comic/${id}`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const titleEl = doc.querySelector(".cTitle")
      const coverEl = doc.querySelector(".cDefaultImg > img")
      const introEl = doc.querySelector(".cCon")
      const rows = doc.querySelectorAll(".cInfoTxt tr")
      const updateRow = rows[4] ? rows[4].querySelector("td:last-child") : null
      const authorRow = rows[1] ? rows[1].querySelector("td:last-child") : null
      let update = updateRow ? updateRow.text.trim() : ""
      const idx = update.indexOf("更新時間:")
      if (idx >= 0) update = update.slice(idx + "更新時間:".length)

      const chapters = {}
      for (const div of doc.querySelectorAll(".cVolList > div")) {
        const a = div.querySelector("a")
        if (!a) continue
        const href = a.attributes["href"] || ""
        const parts = href.split("/")
        const path = parts.length > 2 ? parts[2] : ""
        if (path) chapters[path] = a.text
      }

      return new ComicDetails({
        title: titleEl ? titleEl.text : "",
        cover: coverEl ? this.abs(coverEl.attributes["src"]) : "",
        description: introEl ? introEl.text : "",
        tags: { "作者": authorRow ? [authorRow.text.trim()] : [] },
        updateTime: update,
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const res = await Network.get(`${this.baseUrl}/comic/${comicId}/${epId}/`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const m = res.body.match(/var sFiles="(.*?)"/)
      if (!m) throw "未找到图片数据"
      const servers = this.servers
      const images = []
      for (const item of m[1].split("|")) {
        const idx = item.match(/ok-comic(\d+)/)
        const server = idx ? servers[parseInt(idx[1]) - 1] : servers[0]
        images.push((server || servers[0]) + item)
      }
      return { images }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl } }
    },

    enableTagsTranslate: false,
  }
}
