"use strict";

var disableKeyboardShortcuts = true;
var keyboardShortcuts = {};
var dlgContext = {};
var focusedKbdAction = undefined;
var kbdWarningShown = false;

var disableGamepad = true;
var buttonShortcuts = {};
var focusedButtonAction = undefined;

var gamepadId = null;
var controllerButtons = [];

var analogJogActive = false;
var analogJogActiveStart = false;
var analogStickDeadzone = 10;
var ANALOG_JOG_TIMEOUT = 10000; // deactivate after 10 seconds of inactivity

// Copied from metro.js - filters for text fields for which to suppress global hotkeys
// excludes: button, checkbox, file, hidden, image, password, radio, reset, search, submit, url
const textInputNodeNames = ["textarea", "input", "select"];
const textInputTypes = [
    "text", "password", "number", "email", "url", "range", "date", "month", "week", "time", "datetime",
    "datetime-local", "search", "color", "tel"];

const keyboardActions = [
  { // Activate Analog Jog
    name: "analogJogActivate",
    friendlyName: "Activate Analog Move",
    label: `Activate Analog Move<br><span class="text-small">Click to activate analog sticks</span>`,
    defaultKey: "",
    gamepad: true,
  },

  { // Precise Analog Move (25% speed)
    name: "analogJogPrecise",
    friendlyName: "Precise Analog Move",
    label: `Precise Analog Move<br><span class="text-small">Press and hold to move at 25% speed</span>`,
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
  if (dlgContext.probe) {
    $('#probe' + name).mousedown();
  } else {
    $('#' + name).mousedown();
  }
}

function jogKeyUp(name) {
  if (dlgContext.probe) {
    $('#probe' + name).mouseup();
  } else {
    $('#' + name).mouseup();
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
  for (const action of keyboardActions) {
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

function keyboardDocReady() {
  for (const action of keyboardActions) {
    keyboardShortcuts[action.name] = action.defaultKey;
  }

  if (localStorage.getItem('keyboardShortcuts')) {
    const settings = JSON.parse(localStorage.getItem('keyboardShortcuts'));
    for (const action of keyboardActions) {
      if (settings[action.name] != undefined) {
        keyboardShortcuts[action.name] = settings[action.name];
      } else {
        keyboardShortcuts[action.name] = "";
      }
    }
  }

  disableKeyboardShortcuts = localStorage.getItem('disableKeyboardShortcuts') == null || (JSON.parse(localStorage.getItem('disableKeyboardShortcuts')) == true);
  disableGamepad = localStorage.getItem('disableGamepad') == null || (JSON.parse(localStorage.getItem('disableGamepad')) == true);

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
    for (const action of keyboardActions) {
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

///////////////////////////////////////////////////////////////////////////////
// Keyboard specific

function onDocKeyDown(event) {
  const dlgVisible = $('.dialog').filter((i, dlg) => { return $(dlg).css('visibility') == 'visible'}).length > 0;

  // Remove focus from sliders before executing keyboard shortcuts (not sure if this is necessary, but doesn't seem to hurt anything)
  $('#jrocell').focusout();
  $('#trocell').focusout();
  $('#frocell').focusout();

  if (event.which === 116) {
    // F5 - reload interface
    event.preventDefault();
    location.reload();
    return;
  } else if (event.which === 117) {
    // F6 - switch to serial console and focus on Console Input
    event.preventDefault();
    if (!dlgVisible) {
      $("#controlTab").click();
      activateContentTab("consoletab");
      $("#command").focus();
    }
    return;
  } else if (event.which === 112) {
    // F1 - troubleshooting
    event.preventDefault();
    if (!dlgVisible) {
      $("#troubleshootingTab").click();
    }
    return;
  }

  if (disableKeyboardShortcuts) {
    return;
  }

  if (event.originalEvent.repeat) {
    return; // ignore auto-repeat
  }

  if (textInputNodeNames.includes(event.target.nodeName.toLowerCase()) ||
      textInputTypes.includes(event.target.type) ||
      event.target.hasAttribute('contenteditable')) {
    return;
  }

  let key = keyNameFromDownEvent(event);
  if (key == "") {
    return;
  }

  for (const action of keyboardActions) {
    if (keyboardShortcuts[action.name] == key && action.keydown) {
      if (!dlgVisible || dlgContext[action.dlgContext]) {
        event.preventDefault();
        action.keydown();
      }
      return;
    }
  }

  // Bind for Macro keys
  if (!dlgVisible) {
    for (const macro of buttonsarray) {
      if (macro.macrokeyboardshortcut == key) {
        event.preventDefault();
        runMacro(macro);
        return;
      }
    }
  }
}

function onDocKeyUp(event) {
  if (textInputNodeNames.includes(event.target.nodeName.toLowerCase()) ||
      textInputTypes.includes(event.target.type) ||
      event.target.hasAttribute('contenteditable')) {
    return;
  }

  let key = keyNameFromDownEvent(event);
  if (key == "") {
    return;
  }
  for (const action of keyboardActions) {
    if (keyboardShortcuts[action.name] == key && action.keyup) {
      event.preventDefault();
      action.keyup();
      return;
    }
  }
}

function keyNameFromDownEvent(event) {
  if (!event.key) return "";

  let keyName = "";
  if (event.altKey) {
    keyName += 'alt+'
  }
  if (event.ctrlKey) {
    keyName += 'ctrl+'
  }
  if (event.shiftKey) {
    keyName += 'shift+'
  }

  let keyLower = event.key.toLowerCase();
  if (keyLower != 'alt' && keyLower != 'control' && keyLower != 'shift') {
    // Handle MetroUI naming non-standards of some keys
    if (event.keyCode == 32) {
      keyName += 'space';
    } else if (keyLower == 'escape') {
      keyName += 'esc';
    } else if (keyLower == 'arrowleft') {
      keyName += 'left';
    } else if (keyLower == 'arrowright') {
      keyName += 'right';
    } else if (keyLower == 'arrowup') {
      keyName += 'up';
    } else if (keyLower == 'arrowdown') {
      keyName += 'down';
    } else if (keyLower == 'delete') {
      keyName += 'del';
    } else {
      keyName += keyLower;
    }
    return keyName;
  }

  return "";
}

function capitalizeShortcut(key) {
  let parts = key.split('+');
  let Parts = parts.map(x => x == "" ? "" : x[0].toUpperCase() + x.substr(1));
  return Parts.join('+');
}

function onShorcutKeyDown(event) {
  event.preventDefault();
  let newVal = keyNameFromDownEvent(event);
  if (newVal != "") {
    const inUse = keyInUse(newVal, false).inUse;
    const input = $('#' + focusedKbdAction.name + 'newKey');
    if (inUse) {
      $('#alreadyAssignedWarnKbd').html("\"" + capitalizeShortcut(newVal) + "\" is already assigned to " + keyInUse(newVal, false).source);
      $('#alreadyAssignedWarnKbd').show();
      input.parent().removeClass('primary').addClass('alert');
    } else {
      $('#alreadyAssignedWarnKbd').hide();
      input.val(capitalizeShortcut(newVal));
      input.parent().removeClass('alert').addClass('primary');
    }
  }
}

function onShortcutGetFocus(name) {
  const action = findKeyboardAction(name);

  if (focusedKbdAction != action) {
    if (focusedKbdAction) {
      const oldInput = $('#' + focusedKbdAction.name + 'newKey');
      oldInput.unbind('keydown');
      oldInput.parent().removeClass('primary').removeClass('alert');
    }
    const input = $('#' + name + 'newKey');
    input.parent().removeClass('alert').addClass('primary');
    $('#alreadyAssignedWarnKbd').hide();
    input.bind('keydown', onShorcutKeyDown);
    focusedKbdAction = action;
  }
}

function onShortcutLoseFocus() {
  if (focusedKbdAction) {
    const input = $('#' + focusedKbdAction.name + 'newKey');
    input.unbind('keydown');
    input.parent().removeClass('primary').removeClass('alert');
    $('#alreadyAssignedWarnKbd').hide();
    focusedKbdAction = undefined;
  }
}

function onShortcutInputChange(name) {
  const action = findKeyboardAction(name);
  const input = $('#' + action.name + 'newKey');
  if (input.val() == "") {
    input.parent().removeClass('alert');
    $('#alreadyAssignedWarnKbd').hide();
  }
}

function keyInUse(newVal, forMacro) {
  let inUse = false;
  let usedBy = false;

  // Check internally hardcoded keys
  if (newVal == "f1") {
    inUse = true;
    usedBy = "internal: Help";
  }
  else if (newVal == "f5") {
    inUse = true;
    usedBy = "internal: Refresh";
  }
  else if (newVal == "f6") {
    inUse = true;
    usedBy = "internal: Console";
  }

  // Check currently assigned Macros
  for (const macro of buttonsarray) {
    if (macro != currentEditMacro && newVal == macro.macrokeyboardshortcut) {
      inUse = true;
      usedBy = "macro: " + macro.title;
      break;
    }
  }

  if (forMacro) {
    // Check currently saved Keyboard Shortcuts
    for (const action of keyboardActions) {
      if (keyboardShortcuts[action.name] == newVal) {
        inUse = true;
        usedBy = "action: " + action.friendlyName;
        break;
      }
    }
  } else {
    // Check currently edited in keys, not saved yet
    for (const action of keyboardActions) {
      if (action != focusedKbdAction) {
        const input = $('#' + action.name + 'newKey');
        if (input.val().toLowerCase() == newVal) {
          inUse = true;
          usedBy = "action: " + action.friendlyName;
          break;
        }
      }
    }
  }

  return {
    inUse: inUse,
    source: usedBy
  };
}

function initKeyboardEditor() {
  focusedKbdAction = undefined;

  for (const action of keyboardActions) {
    if (action.gamepad) continue;
    $('#keyboardAssignmentForm').append(`
      <div class="row mt-1 ml-1 mr-1">
        <label class="cell-sm-6" style="margin-top:4px">` + action.label + `</label>
        <div class="cell-sm-6">
          <input type="text" readonly data-role="input" data-clear-button="true" data-editable="true"
              onfocus="onShortcutGetFocus('` + action.name + `')" onblur="onShortcutLoseFocus()" onchange="onShortcutInputChange('` + action.name + `')"
              id="` + action.name + `newKey" value="` + capitalizeShortcut(keyboardShortcuts[action.name]) + `" />
        </div>
      </div>`);
  }

  $('#enableKeyboardShortcuts').prop('checked', !disableKeyboardShortcuts);
  kbdWarningShown = !disableKeyboardShortcuts;
}

function applyKeyboardSettings() {
  keyboardShortcuts = {};
  for (const action of keyboardActions) {
    keyboardShortcuts[action.name] = action.gamepad ? "" : $('#' + action.name + 'newKey').val().toLowerCase();
  }

  localStorage.setItem('keyboardShortcuts', JSON.stringify(keyboardShortcuts));
  disableKeyboardShortcuts = !$('#enableKeyboardShortcuts').prop('checked');
  localStorage.setItem('disableKeyboardShortcuts', disableKeyboardShortcuts);
}

function showKbdWarning() {
  if (!$('#enableKeyboardShortcuts').prop('checked') || disabledWarnings.enableKbd || kbdWarningShown) {
    return;
  }
  kbdWarningShown = true;
  Metro.dialog.create({
    clsDialog: 'dark',
    leaveOverlayOnClose: true,
    title: "<i class='fas fa-exclamation-triangle'></i> Keyboard Shortcuts Enabled",
    content: `When enabling the keyboard shortcuts, examine the current key settings to learn their assigned functions.<br>` +
      `Change them as necessary to fit your preferred workflow.<br><br>` +
      `<b>Caution:</b> Some of the actions can be dangerous when triggered by an accidental keyboard click.<br><br>` +
      `<input id="disableKbdDlg" type="checkbox" data-role="checkbox" data-style="2" data-caption="Don't show this again"/>`,
    actions: [{
      caption: "OK",
      cls: "js-dialog-close warning",
      onclick: function() {
        if ($('#disableKbdDlg').prop('checked')) {
          disableWarning("enableKbd");
        }
      }
    }]
  });
}

  ///////////////////////////////////////////////////////////////////////////////
// Gamepad specific

function onButtonGetFocus(name) {
  const action = findKeyboardAction(name);
  if (focusedButtonAction != action) {
    if (focusedButtonAction) {
      const oldInput = $('#' + focusedButtonAction.name + 'newButton');
      oldInput.parent().removeClass('primary').removeClass('alert');
    }
    const input = $('#' + name + 'newButton');
    input.parent().removeClass('alert').addClass('primary');
    $('#alreadyAssignedWarnButton').hide();
    focusedButtonAction = action;
  }
}

function onButtonLoseFocus() {
  if (focusedButtonAction) {
    const input = $('#' + focusedButtonAction.name + 'newButton');
    input.parent().removeClass('primary').removeClass('alert');
    $('#alreadyAssignedWarnButton').hide();
    focusedButtonAction = undefined;
  }
}

function onButtonInputChange(name) {
  const action = findKeyboardAction(name);
  const input = $('#' + action.name + 'newButton');
  if (input.val() == "") {
    input.parent().removeClass('alert');
    $('#alreadyAssignedWarnButton').hide();
  }
}

function buttonInUse(newVal, forMacro) {
  let inUse = false;
  let usedBy = false;

  // Check currently assigned Macros
  for (const macro of buttonsarray) {
    if (macro != currentEditMacro && newVal == macro.macrokeyboardshortcut) {
      inUse = true;
      usedBy = "macro: " + macro.title;
      break;
    }
  }

  if (forMacro) {
    // Check currently saved button assignments
    for (const action of keyboardActions) {
      if (buttonShortcuts[action.name] == newVal) {
        inUse = true;
        usedBy = "action: " + action.friendlyName;
        break;
      }
    }
  } else {
    // Check currently edited buttons, not saved yet
    for (const action of keyboardActions) {
      if (action != focusedButtonAction) {
        const input = $('#' + action.name + 'newButton');
        if (input.val().toLowerCase() == newVal) {
          inUse = true;
          usedBy = "action: " + action.friendlyName;
          break;
        }
      }
    }
  }

  return {
    inUse: inUse,
    source: usedBy
  };
}

function handleButtonPress(button) {
  const dlgVisible = $('.dialog').filter((i, dlg) => { return $(dlg).css('visibility') == 'visible'}).length > 0;

  if (focusedButtonAction != undefined) {
    const input = $('#' + focusedButtonAction.name + 'newButton');
    const inUse = buttonInUse(button, false).inUse;
    if (inUse) {
      $('#alreadyAssignedWarnButton').html("\"" + capitalizeShortcut(button) + "\" is already assigned to " + buttonInUse(button, false).source);
      $('#alreadyAssignedWarnButton').show();
      input.parent().removeClass('primary').addClass('alert');
    } else {
      $('#alreadyAssignedWarnButton').hide();
      input.val(capitalizeShortcut(button));
      input.parent().removeClass('alert').addClass('primary');
    }
    return;
  }

  if ($('#macrokeyboardshortcut').is(':focus')) {
    const inUse = buttonInUse(button, true).inUse;
    if (inUse) {
      $('#alreadyAssignedWarnMacro').html("\"" + capitalizeShortcut(button) + "\" is already assigned to " + buttonInUse(button, true).source + "<br>");
      $('#alreadyAssignedWarnMacro').show();
      $('#macrokeyboardshortcut').parent().removeClass("primary").addClass("alert");
    } else {
      $('#alreadyAssignedWarnMacro').hide();
      $('#macrokeyboardshortcut').val(capitalizeShortcut(button));
      $('#macrokeyboardshortcut').parent().removeClass("alert").addClass("primary");
    }
    return;
  }

  for (const action of keyboardActions) {
    if (buttonShortcuts[action.name] == button && action.keydown) {
      if (!dlgVisible || dlgContext[action.dlgContext]) {
        action.keydown();
      }
      return;
    }
  }

  if (!dlgVisible) {
    for (const macro of buttonsarray) {
      if (macro.macrokeyboardshortcut == button) {
        runMacro(macro);
        return;
      }
    }
  }
}

function handleButtonRelease(button) {
  for (const action of keyboardActions) {
    if (buttonShortcuts[action.name] == button && action.keyup) {
      action.keyup();
      return;
    }
  }
}

function adjustDeadzone(value, deadzone) {
  if (value > 0) {
    value = Math.max((value - deadzone) / (1 - deadzone), 0);
  } else if (value < 0) {
    value = -Math.max((-value - deadzone) / (1 - deadzone), 0);
  }
  return value;
}

function updateGamepad() {
  if (gamepadId !== null && !disableGamepad) {
    const gamepad = navigator.getGamepads()[gamepadId];
    
    if (gamepad) {
      for (let i = 0; i < gamepad.buttons.length; i++) {
        const button = gamepad.buttons[i];
        if ((i < controllerButtons.length ? controllerButtons[i] : false) != button.pressed) {
          const name = "button " + (i+1);
          if (button.pressed) {
            handleButtonPress(name);
          } else {
            handleButtonRelease(name);
          }
        }
      }

      let activateIdx = -1;
      if (buttonShortcuts.analogJogActivate.startsWith("button ")) {
        const idx = parseInt(buttonShortcuts.analogJogActivate.substr(7)) - 1;
        if (idx >= 0 && idx < controllerButtons.length) {
          activateIdx = idx;
        }
      }

      let preciseIdx = -1;
      if (buttonShortcuts.analogJogPrecise.startsWith("button ")) {
        const idx = parseInt(buttonShortcuts.analogJogPrecise.substr(7)) - 1;
        if (idx >= 0 && idx < controllerButtons.length) {
          preciseIdx = idx;
        }
      }

      let enableAnalogJog = (laststatus.comms.connectionStatus == 2);
      if (enableAnalogJog && $('.dialog').filter((i, dlg) => { return $(dlg).css('visibility') == 'visible'}).length > 0) {
        enableAnalogJog = dlgContext.probe;
      }
      if (enableAnalogJog) {
        if (activateIdx != -1) {
          if (gamepad.buttons[activateIdx].pressed && !controllerButtons[activateIdx]) {
            gamepad.vibrationActuator.playEffect("dual-rumble", {startDelay: 0, duration: 75, strongMagnitude: 0, weakMagnitude: 0.75});
            analogJogActiveStart = new Date().getTime();
          } else if (analogJogActiveStart + ANALOG_JOG_TIMEOUT < new Date().getTime()) {
            enableAnalogJog = false; // timer expired
          }
        } else {
          analogJogActiveStart = false;
        }
      }

      controllerButtons = gamepad.buttons.map((x) => x.pressed);

      let stickX = 0, stickY = 0, stickZ = 0;
      if (enableAnalogJog) {
        const deadzone = analogStickDeadzone / 100;
        stickX = adjustDeadzone(gamepad.axes[0], deadzone);
        stickY = -adjustDeadzone(gamepad.axes[1], deadzone);
        stickZ = -adjustDeadzone(gamepad.axes[3], deadzone);
        if (preciseIdx != -1 && controllerButtons[preciseIdx]) {
          stickX *= 0.25;
          stickY *= 0.25;
          stickZ *= 0.25;
        }
      }

      if (stickX != 0 || stickY != 0 || stickZ != 0) {
        let jogSettings;
        if (!analogJogActive) {
          analogJogActive = true;
          const limits = computeMachineLimits(1);
          jogSettings = {
            minX: limits.minX, minY: limits.minY, minZ: limits.minZ,
            maxX: limits.maxX, maxY: limits.maxY, maxZ: limits.maxZ,
            hasSoftLimits: parseInt(grblParams.$20) == 1,
            speedXY: Math.min(parseFloat(grblParams.$110), parseFloat(grblParams.$111)),
            speedZ: parseFloat(grblParams.$112)
          };
        }
        socket.emit('analogJog', {dx: stickX, dy: stickY, dz: stickZ, settings: jogSettings});
        analogJogActiveStart = new Date().getTime();
      } else if (analogJogActive) {
        analogJogActive = false;
        socket.emit('analogJog', {stop: true});
      }

      requestAnimationFrame(updateGamepad);
    } else {
      gamepadId = null;
    }
  }

}

function onGamepadConnected(event) {
  $('#gamepadDisplay').removeClass('disabled').parent().attr('title', "Gamepad connected");
  gamepadId = event.gamepad.index;

  if (!disableGamepad) {
    requestAnimationFrame(updateGamepad);
  }
}

function onGamepadDisconnected() {
  $('#gamepadDisplay').addClass('disabled').parent().attr('title', `Gamepad disconnected
Press a button on the gamepad to activate`);
  gamepadId = null;
}

function initGamepadEditor() {
  for (const action of keyboardActions) {
    $('#gamepadAssignmentForm').append(`
      <div class="row mt-1 ml-1 mr-1">
        <label class="cell-sm-6" style="margin-top:4px">` + action.label + `</label>
        <div class="cell-sm-6">
          <input type="text" readonly data-role="input" data-clear-button="true" data-editable="true"
              onfocus="onButtonGetFocus('` + action.name + `')" onblur="onButtonLoseFocus()" onchange="onButtonInputChange('` + action.name + `')"
              id="` + action.name + `newButton" value="` + capitalizeShortcut(buttonShortcuts[action.name]) + `" />
        </div>
      </div>`);
  }

  $('#enableGamepad').prop('checked', !disableGamepad);
  $('#analogDeadzone').val(analogStickDeadzone);
}

function applyGamepadSettings() {
  for (const action of keyboardActions) {
    const newButton = $('#' + action.name + 'newButton').val().toLowerCase();
    buttonShortcuts[action.name] = newButton;
  }

  localStorage.setItem('buttonShortcuts', JSON.stringify(buttonShortcuts));

  analogStickDeadzone = Math.max(Math.min(parseInt($('#analogDeadzone').val()), 100), 0);
  localStorage.setItem('analogStickDeadzone', JSON.stringify(analogStickDeadzone));

  const disable = !$('#enableGamepad').prop('checked');

  if (disableGamepad && !disable) {
    $('#gamepadDisplay').show();
    if (gamepadId !== null) {
      requestAnimationFrame(updateGamepad);
    }
  }
  else if (!disableGamepad && disable) {
    $('#gamepadDisplay').hide();
  }
  disableGamepad = disable;

  localStorage.setItem('disableGamepad', disableGamepad);
}
