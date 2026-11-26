var xyzprobeplate = {
  xoffset: 10,
  yoffset: 10,
  zoffset: 9,
  name: "OpenBuilds XYZ Probe Plus",
  xyzmode: true
}

var zprobeplate = {
  xoffset: 0,
  yoffset: 0,
  zoffset: 20,
  xyzmode: false,
  name: "OpenBuilds Z Touchplate",
}

var customprobeplate = {
  xoffset: 6,
  yoffset: 6,
  zoffset: 8,
  xyzmode: true,
  name: "Custom XYZ Touchplate",
}

var probemode = {
  mode: "auto", // auto, xyz, xzero, yzero, zzero, zplate
  endmilldia: 0,
  secondpass: false,
  stock: {
    x: 0,
    y: 0,
    position: "fl" // fl, fr, rl, rr, c
  },
  probe: xyzprobeplate,
  interval: undefined,
}

var storedJro;

function probeDocReady() {
  $('.needsXYZProbe').toggle(getSettingEnum('probeType', ["xyz", "z", "custom"]) != "z");

  zprobeplate.zoffset = getSettingNumber('z0platethickness', 20);
  probemode.secondpass = getSettingBool('probesecondpass', false);

  const probediameterxyz = getSettingNumber('probediameterxyz', 6.35);
  $('#probediameterxyz').val(probediameterxyz);

  const probeunitxyz = getSettingEnum('probeunitxyz', ["mm", "inch"]);
  $('#probeunitxyz').data('select').val(probeunitxyz);

  customprobeplate = getSettingObject('customProbe', {
    xoffset: 6,
    yoffset: 6,
    zoffset: 8,
    xyzmode: true,
    name: "Custom XYZ Touchplate"});

  $('#z0platethickness').keyup(function() {
    zprobeplate.zoffset = $('#z0platethickness').val();
    setSettingNumber('z0platethickness', zprobeplate.zoffset);
  });

  $('#probesecondpass').on('click', function() {
    probemode.secondpass = $(this).is(':checked');
    setSettingBool('z0secondpass', probemode.secondpass);
  });

  $('#probediameterxyz').keyup(function() {
    setSettingNumber('probediameterxyz', $('#probediameterxyz').val());
  });

  $('#probeunitxyz').change(function() {
    setSettingString('probeunitxyz', $('#probeunitxyz').val());
  });
}

function probeDlgOnClose() {
  setSettingNumber('probejro', $('#probeJro').data('slider').val());
  jogOverride(storedJro);
  removeDlgContext("probe");
}

function initProbeDialog() {
  addDlgContext("probe");
  Metro.dialog.open("#xyzProbeWindow");

  pollProbeInPlace();

  storedJro = $('#jro').data('slider').val();
  $('#probeJro').data('slider').val(getSettingNumber('probejro', storedJro, 1, 100));
}

function openProbeDialog() {
  initProbeDialog();
  const probeType = getSettingEnum('probeType', ["xyz", "z", "custom"]);
  probetype(probeType);
  if (probeType == "z") { // Z Touchplate
    setTimeout(function() {
      probezplatetab()
      $('.probetabxyz').removeClass('active')
      $('#probezplatetab').addClass('active')
    }, 100)
  } else if (probeType == "xyz") { // OpenBuilds Probe Plus XYZ
    setTimeout(function() {
      probeautotab()
      $('.probetabxyz').removeClass('active')
      $('#probeautotab').addClass('active')
    }, 100)
  } else { // Custom Probe
    setTimeout(function() {
      probexyztab()
      $('.probetabxyz').removeClass('active')
      $('#probexyztab').addClass('active')
    }, 100)
  }
}

function openProbeXDialog() {
  initProbeDialog();
  const probeType = getSettingEnum('probeType', ["xyz", "z", "custom"]);
  probetype(probeType);
  if (probeType != "z") {
    setTimeout(function() {
      probextab()
      $('.probetabxyz').removeClass('active')
      $('#probextab').addClass('active')
    }, 100)
  }
}

function openProbeYDialog() {
  initProbeDialog();
  const probeType = getSettingEnum('probeType', ["xyz", "z", "custom"]);
  probetype(probeType);
  if (probeType != "z") {
    setTimeout(function() {
      probeytab()
      $('.probetabxyz').removeClass('active')
      $('#probeytab').addClass('active')
    }, 100)
  }
}

function openProbeZDialog() {
  initProbeDialog();
  const probeType = getSettingEnum('probeType', ["xyz", "z", "custom"]);
  probetype(probeType);
  if (probeType == "z") {
    setTimeout(function() {
      probezplatetab()
      $('.probetabxyz').removeClass('active')
      $('#probezplatetab').addClass('active')
    }, 100)
  } else {
    setTimeout(function() {
      probeztab()
      $('.probetabxyz').removeClass('active')
      $('#probeztab').addClass('active')
    }, 100)
  }
}

function probeautotab() {
  probemode.mode = "auto"; // auto, xyz, xzero, yzero, zzero, zplate
  $('.probe-tab-content').hide();
  $('#probe-auto').show();
  $('#xyzdatum').show();
  $('#zplatesettings').hide();
  $('#probesecondpassdiv').hide();
  $('.img-probe').hide();
  $('#img-probe-auto').show();
  $('#toggle-probe-advanced').hide();
  $('#toggle-probe-advanced-content').data('collapse').collapse()
  $('#endmilldiameterform').hide();
  probemode.stock.position == "fl"
  pollProbeInPlace();
  $('.probetabxyz').removeClass('active');
  $('#probeautotab').addClass('active');
}

function probexyztab() {
  probemode.mode = "xyz"; // auto, xyz, xzero, yzero, zzero, zplate
  $('.probe-tab-content').hide();
  $('#probe-xyz').show();
  $('#xyzdatum').show();
  $('#zplatesettings').hide();
  $('#probesecondpassdiv').hide();
  $('.img-probe').hide();
  $('#img-probe-xyz').show();
  $('#toggle-probe-advanced').show();
  $('#endmilldiameterform').show();
  if (probemode.stock.position == "fl") {
    $('#toggle-probe-advanced-content').data('collapse').collapse()
  } else {
    $('#toggle-probe-advanced-content').data('collapse').expand()
  }
  $('.probetabxyz').removeClass('active');
  $('#probexyztab').addClass('active');
  pollProbeInPlace();
}

function probextab() {
  probemode.mode = "xzero"; // auto, xyz, xzero, yzero, zzero, zplate
  resetOffsetFL();
  $('.probe-tab-content').hide();
  $('#probe-x').show();
  $('#xyzdatum').hide();
  $('#zplatesettings').hide();
  $('#probesecondpassdiv').show();
  $('.img-probe').hide();
  $('#img-probe-x').show();
  $('#toggle-probe-advanced').hide();
  $('#endmilldiameterform').show();
  $('#toggle-probe-advanced-content').data('collapse').collapse()
  pollProbeInPlace();
}

function probeytab() {
  probemode.mode = "yzero"; // auto, xyz, xzero, yzero, zzero, zplate
  resetOffsetFL();
  $('.probe-tab-content').hide();
  $('#probe-y').show();
  $('#xyzdatum').hide();
  $('#zplatesettings').hide();
  $('#probesecondpassdiv').show();
  $('.img-probe').hide();
  $('#img-probe-y').show();
  $('#toggle-probe-advanced').hide();
  $('#endmilldiameterform').show();
  $('#toggle-probe-advanced-content').data('collapse').collapse()
  pollProbeInPlace();
}

function probeztab() {
  probemode.mode = "zzero"; // auto, xyz, xzero, yzero, zzero, zplate
  resetOffsetFL();
  $('.probe-tab-content').hide();
  $('#probe-z').show();
  $('#xyzdatum').hide();
  $('#zplatesettings').hide();
  $('#probesecondpassdiv').show();
  $('.img-probe').hide();
  $('#img-probe-z').show();
  $('#toggle-probe-advanced').hide();
  $('#endmilldiameterform').hide();
  $('#toggle-probe-advanced-content').data('collapse').collapse()
  pollProbeInPlace();
}

function probezplatetab() {
  probemode.mode = "zplate"; // auto, xyz, xzero, yzero, zzero, zplate
  resetOffsetFL();
  $('.probe-tab-content').hide();
  $('#probe-z').show();
  $('#xyzdatum').hide();
  $('#zplatesettings').show();
  $('#probesecondpassdiv').show();
  $('.img-probe').hide();
  $('#img-probe-zplate').show();
  $('#toggle-probe-advanced').hide();
  $('#endmilldiameterform').hide();
  $('#toggle-probe-advanced-content').data('collapse').collapse()
  $('#z0platethickness').val(zprobeplate.zoffset)
  $('#probesecondpass').prop('checked', probemode.secondpass)
  $('.probetabxyz').removeClass('active');
  $('#probezplatetab').addClass('active');
  pollProbeInPlace();
}

function resetOffsetFL() {
  $('.probe-label').removeClass('areaactive')
  $('#probe-fl').addClass('areaactive')
  probemode.stock.position = "fl" // fl, fr, rl, rr, c
}

$('#probe-fl, #probe-fl-text').on('click', function() {
  resetOffsetFL();
});

$('#probe-fr, #probe-fr-text').on('click', function() {
  $('.probe-label').removeClass('areaactive')
  $('#probe-fr').addClass('areaactive')
  probemode.stock.position = "fr" // fl, fr, rl, rr, c
});

$('#probe-rl, #probe-rl-text').on('click', function() {
  $('.probe-label').removeClass('areaactive')
  $('#probe-rl').addClass('areaactive')
  probemode.stock.position = "rl" // fl, fr, rl, rr, c
});

$('#probe-rr, #probe-rr-text').on('click', function() {
  $('.probe-label').removeClass('areaactive')
  $('#probe-rr').addClass('areaactive')
  probemode.stock.position = "rr" // fl, fr, rl, rr, c
});

$('#probe-c, #probe-c-text').on('click', function() {
  $('.probe-label').removeClass('areaactive')
  $('#probe-c').addClass('areaactive')
  probemode.stock.position = "c" // fl, fr, rl, rr, c
});

function probetype(type) {
  let select = $('#selectProbeType').data('select');
  if (select.val() != type) {
    select.val(type);
  }
  setSettingEnum('probeType', type);
  if (type == "xyz") {
    $('.needsXYZProbe').show()
    probemode.probe = xyzprobeplate // customprobeplate, xyzprobeplate, zprobeplate
    const template = `<span class="icon"><img src="./img/xyzprobe/xyztouch.png"/></span> OpenBuilds XYZ Probe Plus`;
    $('#probetypebtn').html(template)
    $('.probetabz').hide();
    $('.probetabxyz').show();
    $('#editCustomProbeBtn').hide()
    $('#ProbeButtonBarSpacer').show()
    $('#probeautotab').show();
    probeautotab()
  } else if (type == "z") {
    $('.needsXYZProbe').hide()
    probemode.probe = zprobeplate // customprobeplate, xyzprobeplate, zprobeplate
    const template = `<span class="icon"><img src="./img/xyzprobe/ztouch.png"/></span> Z Touch Plate`;
    $('#probetypebtn').html(template)
    $('.probetabxyz').hide();
    $('.probetabz').show();
    $('#editCustomProbeBtn').hide()
    $('#ProbeButtonBarSpacer').show()
    $('#probeautotab').hide();
    probezplatetab();
  } else if (type == "custom") {
    $('.needsXYZProbe').show()
    probemode.probe = customprobeplate // customprobeplate, xyzprobeplate, zprobeplate
    const template = `<span class="icon"><img src="./img/xyzprobe/custom.png"/></span> Custom XYZ Probe`;
    $('#probetypebtn').html(template)
    $('.probetabz').hide();
    $('.probetabxyz').show();
    $('#editCustomProbeBtn').show()
    $('#ProbeButtonBarSpacer').hide()
    $('#probeautotab').hide();
    probexyztab()
  }
}

function pollProbeInPlace() {
  $('#confirmNewProbeBtn').removeClass('disabled').html("Confirm Probe Position");
  $('#runNewProbeBtn').addClass('disabled');
  if (probemode.interval == undefined) {
    probemode.interval = setInterval(() => {
      if (laststatus.machine.inputs.contains("P")) {
        $('#confirmNewProbeBtn').addClass('disabled').html("Touched");
        $('#runNewProbeBtn').removeClass('disabled').focus();
        clearInterval(probemode.interval);
        probemode.interval = undefined;
      }
    }, 100);
  }
}

function confirmProbeInPlace() {
  $('#confirmNewProbeBtn').addClass('disabled');
  $('#runNewProbeBtn').removeClass('disabled').focus();
  clearInterval(probemode.interval);
  probemode.interval = undefined;
}

function resetJogModeAfterProbe() {
  $('#confirmNewProbeBtn').removeClass('disabled');
  clearInterval(probemode.interval)
  probemode.interval = undefined;
}

function probeReportCallback(success, report) {
  let message;
  if (success) {
    message = "Remove the Probe Clip and Probe Plate before continuing.";
  } else if (report.alarm[0] == '5') {
    message = "The probe did not contact the workpiece within the expected travel distance.";
    socket.emit('clearAlarm', 1);
  } else {
    message = "Unexpected error.";
  }
  Metro.dialog.create({
    clsDialog: 'dark',
    title: success ? "<i class='far fa-check-square'></i> Probe Complete" : "<i class='fas fa-exclamation-triangle'></i> Probe Failed",
    content: message,
    actions: [
      {
        caption: "OK",
        cls: success ? "js-dialog-close success closeProbeBtn" : "js-dialog-close alert closeProbeBtn",
        onclick: function() {}
      }
    ],
  });
  setTimeout(function() {
    $('.closeProbeBtn').focus();
  }, 200);
}

function runProbeNew() {
  $('#confirmNewProbeBtn').html("Confirm Probe Position");
  resetJogModeAfterProbe();
  activateContentTab("consoletab");
  probemode.stock.x = $('#stockwidth').val();
  probemode.stock.y = $('#stocklength').val();

  if (probemode.mode == "xyz" || probemode.mode == "xzero" || probemode.mode == "yzero" || probemode.mode == "zzero") {
    const endmillUnit = $('#probeunitxyz').val();
    if (endmillUnit == "mm") {
      probemode.endmilldia = parseFloat($('#probediameterxyz').val());
    } else {
      probemode.endmilldia = (parseFloat($('#probediameterxyz').val()) * 25.4);
    }
  }

  let stockoffset = {
    x: 0,
    y: 0
  }
  if (probemode.stock.position == "fr") { // fl, fr, rl, rr, c
    stockoffset.x = probemode.stock.x
  }
  if (probemode.stock.position == "rl") { // fl, fr, rl, rr, c
    stockoffset.y = probemode.stock.y
  }
  if (probemode.stock.position == "rr") { // fl, fr, rl, rr, c
    stockoffset.x = probemode.stock.x
    stockoffset.y = probemode.stock.y
  }
  if (probemode.stock.position == "c") { // fl, fr, rl, rr, c
    stockoffset.x = probemode.stock.x / 2
    stockoffset.y = probemode.stock.y / 2
  }

  if (probemode.mode == "auto") {
    findCenter();
  }

  if (probemode.mode == "xzero") {
    const xoffset = (probemode.probe.xoffset + probemode.endmilldia / 2) * -1 // *-1 to make negative as we are off to the left too far from x0

    captureWcsHistory('Before <b>Probe X</b>');

    let xmacro = `
    ; Header
    G21 ; mm mode
    G10 P0 L20 X0 ; zero out current location

    ; Probe X
    G38.2 X25 F100 ; Probe X
    G4 P0.4`;

    if (probemode.secondpass) {
      xmacro += `
        G1 G91 X-1 F1000 ; Retract 1 mm
        G38.2 X5 F50 ; Second pass
        G4 P0.4`;
    }

    xmacro += `
    G10 P0 L20 X` + xoffset + ` ; set X as offset and half endmill diameter
    $J=G91 G21 X-2 F1000 ; Retract`;

    socket.off('prbResult'); // Disable old listeners
    socket.emit('runJob', { data: xmacro}, probeReportCallback);
  }

  if (probemode.mode == "yzero") {
    const yoffset = (probemode.probe.yoffset + probemode.endmilldia / 2) * -1 // *-1 to make negative as we are off to the front too far from y0

    captureWcsHistory('Before <b>Probe Y</b>');
    let ymacro = `
    ; Header
    G21 ; mm mode
    G10 P0 L20 Y0 ; zero out current location

    G38.2 Y25 F100 ; probe Y
    G4 P0.4`;

    if (probemode.secondpass) {
      ymacro += `
        G1 G91 Y-1 F1000 ; Retract 1 mm
        G38.2 Y5 F50 ; Second pass
        G4 P0.4`;
    }

    ymacro += `
    G10 P0 L20 Y` + yoffset + ` ; set Y as offset and half endmill diameter
    $J=G91 G21 Y-2 F1000 ; Retract`;

    socket.off('prbResult'); // Disable old listeners
    socket.emit('runJob', { data: ymacro}, probeReportCallback);
  }

  if (probemode.mode == "zzero") {
    const zoffset = probemode.probe.zoffset // not *-1 as its offset in z pos

    captureWcsHistory('Before <b>Probe Z</b>');

    let zmacro = `
    G21
    G10 P0 L20 Z0
    G38.2 Z-25 F100
    G4 P0.4`;

    if (probemode.secondpass) {
      zmacro += `
        G1 G91 Z1 F1000; Retract 1 mm
        G38.2 Z-5 F50 ; Second pass
        G4 P0.4`;
    }

    zmacro += `
    G10 P0 L20 Z` + zoffset + `
    $J=G91 G21 Z5 F1000 ; Retract`;

    socket.off('prbResult'); // Disable old listeners
    socket.emit('runJob', { data: zmacro}, probeReportCallback);
  }

  if (probemode.mode == "zplate") {
    const zoffset = $('#z0platethickness').val();

    captureWcsHistory('Before <b>Probe Z</b>');

    let zmacro = `
    ; Header
    G21 ; mm mode
    G10 P0 L20 Z0 ; zero out current location

    ; Probe Z
    G38.2 Z-25 F100 ; Probe Z
    G4 P0.4`;

    if (probemode.secondpass) {
      zmacro += `
        G1 G91 Z1 F1000 ; Retract 1 mm
        G38.2 Z-5 F50 ; Second pass
        G4 P0.4`;
    }

    zmacro += `
    G10 P0 L20 Z` + zoffset + ` ; Set Z` + zoffset + ` where ` + zoffset + ` is thickness of plate
    $J=G91 G21 Z5 F1000 ; Retract`;

    socket.off('prbResult'); // Disable old listeners
    socket.emit('runJob', { data: zmacro}, probeReportCallback);
  }

  if (probemode.mode == "xyz") {
    const xoffset = (probemode.probe.xoffset + probemode.endmilldia / 2) * -1 // *-1 to make negative as we are off to the left too far from x0
    const yoffset = (probemode.probe.yoffset + probemode.endmilldia / 2) * -1 // *-1 to make negative as we are off to the front too far from y0
    const zoffset = parseFloat(probemode.probe.zoffset) // not *-1 as its offset in z pos

    captureWcsHistory('Before <b>Probe XYZ</b>');

    let xyzmacro = `
    ; Header
    G21 ; mm mode
    G90 ; absolute mode
    G10 P0 L20 X0 Y0 Z0 ; zero out current location

    ; Probe Z
    G0 X22.5 Y22.5 ; position to center of logo
    G38.2 Z-25 F100 ; Probe Z
    G4 P0.4
    G10 P0 L20 Z` + zoffset + ` ; Set Z6 where 6 is thickness of plate
    G0 Z` + (zoffset + 5) + ` ; retract

    ; Probe X
    G0 X-20 Y10 ; position to left side and move forward a little to be closer to center of edge
    G0 Z` + (zoffset - 6) + ` ; drop down to be next to plate
    G38.2 X25 F100 ; Probe X
    G4 P0.4
    G10 P0 L20 X` + xoffset + ` ; set X as offset and half endmill diameter
    G0 X` + (xoffset - 2).toFixed(3) + `
    G0 Z` + (zoffset + 5) + ` ; retract

    ; Probe Y
    G0 X15 Y-20 ; position to front side and move right a little to be closer to center of edge
    G0 Z` + (zoffset - 6) + ` ; drop down to be next to plate
    G38.2 Y25 F100 ; probe Y
    G4 P0.4
    G10 P0 L20 Y` + yoffset + ` ; set Y as offset and half endmill diameter
    G0 Y` + (yoffset - 2).toFixed(3) + `
    G0 Z` + (zoffset + 5) + ` ; retract
    G0 X0 Y0 ; return
    `

    if (stockoffset.x != 0 || stockoffset.y != 0) {
      xyzmacro += `
      G10 P0 L20 X-` + stockoffset.x + ` ; set X stock offset
      G10 P0 L20 Y-` + stockoffset.y + ` ; set Y stock offset
      G0 X0 Y0 ; return
      `
    }

    socket.off('prbResult'); // Disable old listeners
    socket.emit('runJob', { data: xyzmacro}, probeReportCallback);
  }
}

function editCustomProbe() {
  metroTopDialog({
    clsDialog: 'dark',
    title: `<i class="fas fa-cogs"></i> Edit Custom Probe`,
    content: `
      <div>
        <input type="text" data-role="input" class="mb-1" data-prepend="X Offset" data-append="mm" id="customProbeXOffset">
        <input type="text" data-role="input" class="mb-1" data-prepend="Y Offset" data-append="mm" id="customProbeYOffset">
        <input type="text" data-role="input" class="mb-1" data-prepend="Z Offset" data-append="mm" id="customProbeZOffset">
      </div>`,
    actions: [{
      caption: "Save",
      cls: "primary js-dialog-close",
      onclick: saveEditCustomProbe,
    },
    {
      caption: "Cancel",
      cls: "js-dialog-close",
      onclick: function() {},
    }]
  });

  $('#customProbeXOffset').val(customprobeplate.xoffset);
  $('#customProbeYOffset').val(customprobeplate.yoffset);
  $('#customProbeZOffset').val(customprobeplate.zoffset);
}

function saveEditCustomProbe() {
  customprobeplate = {
    xoffset: parseFloat($('#customProbeXOffset').val()),
    yoffset: parseFloat($('#customProbeYOffset').val()),
    zoffset: parseFloat($('#customProbeZOffset').val()),
    xyzmode: true, // stays
    name: "Custom Z Touchplate", // stays
  };
  setSettingObject('customProbe', customprobeplate);
  probetype('custom');
}
