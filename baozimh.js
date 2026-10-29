/** @type {import('./_venera_.js')} */
/**
 * 包子漫画
 *
 * 站点：https://cn.webmota.com（备用镜像见下方 mirrorDomains）
 *   搜索 GET /search?q=关键字
 *   详情 GET /comic/{id}
 *   章节图片取自 App 版阅读页：
 *     https://appcn.baozimh.com/baozimhapp/comic/chapter/{comicId}/0_{章节序号}.html
 *   该页面直接给出图片地址（.comic-contain__item 的 data-src），无需解密。
 */
class Baozi extends ComicSource {
  name = "包子漫画"
  key = "baozimh"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/diandianmi77/cimoc-sources@main/baozimh.js"

  get mirrorDomains() {
    return ["cn.webmota.com", "cn.bzmgcn.com", "cn.baozimhcn.com", "cn.twmanga.com"]
  }

  get appBase() {
    return "https://appcn.baozimh.com"
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "Referer": this.baseUrl + "/",
    }
  }

  // 依次尝试镜像，成功后缓存
  get baseUrl() {
    if (this._base) return this._base
    return "https://" + this.mirrorDomains[0]
  }

  async resolveBase() {
    if (this._base) return this._base
    for (const host of this.mirrorDomains) {
      try {
        const res = await Network.get("https://" + host + "/", {
          ...this.headers,
          "Referer": "https://" + host + "/",
        })
        if (res.status === 200 && res.body.includes("包子")) {
          this._base = "https://" + host
          return this._base
        }
      } catch (e) {}
    }
    this._base = "https://" + this.mirrorDomains[0]
    return this._base
  }

  abs(url) {
    if (!url) return ""
    if (/^https?:\/\//.test(url)) return url
    if (url.startsWith("//")) return "https:" + url
    if (url.startsWith("/")) return this.baseUrl + url
    return this.baseUrl + "/" + url
  }

  parseCard(el) {
    const a = el.querySelector("a")
    if (!a) return null
    const href = a.attributes["href"] || ""
    const id = href.split("/").pop()
    const titleEl = el.querySelector("h3")
    const img = el.querySelector("amp-img")
    const descEl = el.querySelector("small")
    return new Comic({
      id: id,
      title: titleEl ? titleEl.text : a.attributes["title"] || "",
      cover: img ? this.abs(img.attributes["src"]) : "",
      description: descEl ? descEl.text : "",
    })
  }

  search = {
    load: async (keyword, options, page) => {
      if (page > 1) return { comics: [], maxPage: 1 }
      const base = await this.resolveBase()
      const url = `${base}/search?q=${encodeURIComponent(keyword)}`
      const res = await Network.get(url, { ...this.headers, "Referer": base + "/" })
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)
      const comics = []
      for (const card of doc.querySelectorAll("div.comics-card")) {
        const c = this.parseCard(card)
        if (c && c.id) comics.push(c)
      }
      return { comics, maxPage: 1 }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const base = await this.resolveBase()
      const res = await Network.get(`${base}/comic/${id}`, { ...this.headers, "Referer": base + "/" })
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const titleEl = doc.querySelector("h1.comics-detail__title")
      const authorEl = doc.querySelector("h2.comics-detail__author")
      const descEl = doc.querySelector("p.comics-detail__desc")
      const tagEls = doc.querySelectorAll("div.tag-list span")
      const coverEl = doc.querySelector("div.comics-detail__poster amp-img") || doc.querySelector("amp-img")

      const tags = tagEls.map((t) => t.text.trim()).filter(Boolean)

      // 章节：key 为章节序号（接口按序号取图），value 为章节名
      const chapters = {}
      let i = 0
      for (const a of doc.querySelectorAll("#chapter-items .comics-chapters a")) {
        const nameEl = a.querySelector("span")
        chapters[String(i)] = nameEl ? nameEl.text.trim() : `第 ${i + 1} 话`
        i++
      }
      for (const a of doc.querySelectorAll("#chapters_other_list .comics-chapters a")) {
        const nameEl = a.querySelector("span")
        chapters[String(i)] = nameEl ? nameEl.text.trim() : `第 ${i + 1} 话`
        i++
      }

      if (Object.keys(chapters).length === 0) {
        throw "该作品在站点未提供章节列表（可能为版权受限作品）"
      }

      return new ComicDetails({
        title: titleEl ? titleEl.text : id,
        cover: coverEl ? this.abs(coverEl.attributes["src"]) : "",
        description: descEl ? descEl.text : "",
        tags: {
          "作者": authorEl ? [authorEl.text] : [],
          "标签": tags,
        },
        chapters: chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const url = `${this.appBase}/baozimhapp/comic/chapter/${comicId}/0_${epId}.html`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const images = []
      for (const node of doc.querySelectorAll(".comic-contain > .chapter-img")) {
        const img = node.querySelector(".comic-contain__item")
        const src = img ? img.attributes["data-src"] || img.attributes["src"] : ""
        if (src && !src.includes("pixel.gif")) images.push(src)
      }
      if (!images.length) throw "未能解析章节图片"
      return { images }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": "https://cn.webmota.com/" } }
    },

    enableTagsTranslate: false,
  }
}
