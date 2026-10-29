/** @type {import('./_venera_.js')} */
/**
 * 漫画Love —— 由 Cimoc 源 MHLove.java 转换
 * 原站：http://www.php06.com（图片在 http://www.9qv.cn）
 * 结构与「漫画160」同源，图片同样是 base64 + $qingtiandy$ 分隔。
 */
class MHLove extends ComicSource {
  name = "漫画Love"
  key = "mhlove"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/diandianmi77/cimoc-sources@main/mhlove.js"

  get baseUrl() {
    return "http://www.php06.com"
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

  search = {
    load: async (keyword, options, page) => {
      const url = `${this.baseUrl}/statics/search.aspx?key=${encodeURIComponent(keyword)}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const li of doc.querySelectorAll(".mh-search-result > ul > li")) {
        const a = li.querySelector(".mh-works-info > a")
        const h4 = li.querySelector("h4")
        const img = li.querySelector("img")
        const up = li.querySelector(".mh-up-time.fr")
        if (!a) continue
        comics.push(
          new Comic({
            id: a.attributes["href"],
            title: h4 ? h4.text.trim() : "",
            cover: img ? this.abs(img.attributes["src"]) : "",
            description: up ? up.text.replace("最后更新时间：", "") : "",
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

      const coverEl = doc.querySelector(".mh-date-bgpic > a > img")
      const introEl = doc.querySelector("#workint > p")
      const updateEl = doc.querySelector("div.mh-chapter-record > span > em")
      const authorEl = doc.querySelector("span.one > em")
      const infoSpans = doc.querySelectorAll("p.works-info-tc > span")
      const statusText = infoSpans[3] ? infoSpans[3].text : ""
      const finished =
        statusText.includes("完结") || statusText.includes("完結") || statusText.includes("Completed")

      const chapters = {}
      for (const a of doc.querySelectorAll("#mh-chapter-list-ol-0 > li > a")) {
        const href = a.attributes["href"]
        if (href) chapters[href] = a.text
      }

      return new ComicDetails({
        title: coverEl ? coverEl.attributes["title"] || "" : "",
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
      const res = await Network.get(this.abs(epId), this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const m = res.body.match(/qTcms_S_m_murl_e="(.*?)"/)
      if (!m) throw "未找到图片数据"
      const decoded = Convert.decodeUtf8(Convert.decodeBase64(m[1]))
      const parts = decoded.split("$qingtiandy$")
      const prefix = parts.length && parts[0].includes("http") ? "" : "http://www.9qv.cn"
      return { images: parts.filter(Boolean).map((p) => prefix + p) }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl } }
    },

    enableTagsTranslate: false,
  }
}
