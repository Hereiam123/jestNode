const puppeteer = require("puppeteer");
const sessionFactory = require("../factories/sessionFactory");
const userFactory = require("../factories/userFactory");

class Page {
  static async build() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    const customPage = new Page(page);
    return new Proxy(customPage, {
      get: function(target, property) {
        return customPage[property] || browser[property] || page[property];
      }
    });
  }

  constructor(page) {
    this.page = page;
  }

  async login() {
    const user = await userFactory();
    const { session, sig } = sessionFactory(user);
    await this.page.setCookie({
      name: "session",
      value: session
    });
    await this.page.setCookie({
      name: "session.sig",
      value: sig
    });
    await this.page.goto("localhost:3000/blogs");
    await this.page.waitFor('a[href="/auth/logout"]');
  }

  async getContentsOf(selector) {
    return this.page.$eval(selector, el => el.innerHTML);
  }

  get(path) {
    return this.page.evaluate(async getPath => {
      return fetch(getPath, {
        method: "GET",
        credentials: "same-origin",
        header: {
          "Content-Type": "application/json"
        }
      }).then(res => res.json());
    }, path);
  }

  post(path, data) {
    return this.page.evaluate(
      async (postPath, postData) => {
        return fetch(postPath, {
          method: "POST",
          credentials: "same-origin",
          header: {
            "Content-Type": "application/json",
            body: JSON.stringify(postData)
          }
        }).then(res => res.json());
      },
      path,
      data
    );
  }
}

module.exports = Page;
