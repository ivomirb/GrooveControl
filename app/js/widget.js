"use strict";

function jogWidget() {
  // new QRCode(document.getElementById("qrcode"), "http://jindo.dev.naver.com/collie");

  $('#jogip').html("http://" + laststatus.driver.ipaddress + ":" + serverPort + "/jog")
  $('#qrcode').empty();

  new QRCode("qrcode", {
    text: "http://" + laststatus.driver.ipaddress + ":" + serverPort + "/jog",
    width: 128,
    height: 128,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });

  Metro.dialog.open('#jogWidgetDialog')

}