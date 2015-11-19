var request = require('request'),
    cheerio = require('cheerio'),
    url = "http://www.builtincolorado.com/jobs#/jobs?f%5B%5D=im_job_categories%3A78",
    job_totals = {};

request(url, function(error, response, body) {
  if (!error) {
    var $ = cheerio.load(body),
        result = []
        almost = []
        steve = []
        g = []
        t = []
        test = $("ul.expanded > li").text()
        jobs = {}

    result = test.split(" filter ")
    result.map(function(foo) {
      return almost.push(foo.substring(0, foo.indexOf('Ap')).trim())
    })
    almost.pop();
    almost.map(function(bar) {
      steve.push(bar.split(" "))
    })

    steve.forEach(function(mom) {
      if(mom.length === 3) {
        mom.reduce(function(prev, cur, index) {
          if(prev === undefined) {
            g.push(cur.replace(/[{()}]/g, ''))
            if(g.length === 2) {
              t.push(g)
              g = []
            }
          } else {
            g.push(prev + " " + cur)
          }
        })
      } else {
        mom.reduce(function(prev, cur, index) {
          g.push(prev)
          g.push(cur.replace(/[{()}]/g, ''))
          if(g.length === 2) {
            t.push(g)
            g = []
          }
        })
      }
    })
    t.forEach(function(elem) {
      jobs[elem[0]] = elem[1]
    })
    console.log(jobs);
  } else {
    console.log("We've encountered an error: " + error);
  }
})
