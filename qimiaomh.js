/** @type {import('./_venera_.js')} */
/**
 * 奇妙漫画 —— 由 Cimoc 源 QiMiaoMH.java 转换
 * 原站：https://www.qimiaomh.com
 */
class QiMiaoMH extends ComicSource {
  name = "奇妙漫画"
  key = "qimiaomh"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/diandianmi77/cimoc-sources@main/qimiaomh.js"

  get baseUrl() {
    return "https://www.qimiaomh.com"
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
    if (url.startsWith("//")) return "https:" + url
    if (url.startsWith("/")) return this.baseUrl + url
    return this.baseUrl + "/" + url
  }

  search = {
    load: async (keyword, options, page) => {
      const url = `${this.baseUrl}/action/Search?keyword=${encodeURIComponent(keyword)}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const div of doc.querySelectorAll(".mt20 > .classification")) {
        const a = div.querySelector("h2 > a")
        const img = div.querySelector("a > img")
        if (!a) continue
        comics.push(
          new Comic({
            id: a.attributes["href"],
            title: a.text,
            cover: img ? this.abs(img.attributes["data-src"] || img.attributes["src"]) : "",
          })
        )
      }
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(this.abs(id), this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const coverLink = doc.querySelector(".ctdbLeft > a")
      const coverImg = doc.querySelector(".ctdbLeft > a > img")
      const introEl = doc.querySelector("#worksDesc")
      const authorEl = doc.querySelector(".detailBox > .author")
      const updateEl = doc.querySelector(".updeteStatus > .date")
      const statusEl = doc.querySelector("a.status")
      const statusText = statusEl ? statusEl.text : ""
      const finished =
        statusText.includes("完结") || statusText.includes("完結") || statusText.includes("Completed")

      const chapters = {}
      for (const ul of doc.querySelectorAll(".comic-content-list > ul.comic-content-c")) {
        const a = ul.querySelector("li.cimg > a")
        if (!a) continue
        const href = a.attributes["href"]
        if (href) chapters[href] = a.attributes["title"] || a.text
      }

      const cover = coverImg
        ? coverImg.attributes["src"]
        : coverLink
        ? coverLink.attributes["title"]
        : ""

      return new ComicDetails({
        title: coverLink ? coverLink.attributes["title"] || "" : "",
        cover: this.abs(cover),
        description: introEl ? introEl.text.trim() : "",
        tags: {
          "作者": authorEl ? [authorEl.text.replace("作者", "").trim()] : [],
          "状态": [finished ? "已完结" : "连载中"],
        },
        updateTime: updateEl ? updateEl.text.replace("更新：", "").trim() : "",
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const res = await Network.get(this.abs(epId), this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const html = res.body
      const didM = html.match(/var did =(.*?);/)
      const sidM = html.match(/var sid =(.*?);/)
      if (!didM || !sidM) throw "未找到图片参数"
      const did = didM[1].trim()
      const sid = sidM[1].trim()
      const api = `${this.baseUrl}/Action/Play/AjaxLoadImgUrl?did=${did}&sid=${sid}&tmp=${Math.random()}`
      const r = await Network.get(api, this.headers)
      if (r.status !== 200) throw `Invalid status code: ${r.status}`
      const json = JSON.parse(r.body)
      return { images: json.listImg || [] }
    },

    onImageLoad: (url) => {
      return { headers: this.headers }
    },

    enableTagsTranslate: false,
  }
}
