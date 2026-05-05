window.EdelConfig = window.EdelConfig || {};
const apiProtocol =
  window.location.protocol === "file:" ? "http:" : window.location.protocol;
const apiHost = window.location.hostname || "localhost";

window.EdelConfig = {
  apiBaseUrl:
    window.EdelConfig.apiBaseUrl || `${apiProtocol}//${apiHost}:5000`,
  socketUrl:
    window.EdelConfig.socketUrl || `${apiProtocol}//${apiHost}:5000`,
  environment: window.EdelConfig.environment || "development",
};
