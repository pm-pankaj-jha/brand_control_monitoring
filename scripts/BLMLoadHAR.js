var PAGE_LOAD_THRESHOLD = 10000;
if (!Date.prototype.toISOString) {
    Date.prototype.toISOString = function () {
        function pad(n) { return n < 10 ? '0' + n : n; }
        function ms(n) { return n < 10 ? '00'+ n : n < 100 ? '0' + n : n }
        return this.getFullYear() + '-' +
            pad(this.getMonth() + 1) + '-' +
            pad(this.getDate()) + 'T' +
            pad(this.getHours()) + ':' +
            pad(this.getMinutes()) + ':' +
            pad(this.getSeconds()) + '.' +
            ms(this.getMilliseconds()) + 'Z';
    }
}

function createHAR(address, title, startTime, resources)
{
    var entries = [];

    resources.forEach(function (resource) {
        var request = resource.request,
            startReply = resource.startReply,
            endReply = resource.endReply;

        if (!request || !startReply || !endReply) {
            return;
        }

        // Exclude Data URI from HAR file because
        // they aren't included in specification
        if (request.url.match(/(^data:image\/.*)/i)) {
            return;
	}

        entries.push({
            startedDateTime: request.time.toISOString(),
            time: endReply.time - request.time,
            request: {
                method: request.method,
                url: request.url,
                httpVersion: "HTTP/1.1",
                cookies: [],
                headers: request.headers,
                queryString: [],
                headersSize: -1,
                bodySize: -1
            },
            response: {
                status: endReply.status,
                statusText: endReply.statusText,
                httpVersion: "HTTP/1.1",
                cookies: [],
                headers: endReply.headers,
                redirectURL: "",
                headersSize: -1,
                bodySize: startReply.bodySize,
                content: {
                    size: startReply.bodySize,
                    mimeType: endReply.contentType
                }
            },
            cache: {},
            timings: {
                blocked: 0,
                dns: -1,
                connect: -1,
                send: 0,
                wait: startReply.time - request.time,
                receive: endReply.time - startReply.time,
                ssl: -1
            },
            pageref: address
        });
    });

    return {
        log: {
            version: '1.2',
            creator: {
                name: "PhantomJS",
                version: phantom.version.major + '.' + phantom.version.minor +
                    '.' + phantom.version.patch
            },
            pages: [{
                startedDateTime: startTime.toISOString(),
                id: address,
                title: title,
                pageTimings: {
                    onLoad: page.endTime - page.startTime
                }
            }],
            entries: entries
        }
    };
}

var page = require('webpage').create(),
    system = require('system');
var fs = require('fs');


var home ='/home/pubmatic/Desktop/'
if (system.args.length === 1) {
    console.log('Usage: netsniff.js <some URL>');
    phantom.exit(1);
} else {

    page.address = system.args[1];
    page.resources = [];

    page.onLoadStarted = function () {
        page.startTime = new Date();
    };

    page.onResourceRequested = function (req) {
	if(getHar && (req.url.match("NewBlocklistManager?") || req.url.match("blocklistManager.jsp"))){
		console.log("The ur is :::::::::::::::::::"+req.url);
		page.resources[req.id] = {
		    request: req,
		    startReply: null,
		    endReply: null
		};
	}
    };

    page.onResourceReceived = function (res) {
	if(getHar &&  res.url.match("listManager")){
		console.log("The ur is :::::::::::::::::::"+res.url);
		if (res.stage === 'start') {
		    page.resources[res.id].startReply = res;
		}
		if (res.stage === 'end') {
		    page.resources[res.id].endReply = res;
		}
	}
    };

var URL_FUNCTION_MAP = {
	"apps.pubmatic.com/dashboard.jsp": function () {},
};

page.onUrlChanged = function(targetUrl) {

  console.log('New URL: ' + targetUrl);
  if(targetUrl.match("dashboard.jsp")) {
      setTimeout(function(){
          getHar=true;
          page.evaluate(function() {
              console.log("Hopefully thi is inside dashboard page");
              PubMatic.UIBase.redirect('blocklistManager.jsp');
          });
      }, 5000);
  }
};
page.open(page.address);
var getHar=false;
page.settings.userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.71 Safari/537.36';
page.settings.localToRemoteUrlAccessEnabled = true;
page.onLoadFinished = function(status) {
var url = page.url;
page.endTime = new Date();
            page.title = page.evaluate(function () {
                return document.title;
            });
  console.log("Status:  " + status);
  console.log("Loaded:  " + url);
  page.render("pubmatic.png");
      page.evaluate(function(){
          console.log("The whole DOM is ")
          //console.log(document.getElementsByTagName('html')[0].outerHTML);
          console.log(document.getElementsByClassName('compForm')[0].outerHTML);
          document.getElementsByName('email')[0].value = "tom@switchconcepts.com";
          document.getElementsByName('password')[0].value = "tKHIya379yM9";
          a = document.getElementsByClassName('compForm')[0];
          console.log("Time to click");
          a.submit.click();
	
          window.setTimeout(function() {
              $(".pubList ul li").eq(2).find('span').click();
              document.getElementsByClassName("submitBtn")[1].click();
              console.log("Clicked on submit button. Now check out for I accept page");	
              window.setTimeout(function(){		   
                  console.log("The primary button inner HTML");
                  if(document.getElementsByClassName("primaryButton").length > 0) {
                      console.log(document.getElementsByClassName("primaryButton")[0].innerHTML);
                      document.getElementsByClassName("primaryButton")[0].click();

                  } else {
                      console.log("The I accept page was not there this time"); 
                  }

              }, 3000);
          }, 5000);         
   
      });
  window.setInterval(function(){
      page.render("pubmatic_after_authorize.png");
      //phantom.exit();
  }, 1000);
  
  window.setTimeout(function(){
	var har = createHAR(page.address, page.title, page.startTime, page.resources);      
 	var loadtime = har.log.pages[0].pageTimings.onLoad;
 	var  mydate = new Date();
	fs.write(home+"har.log", mydate  + "    :"+loadtime + "\n", 'a');	
	if (loadtime > PAGE_LOAD_THRESHOLD ){
		fs.write(home+"slow/har_"+mydate+".har", JSON.stringify(har), 'w');
	} else {
		fs.write(home+"normal/har_"+mydate+".har", JSON.stringify(har), 'w');
	}
    
      phantom.exit();
  }, 20000);
}};
