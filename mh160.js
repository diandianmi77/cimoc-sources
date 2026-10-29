/** @type {import('./_venera_.js')} */
/**
 * 漫画160 —— 由 Cimoc 源 MH160.java 转换
 * 原站：https://www.mh160.xyz
 */
class MH160 extends ComicSource {
  name = "漫画160"
  key = "mh160"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/diandianmi77/cimoc-sources@main/mh160.js"

  get baseUrl() {
    return "https://www.mh160.xyz"
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.106 Safari/537.36",
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
      const url = `${this.baseUrl}/statics/search.aspx?key=${encodeURIComponent(keyword)}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const li of doc.querySelectorAll(".mh-search-result > ul > li")) {
        const a = li.querySelector(".mh-works-info > a")
        const img = li.querySelector("img")
        const h4 = li.querySelector("h4")
        const up = li.querySelector(".mh-up-time.fr")
        if (!a) continue
        comics.push(
          new Comic({
            id: a.attributes["href"],
            title: h4 ? h4.text.trim() : "",
            cover: img ? this.abs(img.attributes["src"]) : "",
            subTitle: up ? up.text.replace("最后更新时间：", "") : "",
          })
        )
      }
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const url = this.abs(id)
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const coverEl = doc.querySelector(".mh-date-bgpic > a > img")
      const introEl = doc.querySelector("#workint > p")
      const authorEl = doc.querySelector("span.one > em")
      const topEl = doc.querySelector("div.cy_zhangjie_top")
      const updateEl = topEl ? topEl.children[2]?.querySelector("font") : null
      const infoSpans = doc.querySelectorAll("p.works-info-tc > span")
      const statusText = infoSpans[3] ? infoSpans[3].text : ""
      const finished =
        statusText.includes("完结") || statusText.includes("完結") || statusText.includes("Completed")

      const chapters = {}
      for (const a of doc.querySelectorAll("#mh-chapter-list-ol-0 > li > a")) {
        const href = a.attributes["href"]
        const p = a.querySelector("p")
        if (!href) continue
        chapters[href] = p ? p.text : a.text
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
      const html = res.body

      const m = html.match(/qTcms_S_m_murl_e="(.*?)"/)
      const idm = html.match(/qTcms_S_p_id="(.*?)"/)
      if (!m) throw "未找到图片数据"
      const decoded = Convert.decodeUtf8(Convert.decodeBase64(m[1]))

      const picId = idm ? parseInt(idm[1]) : 0
      let prefix = "https://res.gezhengzhongyi.cn:20207"
      if (picId > 542724) prefix = "https://mhpic5.gezhengzhongyi.cn:8443"
      if (picId > 884998) prefix = "https://mhpic88.miyeye.cn:8443"

      const images = decoded
        .split("$qingtiandy$")
        .filter(Boolean)
        .map((p) => prefix + p)
      return { images }
    },

    onImageLoad: (url) => {
      return { headers: this.headers }
    },

    enableTagsTranslate: false,
  }
}
