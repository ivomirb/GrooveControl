var xyzprobeplate = {
  xoffset: 10,
  yoffset: 10,
  zoffset: 9,
  name: "OpenBuilds XYZ Probe Plus",
  modes: ["auto", "xyz", "xzero", "yzero", "zzero"],
}

var zprobeplate = {
  xoffset: 0,
  yoffset: 0,
  zoffset: 20,
  name: "OpenBuilds Z Touchplate",
  modes: ["zplate"],
}

var customprobeplate = {
  xoffset: 6,
  yoffset: 6,
  zoffset: 8,
  name: "Custom XYZ Touchplate",
  modes: ["xyz", "xzero", "yzero", "zzero"],
}

const probeModes = {
  xyz: xyzprobeplate,
  z: zprobeplate,
  custom: customprobeplate,
};

var probemode = {
  endmilldia: 0,
  secondpass: false,
  stock: {
    x: 0,
    y: 0,
    position: "fl" // fl, fr, rl, rr, c
  },

  mode: "auto", // auto, xyz, xzero, yzero, zzero, zplate
  probeType: xyzprobeplate,
  probe: xyzprobeplate,
  interval: undefined,
}

function probeDocReady() {
  probemode.probeType = getSettingEnum('probeType', ["xyz", "z", "custom"]);
  probemode.probe = probeModes[probemode.probeType];
  probemode.mode = getSettingString('probeMode', undefined);

  $('.needsXYZProbe').toggle(probemode.probeType == "xyz" || probemode.probeType == "custom");

  zprobeplate.zoffset = getSettingNumber('z0platethickness', 20);
  probemode.secondpass = getSettingBool('probesecondpass', false);

  const probediameterxyz = getSettingNumber('probediameterxyz', 6.35);
  $('#probediameterxyz').val(probediameterxyz);

  const probeunitxyz = getSettingEnum('probeunitxyz', ["mm", "inch"]);
  $('#probeunitxyz').data('select').val(probeunitxyz);

  const custom = getSettingObject('customProbe', {xoffset: 6, yoffset: 6, zoffset: 8});
  customprobeplate.xoffset = custom.xoffset;
  customprobeplate.yoffset = custom.yoffset;
  customprobeplate.zoffset = custom.zoffset;

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

  $('#probe-fl, #probe-fl-text').on('click', () => setStockPosition('fl'));
  $('#probe-fr, #probe-fr-text').on('click', () => setStockPosition('fr'));
  $('#probe-rl, #probe-rl-text').on('click', () => setStockPosition('rl'));
  $('#probe-rr, #probe-rr-text').on('click', () => setStockPosition('rr'));
  $('#probe-c, #probe-c-text').on('click', () => setStockPosition('c'));
}

function probeDlgOnClose() {
  setSettingNumber('probejro', $('#probeJro').data('slider').val());
  jogOverride(getSettingNumber('jogOverride', 100, 1, 100));
  removeDlgContext("probe");
}

function openProbeDialog() {
  addDlgContext("probe");
  Metro.dialog.open("#xyzProbeWindow");

  pollProbeInPlace();

  const jro = $('#jro').data('slider').val();
  $('#probeJro').data('slider').val(getSettingNumber('probejro', jro, 1, 100));

  setProbeType(probemode.probeType);
}

function openProbeXDialog() {
  if (probemode.probeType == "z") return; // X probing not available
  probemode.mode = 'xzero';
  openProbeDialog();
}

function openProbeYDialog() {
  if (probemode.probeType == "z") return; // Y probing not available
  probemode.mode = 'yzero';
  openProbeDialog();
}

function openProbeZDialog() {
  probemode.mode = probemode.probeType == "z" ? 'zplate' : 'zzero';
  openProbeDialog();
}

function openProbeXYZDialog() {
  if (probemode.probeType == "z") return; // XYZ probing not available
  if (probemode.mode != 'custom') {
    probemode.mode = 'xyz';
  }
  openProbeDialog();
}

function setStockPosition(position) { // fl, fr, rl, rr, c
  $('.probe-label').removeClass('areaactive');
  $('#probe-' + position).addClass('areaactive');
  probemode.stock.position = position;
}

function setProbeType(probeType) {
  let select = $('#selectProbeType').data('select');
  if (select.val() != probeType) {
    select.val(probeType);
  }
  setSettingEnum('probeType', probeType);

  $('.needsXYZProbe').toggle(probeType == "xyz" || probeType == "custom");
  $('#editCustomProbeBtn').css('visibility', probeType == "custom" ? 'visible' : 'hidden');

  probemode.probe = probeModes[probeType] || xyzprobeplate;
  let probeMode = probemode.mode;
  if (!probemode.probe.modes.includes(probeMode)) {
    probeMode = probemode.probe.modes[0];
  }

  $('.probetab').hide();
  for (const mode of probemode.probe.modes) {
    $('#probe' + mode + 'tab').show();
  }

  setProbeMode(probeMode);
}

function setProbeMode(mode) {
  probemode.mode = mode; // auto, xyz, xzero, yzero, zzero, zplate
  setSettingString('probeMode', mode);

  $('.probetab').removeClass('active');
  $('#probe' + mode + 'tab').addClass('active');
  $('.probe-tab-content').hide();
  $('#probe-' + mode).show();
  $('.img-probe').hide();
  $('#img-probe-' + mode).show();

  $('#xyzdatum').toggle(mode == "xyz");
  $('#zplatesettings').toggle(mode == "zplate");
  $('#probesecondpassdiv').toggle(mode == "xzero" || mode == "yzero" || mode == "zzero" || mode == "zplate");
  $('#toggle-probe-advanced').toggle(mode == "xyz");
  if (mode == "xyz") {
    if (probemode.stock.position == "fl") {
      $('#toggle-probe-advanced-content').data('collapse').collapse();
    } else {
      $('#toggle-probe-advanced-content').data('collapse').expand();
    }
  } else {
    $('#toggle-probe-advanced-content').data('collapse').collapse();
    setStockPosition('fl');
  }
  $('#endmilldiameterform').toggle(mode == "xyz" || mode == "xzero" || mode == "yzero" || mode == "zzero");
  pollProbeInPlace();
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
  const custom = {
    xoffset: parseFloat($('#customProbeXOffset').val()),
    yoffset: parseFloat($('#customProbeYOffset').val()),
    zoffset: parseFloat($('#customProbeZOffset').val()),
  };
  customprobeplate.xoffset = custom.xoffset;
  customprobeplate.yoffset = custom.yoffset;
  customprobeplate.zoffset = custom.zoffset;

  setSettingObject('customProbe', custom);
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

function probeReport(success, report, successMsg) {
  let message;
  if (success) {
    message = successMsg;
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

function probeReportCallback(success, report) {
  probeReport(success, report, "Remove the Probe Clip and Probe Plate before continuing.");
}

function runProbeNew() {
  $('#confirmNewProbeBtn').html("Confirm Probe Position");
  resetJogModeAfterProbe();
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
    runProbeAuto();
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
    G38.2 X5 F100 ; Probe X
    G4 P0.4
    G10 P0 L20 X` + xoffset + ` ; set X as offset and half endmill diameter
    G0 X` + (xoffset - 2).toFixed(3) + `
    G0 Z` + (zoffset + 5) + ` ; retract

    ; Probe Y
    G0 X15 Y-20 ; position to front side and move right a little to be closer to center of edge
    G0 Z` + (zoffset - 6) + ` ; drop down to be next to plate
    G38.2 Y5 F100 ; probe Y
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

function probeAutoReportCallback(success, report) {
  if (!success) {
    probeReport(success, report, "");
  }
}
function runProbeAuto() {
  const xoffset = (probemode.probe.xoffset) * -1 // *-1 to make negative as we are off to the left too far from x0
  const yoffset = (probemode.probe.yoffset) * -1 // *-1 to make negative as we are off to the front too far from y0
  const zoffset = parseFloat(probemode.probe.zoffset) // not *-1 as its offset in z pos
  let step = 0;
  let rightside = 0,
    leftside = 0,
    farside = 0,
    nearside = 0,
    centerXdistance = 0,
    centerYdistance = 0;

  socket.off('prbResult'); // Disable old listeners

  captureWcsHistory('Before <b>Hole Finder</b>');
  const holefindermacroStep1 = `
  ; Header

  G21 ; mm mode
  G90 ; absolute mode
  G10 P0 L20 X0 Y0 Z0 ; zero out current location

  ; First we establish Zero
  ; Probe Z
  G0 X22.5 Y22.5 ; position to center of logo
  G38.2 Z-25 F100 ; Probe Z
  G4 P0.3
  G10 P0 L20 Z` + zoffset + ` ; Set Z6 where 6 is thickness of plate
  G0 Z` + (zoffset + 5) + ` ; retract

  ; Probe X
  G0 X-20 Y10 ; position to left side and move forward a little to be closer to center of edge
  G0 Z` + (zoffset - 6) + ` ; drop down to be next to plate
  G38.2 X5 F100 ; Probe X
  G4 P0.3
  G10 P0 L20 X` + xoffset + ` ; set X as offset and half endmill diameter
  G0 X` + (xoffset - 2).toFixed(3) + `
  G0 Z` + (zoffset + 5) + ` ; retract

  ; Probe Y
  G0 X15 Y-20 ; position to front side and move right a little to be closer to center of edge
  G0 Z` + (zoffset - 6) + ` ; drop down to be next to plate
  G38.2 Y5 F100 ; probe Y
  G4 P0.3
  G10 P0 L20 Y` + yoffset + ` ; set Y as offset and half endmill diameter
  G0 Y` + (yoffset - 2).toFixed(3) + `
  G0 Z` + (zoffset + 5) + ` ; retract
  G0 X0 Y0 ; return

  G0 X4 Y4
  G0 Z1
  G38.2 X10 F50 ; Probe X`

  socket.emit('runJob', {data: holefindermacroStep1}, probeAutoReportCallback);

  socket.on('prbResult', function(prbdata) {
    if (prbdata.state > 0) {
      step++;
      console.log("Step " + step, prbdata);

      // Steps 1-3 just positions endmill for probes that count

      if (step == 4) {
        rightside = prbdata.x;
        const holefindermacroStep4 = `
        G4 P0.3
        G91
        G0 X-1
        G90
        G38.2 X-10 F50 ; Probe X`;

        socket.emit('runJob', {data: holefindermacroStep4}, probeAutoReportCallback);
      }

      if (step == 5) {
        leftside = prbdata.x;
        const centerdistance = (rightside - leftside);
        const holefindermacroStep5 = `
        G4 P0.3
        G91
        G0 X` + centerdistance / 2 + `
        G90
        G38.2 Y10 F50 ; Probe Y`;

        socket.emit('runJob', {data: holefindermacroStep5}, probeAutoReportCallback);
      }

      if (step == 6) {
        farside = prbdata.y;
        const holefindermacroStep6 = `
        G4 P0.3
        G91
        G0 Y-1
        G90
        G38.2 Y-10 F50 ; Probe Y`;

        socket.emit('runJob', {data: holefindermacroStep6}, probeAutoReportCallback);
      }

      if (step == 7) {
        nearside = prbdata.y;
        centerYdistance = (farside - nearside);
        const holefindermacroStep7 = `
        G4 P0.3
        G91
        G0 Y` + centerYdistance / 2 + `
        G90
        G38.2 X-10 F50 ; Probe Y`;

        socket.emit('runJob', {data: holefindermacroStep7}, probeAutoReportCallback);
      }

      if (step == 8) {
        leftside = prbdata.x;
        const holefindermacroStep8 = `
        G4 P0.3
        G91
        G0 X1
        G90
        G38.2 X10 F50 ; Probe Y`;

        socket.emit('runJob', {data: holefindermacroStep8}, probeAutoReportCallback);
      }

      if (step == 9) {
        rightside = prbdata.x;
        centerXdistance = (rightside - leftside);
        const holefindermacroStep9 = `
        G4 P0.3
        G91
        G0 X-` + centerXdistance / 2 + `
        G90
        G10 P0 L20 X0 Y0
        G0 Z` + (zoffset + 5) + ` ; retract`;

        socket.emit('runJob', {data: holefindermacroStep9}, function(success, report) {
          probeReport(success, report, "Remove the Probe Clip and Probe Plate before continuing.<hr> Approx Endmill Diameter: " + (12 - ((centerXdistance + centerYdistance) / 2)).toFixed(2) + "mm");
        });
      }
    }
  });
}
