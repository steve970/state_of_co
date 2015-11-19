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

    result = test.split(" filter ")
    result.map(function(foo) {
      return almost.push(foo.substring(0, foo.indexOf('Ap')).trim())
    })
    almost.pop();
    almost.map(function(bar) {
      steve.push(bar.split(" "))
    })

    steve.forEach(function(mom) {
      if(mom.length === 2) {
        t.push(mom)
      } else {
        mom.reduce(function(prev, cur, index) {
          if(index < 3) {
            prev = prev + " " + cur
            g.push(prev.replace("undefined ", "" ))
            if(g.length === 2) {
              t.push(g)
              g = []
            }
          }
        })
      }
    })
    console.log(t);
  } else {
    console.log("We've encountered an error: " + error);
  }
})
