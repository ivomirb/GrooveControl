"use strict";

const inputActions = [
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

  { // Toggle Jog Mode
    name: "jogToggleMode",
    friendlyName: "Toggle Continuous Jog",
    label: `<i class="fas fa-running fg-openbuilds fa-fw"></i> Toggle Continuous Jog`,
    defaultKey: "/",
    keydown: jogToggleMode,
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

  { // Increase Jog Speed
    name: "jogSpeedM",
    friendlyName: "Increase Jog Speed",
    label: `<i class="fas fa-fast-forward fg-openbuilds fa-fw"></i> Increase Jog Speed`,
    defaultKey: "0",
    keydown: () => {
      const currentJogOverride = $('#jro').data('slider').val();
      jogOverride(Math.max(currentJogOverride - 10, 10));
    },
  },

  { // Decrease Jog Speed
    name: "jogSpeedP",
    friendlyName: "Decrease Jog Speed",
    label: `<i class="fas fa-fast-backward fg-openbuilds fa-fw"></i> Decrease Jog Speed`,
    defaultKey: ".",
    keydown: () => {
      const currentJogOverride = $('#jro').data('slider').val();
      jogOverride(Math.min(currentJogOverride + 10, 100))
    },
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
        const hasJob = (useEditor && editor && editor.session.getLength() > 1) || (!useEditor && currentGcode != "");
        const doorOpen = laststatus.machine.inputs.includes('D');
        if (hasJob && !doorOpen) {
          runJobFile();
        }
      } else if (laststatus.comms.connectionStatus == 3 && laststatus.misc.jobStatus != 2) {
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
      if (laststatus.comms.connectionStatus == 5) {
        Metro.dialog.close($('.closeAlarmBtn').parent().parent());
        socket.emit('clearAlarm', 2);
      }
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
    name: "troInc",
    friendlyName: "Increase Speed",
    label: `<i class="far fa-hand-point-up fg-openbuilds fa-fw"></i> Increase Speed`,
    defaultKey: "w",
    keydown: () => {
      spindleOverride(laststatus.machine.overrides.spindleOverride + 10);
    },
  },

  { // Decrease Tool Speed Override
    name: "troDec",
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

const shortcutTooltips = [
  {
    id: "#xP, #probexP",
    tooltip2: "$xP",
  },
  {
    id: "#xM, #probexM",
    tooltip2: "$xM",
  },
  {
    id: "#yP, #probeyP",
    tooltip2: "$yP",
  },
  {
    id: "#yM, #probeyM",
    tooltip2: "$yM",
  },
  {
    id: "#zP, #probezP",
    tooltip2: "$zP",
  },
  {
    id: "#zM, #probezM",
    tooltip2: "$zM",
  },
  {
    id: "#axP",
    tooltip2: "$aP",
  },
  {
    id: "#aM",
    tooltip2: "$aM",
  },
  {
    id: '#toggleJogMode',
    tooltip: "Toggle between Incremental and Continuous jog",
    tooltip2: "$jogToggleMode",
  },
  {
    id: '#dist01label, #dist1label, #dist10label, #dist100label',
    tooltip: "Select step size for incremental jog",
    tooltip2: "Decrease $stepM\nIncrease $stepP",
  },
  {
    id: '*:has(>#jro)',
    tooltip: "Jog speed",
    tooltip2: "Decrease $jogSpeedM\nIncrease $jogSpeedP",
  },
  {
    id: '*:has(>#fro)',
    tooltip: "Feed rate override",
    tooltip2: "Decrease $froDec\nIncrease $froInc",
  },
  {
    id: '*:has(>#tro)',
    tooltip: "Tool speed override",
    tooltip2: "Decrease $troDec\nIncrease $troInc",
  },
  {
    id: '#runBtn',
    tooltip: "Start the job",
    tooltip2: "$playpause",
  },
  {
    id: '#resumeBtn',
    tooltip: "Resume the paused job",
    tooltip2: "$playpause",
  },
  {
    id: '#pauseBtn',
    tooltip: "Pause the running job",
    tooltip2: "$playpause",
  },
  {
    id: '#abortBtn, #abortBtn2, #abortBtn3',
    tooltip: "Emergency stop",
    tooltip2: "$estop",
  },
  {
    id: '#unlockBtn, #unlockBtn2, #unlockBtn3',
    tooltip: "Clear the alarm and unlock the controller",
    tooltip2: "$unlockAlarm",
  },
  {
    id: '#homeBtn',
    tooltip: "Home all axes",
    tooltip2: "$home",
  },
  {
    id: '#setZeroXYZ',
    tooltip: "Zero X, Y and Z",
    tooltip2: "$setzeroxyz",
  },
  {
    id: '#gotozeroWPosHotkey',
    menu: "$gotozeroxyz",
  },
  {
    id: '#openGcodeBtn',
    tooltip: "Open a G-code file",
    tooltip2: "$openFile",
  }
];

// returns "" if one more more hotkey is not set
function replaceHotkeyTokens(tooltip, forMenu) {
  for (const action of inputActions) {
    const token = '$' + action.name;
    if (tooltip.indexOf(token) >= 0) {
      let hotkey = "";
      if (!disableKeyboardShortcuts) {
        hotkey = keyboardShortcuts[action.name];
      }
      if (hotkey == "") {
        return "";
      }
      if (forMenu) {
        hotkey = capitalizeShortcut(hotkey);
      }
      else {
        hotkey = "Shortcut: " + capitalizeShortcut(hotkey);
      }
      tooltip = tooltip.replace(token, hotkey);
    }
  }
  return tooltip;
}

function updateButtonTooltips() {
  for (const tip of shortcutTooltips) {
    if (tip.tooltip2) {
      let tooltip2 = replaceHotkeyTokens(tip.tooltip2, false);
      if (tooltip2) {
        if (tip.tooltip) {
          $(tip.id).attr('title', tip.tooltip + "\n" + tooltip2);
        } else {
          $(tip.id).attr('title', tooltip2);
        }
      } else if (tip.tooltip) {
        $(tip.id).attr('title', tip.tooltip);
      } else {
        $(tip.id).attr('title', "");
      }
    } else if (tip.menu) {
      let menu = replaceHotkeyTokens(tip.menu, true);
      $(tip.id).html(menu);
    }
  }
}

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

function jogStepSize(dir) {
  $('#jogTypeContinuous').prop('checked', false);
  continuousJogMode = false;
  $('.distbtn').show();
  changeStepSize(dir);
}

function jogToggleMode() {
  continuousJogMode = !continuousJogMode;
  localStorage.setItem('continuousJog', continuousJogMode);
  $('#jogTypeContinuous').prop('checked', continuousJogMode);
  $('.distbtn').toggle(!continuousJogMode);
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
  initKeyboardActions();

  if (!isJogWidget) {
    updateButtonTooltips();
  }
}
