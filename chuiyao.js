/** @type {import('./_venera_.js')} */
/**
 * 吹妖漫画 —— 由 Cimoc 源 Chuiyao.java 转换
 * 原站：http://m.chuiyao.com（探测已无 DNS，源保留待站点恢复）
 */
class Chuiyao extends ComicSource {
  name = "吹妖漫画"
  key = "chuiyao"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/diandianmi77/cimoc-sources@main/chuiyao.js"

  get baseUrl() {
    return "http://m.chuiyao.com"
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
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

  // 列表项解析（搜索与分类共用）
  parseItems(doc) {
    const comics = []
    for (const a of doc.querySelectorAll("li > a")) {
      const href = a.attributes["href"] || ""
      const parts = href.split("/")
      const cid = parts.length > 1 ? parts[1] : ""
      const h3 = a.querySelector("h3")
      const img = a.querySelector("div > img")
      if (!cid) continue
      comics.push(
        new Comic({
          id: cid,
          title: h3 ? h3.text : "",
          cover: img ? this.abs(img.attributes["data-src"] || img.attributes["src"]) : "",
        })
      )
    }
    return comics
  }

  search = {
    load: async (keyword, options, page) => {
      const url = `${this.baseUrl}/search/?page=${page}&ajax=1&key=${encodeURIComponent(keyword)}&act=search&order=1`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)
      return { comics: this.parseItems(doc), maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  category = {
    title: this.name,
    parts: [
      {
        name: "题材",
        type: "fixed",
        categories: ["全部", "最近更新", "少年热血", "武侠格斗", "科幻魔幻", "竞技体育", "爆笑喜剧", "侦探推理", "恐怖灵异", "少女爱情", "恋爱生活"],
        categoryParams: ["", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
        itemType: "category",
      },
    ],
    enableRankingPage: false,
  }

  categoryComics = {
    load: async (category, param, options, page) => {
      const url = `${this.baseUrl}/act/?act=list&page=${page}&catid=${param}&ajax=1&order=3`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)
      return { comics: this.parseItems(doc), maxPage: null }
    },
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(`${this.baseUrl}/manhua/${id}`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const titleEl = doc.querySelector("div.main-bar > h1")
      const coverEl = doc.querySelector("div.book-detail > div.cont-list > div.thumb > img")
      const dls = doc.querySelectorAll("div.book-detail > div.cont-list > dl")
      const updateEl = dls[2] ? dls[2].querySelector("dd") : null
      const authorEl = dls[3] ? dls[3].querySelector("dd") : null
      const introEl = doc.querySelector("#bookIntro")
      const statusEl = doc.querySelector("div.book-detail > div.cont-list > div.thumb > i")
      const statusText = statusEl ? statusEl.text : ""
      const finished =
        statusText.includes("完结") || statusText.includes("完結") || statusText.includes("Completed")

      const chapters = {}
      for (const a of doc.querySelectorAll("#chapterList > ul > li > a")) {
        const href = a.attributes["href"] || ""
        const parts = href.split("/")
        const path = parts.length > 2 ? parts[2] : ""
        if (path) chapters[path] = a.attributes["title"] || a.text
      }

      return new ComicDetails({
        title: titleEl ? titleEl.text : "",
        cover: coverEl ? this.abs(coverEl.attributes["src"]) : "",
        description: introEl ? introEl.text : "",
        tags: {
          "作者": authorEl ? [authorEl.text] : [],
          "状态": [finished ? "已完结" : "连载中"],
        },
        updateTime: updateEl ? updateEl.text : "",
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const res = await Network.get(`${this.baseUrl}/manhua/${comicId}/${epId}.html`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const m = res.body.match(/parseJSON\('(.*?)'\)/)
      if (!m) throw "未找到图片数据"
      return { images: JSON.parse(m[1]) }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl } }
    },

    enableTagsTranslate: false,
  }
}
