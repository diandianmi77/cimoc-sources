/** @type {import('./_venera_.js')} */
/**
 * 百年漫画 —— 由 Cimoc 源 BaiNian.java 转换
 * 原站：https://m.bnmanhua.com
 */
class BaiNian extends ComicSource {
  name = "百年漫画"
  key = "bai_nian"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/venera-app/cimoc-sources@main/bai_nian.js"

  get baseUrl() {
    return "https://m.bnmanhua.com"
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
      "Referer": this.baseUrl + "/",
    }
  }

  // 相对地址补全
  abs(url) {
    if (!url) return ""
    if (/^https?:\/\//.test(url)) return url
    if (url.startsWith("//")) return "https:" + url
    if (url.startsWith("/")) return this.baseUrl + url
    return this.baseUrl + "/" + url
  }

  // li.vbox -> Comic
  parseComic(el) {
    const a = el.querySelector("a.vbox_t")
    if (!a) return null
    const img = a.querySelector("mip-img")
    return new Comic({
      id: a.attributes["href"],
      title: a.attributes["title"] || a.text,
      cover: img ? this.abs(img.attributes["src"]) : "",
    })
  }

  /// 搜索（原站只支持第 1 页）
  search = {
    load: async (keyword, options, page) => {
      const res = await Network.post(
        `${this.baseUrl}/index.php/search.html`,
        {
          ...this.headers,
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
        `keyword=${encodeURIComponent(keyword)}`
      )
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)
      const comics = []
      for (const el of doc.querySelectorAll("ul.tbox_m > li.vbox")) {
        const c = this.parseComic(el)
        if (c) comics.push(c)
      }
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  /// 详情 + 章节
  comic = {
    loadInfo: async (id) => {
      const url = this.abs(id)
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const titleEl = doc.querySelector("div.dbox > div.data > h4")
      const coverEl = doc.querySelector("div.dbox > div.img > mip-img")
      const introEl = doc.querySelector("div.tbox_js")
      const dirEl = doc.querySelector("div.dbox > div.data > p.dir")
      const actEl = doc.querySelector("div.dbox > div.data > p.act")
      const statusEl = doc.querySelector("span.list_item")

      const author = dirEl ? dirEl.text.slice(3).trim() : ""
      const update = actEl ? actEl.text.slice(3, 13).trim() : ""
      const statusText = statusEl ? statusEl.text : ""
      const finished =
        statusText.includes("完结") || statusText.includes("完結") || statusText.includes("Completed")

      const chapters = {}
      for (const a of doc.querySelectorAll("div.tabs_block > ul > li > a")) {
        const href = a.attributes["href"]
        if (href) chapters[href] = a.text
      }

      return new ComicDetails({
        title: titleEl ? titleEl.text : "",
        cover: coverEl ? this.abs(coverEl.attributes["src"]) : "",
        description: introEl ? introEl.text : "",
        tags: {
          "作者": author ? [author] : [],
          "状态": [finished ? "已完结" : "连载中", update].filter(Boolean),
        },
        updateTime: update,
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const url = this.abs(epId)
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const html = res.body

      const hostMatch = html.match(/src="(.*?)\/upload/)
      const listMatch = html.match(/z_img='\[(.*?)\]'/)
      const images = []
      if (hostMatch && listMatch) {
        const host = hostMatch[1]
        for (const raw of listMatch[1].split(",")) {
          const path = raw.replace(/"/g, "").replace(/\\/g, "").trim()
          if (path) images.push(host + "/" + path)
        }
      }
      return { images }
    },

    onImageLoad: (url) => {
      return { headers: this.headers }
    },

    enableTagsTranslate: false,
  }
}
