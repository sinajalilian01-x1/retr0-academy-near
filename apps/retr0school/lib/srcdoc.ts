const bridge = `(function () {
  function send(level, message) {
    parent.postMessage({ source: "w3h-preview", level: level, message: String(message) }, "*");
  }
  ["log", "warn", "error"].forEach(function (level) {
    var original = console[level];
    console[level] = function () {
      var parts = [];
      for (var i = 0; i < arguments.length; i++) {
        var value = arguments[i];
        try {
          parts.push(typeof value === "string" ? value : JSON.stringify(value));
        } catch (err) {
          parts.push(String(value));
        }
      }
      send(level, parts.join(" "));
      if (original) original.apply(console, arguments);
    };
  });
  window.addEventListener("error", function (event) {
    var target = event.target;
    if (target && target.tagName === "IMG") {
      if (!target.getAttribute("data-w3h-fallback")) {
        target.setAttribute("data-w3h-fallback", "1");
        var note = document.createElement("p");
        note.textContent = target.alt || "Image could not be loaded.";
        if (target.parentNode) target.parentNode.insertBefore(note, target.nextSibling);
      }
      send("warn", "Image failed to load: " + (target.alt || target.src || ""));
      return;
    }
    send("error", event.message || "Script error");
  }, true);
})();`;

export function buildSrcDoc(html: string, css: string, js: string) {
  const safeHtml = html.replace(/<\/(body|html)/gi, "<\\/$1");
  const safeJs = js.replace(/<\/script/gi, "<\\/script");
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
html, body { margin: 0; }
${css}
</style>
</head>
<body>
${safeHtml}
<script>
${bridge}
try {
${safeJs}
} catch (error) {
  parent.postMessage({ source: "w3h-preview", level: "error", message: String(error) }, "*");
}
</script>
</body>
</html>`;
}
