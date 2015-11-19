var request = require('request'),
    cheerio = require('cheerio'),
    url = "http://www.builtincolorado.com/jobs#/jobs?f%5B%5D=im_job_categories%3A78",
    job_totals = {};

request(url, function(error, response, body) {
  if (!error) {
    var $ = cheerio.load(body),
        result = [],
        job = $("[facetvalue='78']").map(function(index) {
          console.log(index);
        });
    //   job = $("[facetvalue='6777']").text(),
    //   job_skill = job.substr(0, $("[facetvalue='6777']").text().length - $("[facetvalue='6777'] span").text().length)
    // console.log(job_skill);
    console.log(job);
  } else {
    console.log("We've encountered an error: " + error);
  }
})
