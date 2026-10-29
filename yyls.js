/** @type {import('./_venera_.js')} */
/**
 * YYLS（8comic）—— 由 Cimoc 源 YYLS.java 转换
 * 原站：http://8comic.se（探测已无 DNS，源保留待站点恢复）
 * 图片按「共 N 頁」拼 001.jpg、002.jpg …
 */
class YYLS extends ComicSource {
  name = "YYLS"
  key = "yyls"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/diandianmi77/cimoc-sources@main/yyls.js"

  get baseUrl() {
    return "http://8comic.se"
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
      "Referer": this.baseUrl + "/",
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
      const url = `${this.baseUrl}/%e6%90%9c%e5%b0%8b%e7%b5%90%e6%9e%9c/?w=${encodeURIComponent(keyword)}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const li of doc.querySelectorAll("#content #dp-widget-posts-2 > ul > li")) {
        const a = li.querySelector("a")
        if (!a) continue
        comics.push(
          new Comic({
            id: a.attributes["href"],
            title: a.text,
            cover: "",
          })
        )
      }
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  category = {
    title: this.name,
    parts: [
      {
        name: "分类",
        type: "fixed",
        categories: ["完结漫画", "连载漫画", "冒险", "格斗", "科幻", "竞技", "侦探", "恐怖", "搞笑", "校园", "魔幻", "魔法", "少女", "少男", "其他"],
        categoryParams: ["經典完結", "漫畫連載", "冒險", "格鬥", "科幻", "競技", "偵探", "恐怖", "搞笑", "校園", "魔幻", "魔法", "少女", "少男", "其他"],
        itemType: "category",
      },
    ],
    enableRankingPage: false,
  }

  categoryComics = {
    load: async (category, param, options, page) => {
      const url = `${this.baseUrl}/category/漫畫分類/${encodeURIComponent(param)}/page/${page}/`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)
      const comics = []
      for (const div of doc.querySelectorAll(".nag.cf > div")) {
        const a = div.querySelector(".thumb > a")
        if (!a) continue
        const href = a.attributes["href"] || ""
        const m = href.match(/http:\/\/8comic\.se(\/\d+)\//)
        const img = div.querySelector(".thumb > a img")
        comics.push(
          new Comic({
            id: m ? m[1] : href,
            title: a.attributes["title"] || a.text,
            cover: img ? this.abs(img.attributes["src"]) : "",
          })
        )
      }
      return { comics, maxPage: null }
    },
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(`${this.baseUrl}${id}`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const titleEl = doc.querySelector("#main > div > div.entry-header.cf > div > h1")
      const coverEl = doc.querySelector(
        "#details > div.entry-content.rich-content > table > tbody > tr:nth-child(1) > td:nth-child(1) > img"
      )
      const introEl = doc.querySelector(
        "#details > div.entry-content.rich-content > table > tbody > tr:nth-child(1) > td:nth-child(2) > p"
      )
      const links = doc.querySelectorAll("div.entry-content.rich-content a")
      const updateEl = links.length ? links[links.length - 1] : null
      const finished = res.body.includes("經典完結")

      const chapters = {}
      const list = []
      for (const a of links) {
        const href = a.attributes["href"] || ""
        const path = href.substring(17, href.length - 1)
        if (path) list.push([path, a.text])
      }
      list.reverse()
      for (const [k, v] of list) chapters[k] = v

      return new ComicDetails({
        title: titleEl ? titleEl.text : "",
        cover: coverEl ? this.abs(coverEl.attributes["src"]) : "",
        description: introEl ? introEl.text : "",
        tags: { "状态": [finished ? "已完结" : "连载中"] },
        updateTime: updateEl ? updateEl.text.trim() : "",
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const url = `${this.baseUrl}/${epId}`
      const res = await Network.get(url, { ...this.headers, "Referer": `${this.baseUrl}${comicId}` })
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const html = res.body

      const pm = html.match(/id=.*?caonima.*?src="(.*?)\d{3}\.jpg/)
      const nm = html.match(/共([\d]*?)頁/)
      if (!pm || !nm) throw "未找到图片数据"
      const total = parseInt(nm[1])
      const images = []
      for (let i = 1; i <= total; i++) {
        images.push(`${pm[1]}//${String(i).padStart(3, "0")}.jpg`)
      }
      return { images }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl + "/" } }
    },

    enableTagsTranslate: false,
  }
}
