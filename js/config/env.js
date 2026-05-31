window.EdelConfig = window.EdelConfig || {};
const apiProtocol =
  window.location.protocol === "file:" ? "http:" : window.location.protocol;
const apiHost = window.location.hostname || "localhost";

window.EdelConfig = {
  apiBaseUrl: window.EdelConfig.apiBaseUrl || "http://localhost:5000", //https://edel-server.onrender.com

  socketUrl: window.EdelConfig.socketUrl || "http://localhost:5000",

  environment: window.EdelConfig.environment || "production",
};
