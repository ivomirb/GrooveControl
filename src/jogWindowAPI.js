// jogWindowAPI.js provides access to the jog window to modules below main.js

export var jogWindowAPI = {};

export function jogWindowProgress(progress) {
  const jogWindow = jogWindowAPI.getJogWindow();
  if (jogWindow) {
    jogWindow.setProgressBar(progress);
  }
}

export function initJogWindowAPI(getJogWindow, showJogWindow) {
  jogWindowAPI.getJogWindow = getJogWindow;
  jogWindowAPI.showJogWindow = showJogWindow;
}
