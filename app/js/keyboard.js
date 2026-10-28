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

  for (const action of inputActions) {
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
  for (const action of inputActions) {
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
    for (const action of inputActions) {
      if (keyboardShortcuts[action.name] == newVal) {
        inUse = true;
        usedBy = "action: " + action.friendlyName;
        break;
      }
    }
  } else {
    // Check currently edited in keys, not saved yet
    for (const action of inputActions) {
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

  for (const action of inputActions) {
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
  for (const action of inputActions) {
    keyboardShortcuts[action.name] = $('#' + action.name + 'newKey').val().toLowerCase();
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
