/** @type {import('./_venera_.js')} */
/**
 * 奇漫屋 —— 由 Cimoc 源 QiManWu.java 转换
 * 原站：http://qiman6.com
 * 章节 = 静态列表 + /bookchapter/ 动态列表；图片由页面 eval 混淆脚本给出。
 */
class QiManWu extends ComicSource {
  name = "奇漫屋"
  key = "qimanwu"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/venera-app/cimoc-sources@main/qimanwu.js"

  get baseUrl() {
    return "http://qiman6.com"
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1",
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
        `${this.baseUrl}/spotlight/?keyword=${encodeURIComponent(keyword)}`,
        {
          ...this.headers,
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
        `keyword=${encodeURIComponent(keyword)}`
      )
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const div of doc.querySelectorAll(".search-result > .comic-list-item")) {
        const a = div.querySelector("a")
        if (!a) continue
        const p = div.querySelector("p.comic-name")
        const img = div.querySelector("img")
        const author = div.querySelector("p.comic-author")
        comics.push(
          new Comic({
            id: a.attributes["href"],
            title: p ? p.text : "",
            cover: img ? this.abs(img.attributes["src"]) : "",
            subTitle: author ? author.text : "",
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
      const html = res.body

      const titleEl = doc.querySelector(".box-back2 > h1")
      const coverEl = doc.querySelector(".box-back1 > img")
      const introEl = doc.querySelector("span.comic-intro")
      const statusEl = doc.querySelector(".box-back2 > p.txtItme.c1")
      const infoItems = doc.querySelectorAll(".box-back2 > *")
      let updateEl = infoItems[4]
      if (!updateEl || !updateEl.text.includes("更新时间：")) updateEl = infoItems[3]
      const authorEl = infoItems[2]
      const statusText = statusEl ? statusEl.text : ""
      const finished =
        statusText.includes("完结") || statusText.includes("完結") || statusText.includes("Completed")

      const chapters = {}
      for (const li of doc.querySelectorAll("div.catalog-list > ul > li")) {
        const a = li.querySelector("a")
        const id2 = li.attributes["data-id"]
        if (!a || !id2) continue
        chapters[id2] = a.text
      }

      // 动态章节（拿不到就跳过）
      try {
        const idM = html.match(/ data: \{ "id":(.*?),/)
        const id2M = html.match(/, "id2":(.*?)\},/)
        if (idM && id2M) {
          const r = await Network.post(
            "http://qiman6.com/bookchapter/",
            {
              ...this.headers,
              "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
              "Host": "qiman6.com",
            },
            `id=${idM[1].trim()}&id2=${id2M[1].trim()}`
          )
          if (r.status === 200) {
            const arr = JSON.parse(r.body)
            for (const ch of arr) chapters[ch.id] = ch.name
          }
        }
      } catch (e) {
        // 动态章节失败不影响静态章节
      }

      return new ComicDetails({
        title: titleEl ? titleEl.text : "",
        cover: coverEl ? this.abs(coverEl.attributes["src"]) : "",
        description: introEl ? introEl.text : "",
        tags: {
          "作者": authorEl ? [authorEl.text] : [],
          "状态": [finished ? "已完结" : "连载中"],
        },
        updateTime: updateEl ? updateEl.text.replace("更新时间：", "") : "",
        chapters,
      })
    },

    loadEp: async (comicId, epId) => {
      const url = `http://qiman6.com${comicId}${epId}.html`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const m = res.body.match(/eval\([\s\S]*\)/)
      if (!m) throw "未找到图片数据"
      const code = m[0]
      const str = new Function(code + "\n;return typeof newImgs === 'undefined' ? '' : newImgs;")()
      if (!str) throw "图片解析失败"
      return { images: String(str).split(",").filter(Boolean) }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl } }
    },

    enableTagsTranslate: false,
  }
}
