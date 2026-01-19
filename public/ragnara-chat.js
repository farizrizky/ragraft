(function () {
  if (window.__ragnaraWidgetLoaded) {
    return;
  }
  window.__ragnaraWidgetLoaded = true;

  function getCurrentScript() {
    if (document.currentScript) {
      return document.currentScript;
    }
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  }

  var script = getCurrentScript();
  if (!script || !script.dataset) {
    return;
  }

  var code = script.dataset.code;
  if (!code) {
    return;
  }

  var src = script.getAttribute("src") || "";
  var origin = "";
  try {
    origin = new URL(src, window.location.href).origin;
  } catch (err) {
    origin = "";
  }

  var width = script.dataset.width || "380px";
  var height = script.dataset.height || "620px";
  var position = script.dataset.position || "bottom-right";
  var zIndex = script.dataset.zIndex || "9999";
  var buttonText = script.dataset.buttonText || "Chat";

  var container = document.createElement("div");
  container.id = "ragnara-chat-widget";
  container.style.position = "fixed";
  container.style.zIndex = zIndex;
  container.style.fontFamily = "ui-sans-serif, system-ui, -apple-system";
  container.style.bottom = "24px";
  if (position === "bottom-left") {
    container.style.left = "24px";
  } else {
    container.style.right = "24px";
  }

  var panel = document.createElement("div");
  panel.style.position = "absolute";
  panel.style.bottom = "64px";
  panel.style.width = width;
  panel.style.height = height;
  panel.style.borderRadius = "18px";
  panel.style.overflow = "hidden";
  panel.style.boxShadow = "0 20px 60px rgba(15, 23, 42, 0.25)";
  panel.style.background = "#ffffff";
  panel.style.display = "none";
  panel.style.transform = "translateZ(0)";

  var iframe = document.createElement("iframe");
  iframe.src = origin ? origin + "/chat/" + encodeURIComponent(code) + "?embed=1" : "/chat/" + encodeURIComponent(code) + "?embed=1";
  iframe.title = "Ragnara Chat";
  iframe.setAttribute("aria-label", "Ragnara Chat");
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "0";
  iframe.style.display = "block";
  iframe.allow = "clipboard-write; fullscreen";
  panel.appendChild(iframe);

  var button = document.createElement("button");
  button.type = "button";
  button.textContent = buttonText;
  button.style.display = "inline-flex";
  button.style.alignItems = "center";
  button.style.justifyContent = "center";
  button.style.gap = "8px";
  button.style.padding = "12px 18px";
  button.style.borderRadius = "999px";
  button.style.border = "1px solid rgba(15, 23, 42, 0.08)";
  button.style.background = "#0b1224";
  button.style.color = "#ffffff";
  button.style.fontSize = "14px";
  button.style.fontWeight = "600";
  button.style.cursor = "pointer";
  button.style.boxShadow = "0 12px 30px rgba(15, 23, 42, 0.18)";

  function setOpen(open) {
    panel.style.display = open ? "block" : "none";
    button.setAttribute("aria-expanded", open ? "true" : "false");
  }

  button.addEventListener("click", function () {
    setOpen(panel.style.display === "none");
  });

  function applyResponsive() {
    var isMobile = window.innerWidth < 520;
    if (isMobile) {
      panel.style.width = "calc(100vw - 32px)";
      panel.style.height = "70vh";
      panel.style.bottom = "72px";
      panel.style.right = position === "bottom-left" ? "" : "0";
      panel.style.left = position === "bottom-left" ? "0" : "";
    } else {
      panel.style.width = width;
      panel.style.height = height;
      panel.style.bottom = "64px";
      panel.style.right = position === "bottom-left" ? "" : "0";
      panel.style.left = position === "bottom-left" ? "0" : "";
    }
  }

  window.addEventListener("resize", applyResponsive);
  applyResponsive();

  container.appendChild(panel);
  container.appendChild(button);
  document.body.appendChild(container);
})();
