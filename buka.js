/** @type {import('./_venera_.js')} */
/**
 * 布卡漫画 —— 由 Cimoc 源 BuKa.java 转换
 * 原站：http://m.buka.cn（搜索为 JSON 接口）
 */
class BuKa extends ComicSource {
  name = "布卡漫画"
  key = "buka"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/diandianmi77/cimoc-sources@main/buka.js"

  get baseUrl() {
    return "http://m.buka.cn"
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 7.0;) Chrome/58.0.3029.110 Mobile",
      "Referer": this.baseUrl,
    }
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
        `${this.baseUrl}/search/ajax_search`,
        {
          ...this.headers,
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
        `key=${encodeURIComponent(keyword)}&start=${15 * (page - 1)}&count=15`
      )
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const data = JSON.parse(res.body)
      const items = (data.datas && data.datas.items) || []
      const comics = items.map(
        (it) =>
          new Comic({
            id: String(it.mid),
            title: it.name,
            cover: it.logo,
            subTitle: it.author,
          })
      )
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(`${this.baseUrl}/m/${id}`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const titleEl = doc.querySelector("p.mangadir-glass-name")
      const coverEl = doc.querySelector(".mangadir-glass-img > img")
      const updateEl = doc.querySelector("span.top-title-right")
      const authorEl = doc.querySelector(".mangadir-glass-author")
      const introEl = doc.querySelector("span.description_intro")

      const chapters = {}
      for (const a of doc.querySelectorAll("div.chapter-center > a")) {
        const href = a.attributes["href"] || ""
        const parts = href.split("/")
        const path = parts.length > 3 ? parts[3] : ""
        if (path) chapters[path] = a.text
      }

      return new ComicDetails({
        title: titleEl ? titleEl.text : "",
        cover: coverEl ? this.abs(coverEl.attributes["src"]) : "",
        description: introEl ? introEl.text : "",
        tags: { "作者": authorEl ? [authorEl.text] : [] },
        updateTime: updateEl ? updateEl.text : "",
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const url = `${this.baseUrl}/read/${comicId}/${epId}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const images = []
      const re = /<img class="lazy" data-original="(http.*?jpg)" \/>/g
      let m
      while ((m = re.exec(res.body)) !== null) images.push(m[1])
      return { images }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl } }
    },

    enableTagsTranslate: false,
  }
}
