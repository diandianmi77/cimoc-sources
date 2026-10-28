/** @type {import('./_venera_.js')} */
/**
 * 漫画堆 —— 由 Cimoc 源 MH50.java 转换
 * 原站：https://m.manhuadai.com（图片 CDN：https://mhcdn.manhuazj.com 等）
 * 章节图片清单是 AES-CBC 加密的 JSON，密钥/IV 沿用原实现。
 */
class MH50 extends ComicSource {
  name = "漫画堆"
  key = "mh50"
  version = "1.0.0"
  minAppVersion = "1.4.0"
  url = "https://cdn.jsdelivr.net/gh/venera-app/cimoc-sources@main/mh50.js"

  get baseUrl() {
    return "https://m.manhuadai.com"
  }

  get imgServer() {
    return "https://mhcdn.manhuazj.com"
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

  decrypt(code) {
    const key = "KA58ZAQ321oobbG8"
    const iv = "A1B2C3DEF1G321o8"
    try {
      const cipher = Convert.decodeBase64(code)
      const out = Convert.decryptAesCbc(cipher, Convert.encodeUtf8(key), Convert.encodeUtf8(iv))
      return Convert.decodeUtf8(out)
    } catch (e) {
      return ""
    }
  }

  // 复刻原实现的图片地址拼装
  imageUrlByKey(key, domain, chapter) {
    if (key.startsWith("http://images.dmzj.com")) {
      return "https://imgdm.eshanyao.com/showImage.php?url=" + key
    }
    if (/^\^[a-z]\/\/i/.test(key)) {
      return domain + "/showImage.php?url=" + encodeURIComponent("https://images.dmzj.com/" + key)
    }
    if (key.startsWith("http") || key.startsWith("ftp")) return key
    return domain + "/" + chapter + key
  }

  search = {
    load: async (keyword, options, page) => {
      const url = `${this.baseUrl}/search/?keywords=${encodeURIComponent(keyword)}&page=${page}`
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const comics = []
      for (const box of doc.querySelectorAll(".UpdateList > .itemBox")) {
        const a = box.querySelector(".itemTxt > a")
        if (!a) continue
        const href = a.attributes["href"] || ""
        const parts = href.split("/")
        const img = box.querySelector(".itemImg > a > img")
        const ps = box.querySelectorAll(".itemTxt > p.txtItme")
        comics.push(
          new Comic({
            id: parts.length > 1 ? parts[1] : "",
            title: a.text,
            cover: img ? this.abs(img.attributes["src"]) : "",
            subTitle: ps[1] ? ps[1].text : "",
            description: ps[3] ? ps[3].text : "",
          })
        )
      }
      return { comics, maxPage: null }
    },
    enableTagsSuggestions: false,
  }

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(`${this.baseUrl}/manhua/${id}/`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const doc = new HtmlDocument(res.body)

      const introEl = doc.querySelector("#full-des")
      const titleEl = doc.querySelector("#comicName")
      const coverEl = doc.querySelector("#Cover > img")
      const items = doc.querySelectorAll(".Introduct_Sub > .sub_r > .txtItme")
      const authorEl = items[0]
      const updateEl = items[4]
      const statusLinks = items[2] ? items[2].querySelectorAll("a") : []
      const statusText = statusLinks[3] ? statusLinks[3].text : ""
      const finished =
        statusText.includes("完结") || statusText.includes("完結") || statusText.includes("Completed")

      const chapters = {}
      const list = []
      for (const a of doc.querySelectorAll(".chapter-warp > ul > li > a")) {
        const href = a.attributes["href"] || ""
        const parts = href.split("/")
        const path = parts.length > 3 ? parts[3] : ""
        if (path) list.push([path, a.text])
      }
      list.reverse()
      for (const [k, v] of list) chapters[k] = v

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
      const res = await Network.get(`${this.baseUrl}/manhua/${comicId}/${epId}`, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      const html = res.body

      const codeM = html.match(/var chapterImages =\s*"(.*?)";/)
      const pathM = html.match(/var chapterPath = "([\s\S]*?)";/)
      if (!codeM) throw "未找到图片数据"
      const json = this.decrypt(codeM[1])
      if (!json) throw "解密失败"
      const keys = JSON.parse(json)
      const chapterPath = pathM ? pathM[1] : ""

      const images = []
      for (const key of keys) {
        let url = this.imageUrlByKey(key, this.imgServer, chapterPath)
        if (url && url.includes("images.dmzj.com")) url = url.replace(/%/g, "%25")
        if (url) images.push(url)
      }
      return { images }
    },

    onImageLoad: (url) => {
      return { headers: { "Referer": this.baseUrl + "/" } }
    },

    enableTagsTranslate: false,
  }
}
