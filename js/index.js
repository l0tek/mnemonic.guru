/* default dom id (particles-js) */
//particlesJS();

/* config dom id */
//particlesJS('dom-id');

/* config dom id (optional) + config particles params */
particlesJS('particles-js', {
  particles: {
    color: '#33CCFF',
    shape: 'circle', // "circle", "edge" or "triangle"
    opacity: 1,
    size: 3,
    size_random: true,
    nb: 70,
    line_linked: {
      enable_auto: true,
      distance: 100,
      color: '#33CCFF',
      opacity: 1,
      width: 1,
      condensed_mode: {
        enable: true,
        rotateX: 700,
        rotateY: 700
      }
    },
    anim: {
      enable: true,
      speed: 1
    }
  },
  interactivity: {
    enable: true,
    mouse: {
      distance: 300
    },
    detect_on: 'canvas', // "canvas" or "window"
    mode: 'grab',
    line_linked: {
      opacity: .5
    },
    events: {
      onclick: {
        enable: false,
        mode: 'push', // "push" or "remove"
        nb: 4
      }
    }
  },
  /* Retina Display Support */
  retina_detect: true
});

$("#particles-js").bgswitcher({
  images: ["img/starback1.png", "img/starback2.png", "img/starback3.png", "img/starback4.png", "img/starback5.png", "img/starback6.png"]
});

$(window).bind('resize', function(e)
{
  if (window.RT) clearTimeout(window.RT);
  window.RT = setTimeout(function()
  {
    this.location.reload(false); /* false to get page from cache */
  }, 100);
});

const FEED_URL = 'https://yacdn.org/proxy/https://blog.fefe.de/rss.xml';

$.get(FEED_URL, function (data) {
  $(data).find("item").each(function () { // or "item" or whatever suits your feed
      var el = $(this);

      console.log("------------------------");
      console.log("title      : " + el.find("title").text());
      console.log("link     : " + el.find("link").text());
  });
});



// var fs = require("fs");
// var text = fs.readFileSync("../fortune.txt");
// var textByLine = text.split("\n")