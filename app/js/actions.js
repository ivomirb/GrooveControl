"use strict";

const inputActions = [
  { // Activate Joystick Jog
    name: "analogJogActivate",
    friendlyName: "Activate Joystick Move",
    label: `Activate Joystick Move<br><span class="text-small">Click to activate joysticks</span>`,
    defaultKey: "",
    gamepad: true,
  },

  { // Precise Joystick Move (25% speed)
    name: "analogJogPrecise",
    friendlyName: "Precise Joystick Move",
    label: `Precise Joystick Move<br><span class="text-small">Press and hold to move at 25% speed</span>`,
    defaultKey: "",
    gamepad: true,
  },

  { // X+
    name: "xP",
    friendlyName: "Jog X+",
    label: `<i class="fas fa-arrow-right fg-red fa-fw"></i> Jog X+`,
    defaultKey: "right",
    keydown: () => { jogKeyDown("xP") },
    keyup: () => { jogKeyUp("xP") },
    dlgContext: "probe",
  },

  { // X-
    name: "xM",
    friendlyName: "Jog X-",
    label: `<i class="fas fa-arrow-left fg-red fa-fw"></i> Jog X-`,
    defaultKey: "left",
    keydown: () => { jogKeyDown("xM") },
    keyup: () => { jogKeyUp("xM") },
    dlgContext: "probe",
  },

  { // Y+
    name: "yP",
    friendlyName: "Jog Y+",
    label: `<i class="fas fa-arrow-up fg-green fa-fw"></i> Jog Y+`,
    defaultKey: "up",
    keydown: () => { jogKeyDown("yP") },
    keyup: () => { jogKeyUp("yP") },
    dlgContext: "probe",
  },

  { // Y-
    name: "yM",
    friendlyName: "Jog Y-",
    label: `<i class="fas fa-arrow-down fg-green fa-fw"></i> Jog Y-`,
    defaultKey: "down",
    keydown: () => { jogKeyDown("yM") },
    keyup: () => { jogKeyUp("yM") },
    dlgContext: "probe",
  },

  { // Z+
    name: "zP",
    friendlyName: "Jog Z+",
    label: `<i class="fas fa-arrow-up fg-blue fa-fw"></i> Jog Z+`,
    defaultKey: "pageup",
    keydown: () => { jogKeyDown("zP") },
    keyup: () => { jogKeyUp("zP") },
    dlgContext: "probe",
  },

  { // Z-
    name: "zM",
    friendlyName: "Jog Z-",
    label: `<i class="fas fa-arrow-down fg-blue fa-fw"></i>Jog Z-`,
    defaultKey: "pagedown",
    keydown: () => { jogKeyDown("zM") },
    keyup: () => { jogKeyUp("zM") },
    dlgContext: "probe",
  },

  { // A+
    name: "aP",
    friendlyName: "Jog A+",
    label: `<i class="fas fa-redo fg-orange fa-fw"></i> Jog A+`,
    defaultKey: "2",
    keydown: () => { jogKeyDown("aP") },
    keyup: () => { jogKeyUp("aP") },
  },

  { // A-
    name: "aM",
    friendlyName: "Jog A-",
    label: `<i class="fas fa-undo fg-orange fa-fw"></i> Jog A-`,
    defaultKey: "1",
    keydown: () => { jogKeyDown("aM") },
    keyup: () => { jogKeyUp("aM") },
  },

  { // Increase Step Size
    name: "stepP",
    friendlyName: "Increase Step Size",
    label: `<i class="fas fa-plus fg-openbuilds fa-fw"></i> Increase Step Size<br><span class="text-small">For Incremental Jogging</span>`,
    defaultKey: "+",
    keydown: () => { jogStepSize(1); },
  },

  { // Decrease Step Size
    name: "stepM",
    friendlyName: "Decrease Step Size",
    label: `<i class="fas fa-minus fg-openbuilds fa-fw"></i> Decrease Step Size<br><span class="text-small">For Incremental Jogging</span>`,
    defaultKey: "-",
    keydown: () => { jogStepSize(-1); },
  },

  { // Increase Step Size
    name: "jogSpeedM",
    friendlyName: "Increase Jog Speed",
    label: `<i class="fas fa-fast-forward fg-openbuilds fa-fw"></i> Increase Jog Speed`,
    defaultKey: "0",
    keydown: () => {
      const currentJogOverride = $('#jro').data('slider').val();
      jogOverride(Math.max(currentJogOverride - 10, 10));
    },
  },

  { // Decrease Step Size
    name: "jogSpeedP",
    friendlyName: "Decrease Jog Speed",
    label: `<i class="fas fa-fast-backward fg-openbuilds fa-fw"></i> Decrease Jog Speed`,
    defaultKey: ".",
    keydown: () => {
      const currentJogOverride = $('#jro').data('slider').val();
      jogOverride(Math.min(currentJogOverride + 10, 100))
    },
  },

  { // Incremental Jog Mode
    name: "incJogMode",
    friendlyName: "Incremental Jog Mode",
    label: `<i class="fas fa-step-forward fg-openbuilds fa-fw"></i> Incremental Jog Mode`,
    defaultKey: "/",
    keydown: () => { jogSetContinuous(false); },
  },

  { // Continuous Jog Mode
    name: "conJogMode",
    friendlyName: "Continuous Jog Mode",
    label: `<i class="fas fa-running fg-openbuilds fa-fw"></i> Continuous Jog Mode`,
    defaultKey: "*",
    keydown: () => { jogSetContinuous(true); },
  },

  { // Abort / Emergency
    name: "estop",
    friendlyName: "Stop / Abort",
    label: `<i class="fas fa-stop fg-openbuilds fa-fw"></i> Stop / Abort`,
    defaultKey: "esc",
    keydown: () => {
      socket.emit('stop', {stop: false, jog: false, abort: true});
    },
  },

  { // Start, Pause, Resume
    name: "playpause",
    friendlyName: "Run/Pause",
    label: `<i class="fas fa-play fg-openbuilds fa-fw"></i> Run / <i class="fas fa-pause fg-openbuilds fa-fw"></i> Pause`,
    defaultKey: "space",
    keydown: () => {
      if (laststatus.comms.connectionStatus == 2) {
        runJobFile();
      } else if (laststatus.comms.connectionStatus == 3) {
        socket.emit('pause', true);
      } else if (laststatus.comms.connectionStatus == 4) {
        socket.emit('resume', true);
      }
    },
  },

  { // Clear Alarm
    name: "unlockAlarm",
    friendlyName: "Unlock Alarm",
    label: `<i class="fas fa-bell fg-openbuilds fa-fw"></i> Unlock Alarm`,
    defaultKey: "end",
    keydown: () => {
      Metro.dialog.close($('.closeAlarmBtn').parent().parent());
      socket.emit('clearAlarm', 2);
    },
    dlgContext: "alarm",
  },

  { // Home All
    name: "home",
    friendlyName: "Home",
    label: `<i class="fas fa-home fg-openbuilds fa-fw"></i> Home`,
    defaultKey: "home",
    keydown: smartHome,
  },

  { // Set zero XYZ
    name: "setzeroxyz",
    friendlyName: "Setzero XYZ",
    label: `<i class="fas fa-crosshairs fg-openbuilds fa-fw"></i> Setzero XYZ`,
    defaultKey: "insert",
    keydown: () => {
      captureWcsHistory('Before <b>Set Zero XYZ</b>');
      sendGcode('G10 P0 L20 X0 Y0 Z0');
    },
  },

  { // Go to zero XYZ
    name: "gotozeroxyz",
    friendlyName: "Goto XYZ Zero",
    label: `<i class="fas fa-chart-line fg-openbuilds fa-fw"></i> Goto XYZ Zero`,
    defaultKey: "del",
    keydown: () => {
      sendGcode('G0 G21 G90');
      sendGcode('G0 Z5');
      sendGcode('G0 X0 Y0');
      sendGcode('G0 Z0');
    },
  },

  { // Increase Feedrate Override
    name: "froInc",
    friendlyName: "Increase Feed",
    label: `<i class="fas fa-level-up-alt fg-openbuilds fa-fw"></i> Increase Feed`,
    defaultKey: "q",
    keydown: () => {
      feedOverride(laststatus.machine.overrides.feedOverride + 10);
    },
  },

  { // Decrease Feedrate Override
    name: "froDec",
    friendlyName: "Decrease Feed",
    label: `<i class="fas fa-level-down-alt fg-openbuilds fa-fw"></i> Decrease Feed`,
    defaultKey: "a",
    keydown: () => {
      feedOverride(laststatus.machine.overrides.feedOverride - 10);
    },
  },

  { // Increase Tool Speed Override
    name: "toInc",
    friendlyName: "Decrease Speed",
    label: `<i class="far fa-hand-point-up fg-openbuilds fa-fw"></i> Increase Speed`,
    defaultKey: "w",
    keydown: () => {
      spindleOverride(laststatus.machine.overrides.spindleOverride + 10);
    },
  },

  { // Decrease Tool Speed Override
    name: "toDec",
    friendlyName: "Decrease Speed",
    label: `<i class="far fa-hand-point-down fg-openbuilds fa-fw"></i> Decrease Speed`,
    defaultKey: "s",
    keydown: () => {
      spindleOverride(laststatus.machine.overrides.spindleOverride - 10);
    },
  },

  { // Open File
    name: "openFile",
    friendlyName: "Open File",
    label: `<i class="fas fa-folder-open fg-openbuilds fa-fw"></i> Open File`,
    defaultKey: "ctrl+o",
    keydown: loadJobFile,
  },
];

function jogKeyDown(name) {
  if (laststatus && laststatus.comms.connectionStatus == 2) {
    if (dlgContext.probe) {
      $('#probe' + name).mousedown();
    } else {
      $('#' + name).mousedown();
    }
  }
}

function jogKeyUp(name) {
  if (laststatus && laststatus.comms.connectionStatus == 2) {
    if (dlgContext.probe) {
      $('#probe' + name).mouseup();
    } else {
      $('#' + name).mouseup();
    }
  }
}

function jogStepSize(event, dir) {
  event.preventDefault();
  $('#jogTypeContinuous').prop('checked', false);
  allowContinuousJog = false;
  $('.distbtn').show();
  changeStepSize(dir);
}

function jogSetContinuous(state) {
  localStorage.setItem('continuousJog', state);
  $('#jogTypeContinuous').prop('checked', state);
  allowContinuousJog = state;
  $('.distbtn').hide();
}

function addDlgContext(context) {
  dlgContext[context] = true;
}

function removeDlgContext(context) {
  dlgContext[context] = false;
}

function findKeyboardAction(name) {
  for (const action of inputActions) {
    if (action.name == name) {
      return action;
    }
  }
  return null;
}

function runMacro(macro) {
  if (macro.codetype == "gcode") {
    sendGcode(macro.gcode);
  } else if (macro.codetype == "javascript") {
    if (!macro.jsrunonstartup) {
      executeJS(macro.javascript);
    } else {
      Metro.toast.create("Macro: <b>" + macro.title + "</b> is an autorun macro, it runs when CONTROL starts. You cannot run it using the button. You can edit or delete it using the <i class='fas fa-cogs'></i> Edit Macro tool", null, 3000, "bg-darkRed fg-white")
    }
  }
}

function actionsDocReady() {
  for (const action of inputActions) {
    keyboardShortcuts[action.name] = action.defaultKey;
  }

  if (localStorage.getItem('keyboardShortcuts')) {
    let settings = JSON.parse(localStorage.getItem('keyboardShortcuts'));
    for (const action of inputActions) {
      if (settings[action.name] != undefined) {
        keyboardShortcuts[action.name] = settings[action.name];
      } else {
        keyboardShortcuts[action.name] = "";
      }
    }
  }

  disableKeyboardShortcuts = localStorage.getItem('disableKeyboardShortcuts') == null || (JSON.parse(localStorage.getItem('disableKeyboardShortcuts')) == true);
  disableGamepad = localStorage.getItem('disableGamepad') == null || JSON.parse(localStorage.getItem('disableGamepad')) == true;

  analogStickInvertX = localStorage.getItem('analogStickInvertX') != null && JSON.parse(localStorage.getItem('analogStickInvertX')) == true;
  analogStickInvertY = localStorage.getItem('analogStickInvertY') != null && JSON.parse(localStorage.getItem('analogStickInvertY')) == true;
  analogStickInvertZ = localStorage.getItem('analogStickInvertZ') != null && JSON.parse(localStorage.getItem('analogStickInvertZ')) == true;

  // Remove Keyboard Bindings from Override Sliders
  $("#jrocell").find(".marker").unbind(Metro.events.keydown);
  $("#trocell").find(".marker").unbind(Metro.events.keydown);
  $("#frocell").find(".marker").unbind(Metro.events.keydown);
  $("#jrocell").find(".marker").unbind(Metro.events.keyup);
  $("#trocell").find(".marker").unbind(Metro.events.keyup);
  $("#frocell").find(".marker").unbind(Metro.events.keyup);

  $(document).bind('keydown', null, onDocKeyDown);
  $(document).bind('keyup', null, onDocKeyUp);

  if (localStorage.getItem('buttonShortcuts')) {
    const settings = JSON.parse(localStorage.getItem('buttonShortcuts'));
    for (const action of inputActions) {
      if (settings[action.name] != undefined) {
        buttonShortcuts[action.name] = settings[action.name];
      } else {
        buttonShortcuts[action.name] = "";
      }
    }
  }

  window.addEventListener("gamepadconnected", onGamepadConnected);
  window.addEventListener("gamepaddisconnected", onGamepadDisconnected);
  $('#gamepadDisplay').toggle(!disableGamepad);

  if (localStorage.getItem('analogStickDeadzone')) {
    analogStickDeadzone = Math.max(Math.min(parseInt(localStorage.getItem('analogStickDeadzone')), 100), 0);
  }
}
