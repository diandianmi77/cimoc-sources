/** @type {import('./_venera_.js')} */
/**
 * 腾讯动漫 —— 由 Cimoc 源 Tencent.java 转换
 * 站点：https://m.ac.qq.com
 * 章节页的图片数据被「nonce 里记录的删除位点」处理过，需要按记录反向剪除后再 base64 解码。
 */
class Tencent extends ComicSource {
  name = "腾讯动漫"
  key = "tencent"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/venera-app/cimoc-sources@main/tencent.js"

  get baseUrl() {
    return "https://m.ac.qq.com"
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
    if (url.startsWith("//")) return "https:" + url
    if (url.startsWith("/")) return this.baseUrl + url
    return this.baseUrl + "/" + url
  }

  // 执行 nonce 脚本得到指令串
  evalNonce(code) {
    const cleaned = String(code).trim().replace(/;\s*$/, "")
    try {
      return String(new Function("return (" + cleaned + ")")())
    } catch (e) {
      try {
        return String(new Function(code + "\n;return typeof result !== 'undefined' ? result : '';")())
      } catch (e2) {
        return ""
      }
    }
  }

  decodeData(str, nonce) {
    const body = this.evalNonce(nonce)
    const matches = body.match(/\d+[a-zA-Z]+/g) || []
    for (let k = matches.length - 1; k >= 0; k--) {
      const item = matches[k]
      const num = parseInt((item.match(/^\d+/) || ["0"])[0])
      const len = item.replace(/\d+/g, "").length
      const from = num & 255
      str = str.substring(0, from) + str.substring(from + len)
    }
    return str
  }

  search = {
    load: async (keyword, options, page) => {
      const url = `${this.baseUrl}/search/result?word=${encodeURIComponent(keyword)}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const div of doc.querySelectorAll(".comic-item")) {
        const a = div.querySelector("a")
        if (!a) continue
        const href = a.attributes["href"] || ""
        const cid = href.replace("/comic/index/id/", "")
        const title = div.querySelector(".comic-title")
        const cover = div.querySelector(".cover-image")
        const update = div.querySelector(".comic-update")
        comics.push(
          new Comic({
            id: cid,
            title: title ? title.text : "",
            cover: cover ? this.abs(cover.attributes["src"]) : "",
            description: update ? update.text : "",
          })
        )
      }
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(`${this.baseUrl}/comic/index/id/${id}`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const titleEl = doc.querySelector("div.head-title-tags > h1")
      const coverEl = doc.querySelector("div.head-banner > img")
      const authorEl = doc.querySelector("li.author-wr")
      const introEl = doc.querySelector("div.head-info-desc")

      const chapters = {}
      const list = []
      for (const a of doc.querySelectorAll("ul.chapter-list > li.chapter-item > a")) {
        const href = a.attributes["href"] || ""
        const idx = href.indexOf(`/chapter/index/id/${id}/cid/`)
        const path = idx >= 0 ? href.substring(idx + `/chapter/index/id/${id}/cid/`.length) : href
        const n = (a.text || "").replace(/[^0-9]/g, "")
        list.push([path, n ? `第${n}话` : a.text])
      }
      list.reverse()
      for (const [k, v] of list) chapters[k] = v

      return new ComicDetails({
        title: titleEl ? titleEl.text : "",
        cover: coverEl ? this.abs(coverEl.attributes["src"]) : "",
        description: introEl ? introEl.text : "",
        tags: { "作者": authorEl ? [authorEl.text] : [] },
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const url = `${this.baseUrl}/chapter/index/id/${comicId}/cid/${epId}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const html = res.body

      const dataM = html.match(/data:\s*'(.*)?',/)
      const nonceM = html.match(/<script>window.*?=(.*?)<\/script>/)
      if (!dataM || !nonceM) throw "未找到图片数据"

      const cleaned = this.decodeData(dataM[1], nonceM[1])
      const jsonStr = Convert.decodeUtf8(Convert.decodeBase64(cleaned))
      const obj = JSON.parse(jsonStr)
      return { images: (obj.picture || []).map((it) => it.url) }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl + "/" } }
    },

    enableTagsTranslate: false,
  }
}
