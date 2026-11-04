"use strict";

var disableGamepad = true;
var gamepadShortcuts = {};
var focusedGamepadAction = undefined;
var gamepadWarningShown = false;
var gamepadUpAction = undefined;
var gamepadPreset = undefined;
var gamepadComboIdx = -1;

var gamepadId = null;
var gamepadButtonState = [];

var analogJogActive = false;
var analogJogActiveStart = false;
var ANALOG_JOG_TIMEOUT = 10000; // deactivate after 10 seconds of inactivity
var analogStickSettings = {
  deadzone: 10,
  invertX: false,
  invertY: false,
  invertZ: false,
};

var gamepadEditorActive = false;
var gamepadEditorPreset = undefined;
var gamepadEditorComboIdx = undefined;
var gamepadEditorShortcuts = undefined;
var analogViewCtx;
var analogViewSize;

const gamepadPresetXbox = [
  "A",
  "B",
  "X",
  "Y",
  "LB",
  "RB",
  "LT",
  "RT",
  "View",
  "Menu",
  "Left Stick",
  "Right Stick",
  "D-Pad Up",
  "D-Pad Down",
  "D-Pad Left",
  "D-Pad Right",
];

const gamepadPresets = [
  {name: "Default", preset: []},
  {name: "Xbox One", preset: gamepadPresetXbox},
];

function getGamepadButtonName(button) {
  const preset = gamepadEditorActive ? gamepadEditorPreset : gamepadPreset;
  let prefix = "";
  if (button[0] == '*') {
    button = button.substr(1);
    const comboIdx = gamepadEditorActive ? gamepadEditorComboIdx : gamepadComboIdx;
    if (comboIdx >= 0) {
      prefix = comboIdx < preset.preset.length ? preset.preset[comboIdx] : ("Button " + (comboIdx+1));
      prefix += " + ";
    } else {
      prefix = "Combo + ";
    }
  }
  if (button.startsWith("button ")) {
    const index = parseInt(button.substr(7));
    if (index > 0 && index <= preset.preset.length) {
      const name = preset.preset[index - 1];
      if (name) {
        return prefix + name;
      }
    }
    return prefix + "Button " + index;
  }
  return prefix + button;
}

function onButtonGetFocus(name) {
  const action = findInputAction(name);
  if (focusedGamepadAction != action) {
    if (focusedGamepadAction) {
      const oldInput = $('#' + focusedGamepadAction.name + 'newButton');
      oldInput.parent().removeClass('primary').removeClass('alert');
    }
    const input = $('#' + name + 'newButton');
    input.parent().removeClass('alert').addClass('primary');
    $('#alreadyAssignedWarnButton').hide();
    focusedGamepadAction = action;
  }
}

function onButtonLoseFocus() {
  if (focusedGamepadAction) {
    const input = $('#' + focusedGamepadAction.name + 'newButton');
    input.parent().removeClass('primary').removeClass('alert');
    $('#alreadyAssignedWarnButton').hide();
    focusedGamepadAction = undefined;
  }
}

function onButtonInputChange(name) {
  const action = findInputAction(name);
  const input = $('#' + action.name + 'newButton');
  if (input.val() == "") {
    gamepadEditorShortcuts[action.name] = "";
    if (name == "combo") {
      gamepadEditorComboIdx = -1;
      onGamepadPresetChange();
    }
    input.parent().removeClass('alert');
    $('#alreadyAssignedWarnButton').hide();
  }
}

function buttonInUse(newVal, forMacro) {
  let inUse = false;
  let usedBy = false;

  // Check currently assigned Macros
  for (const macro of buttonsarray) {
    if (macro != currentEditMacro && newVal == macro.shortcut) {
      inUse = true;
      usedBy = "macro: " + macro.title;
      break;
    }
  }

  if (forMacro) {
    // Check currently saved button assignments
    for (const action of inputActions) {
      if (gamepadShortcuts[action.name] == newVal) {
        inUse = true;
        usedBy = "action: " + action.friendlyName;
        break;
      }
    }
  } else {
    // Check currently edited buttons, not saved yet
    for (const action of inputActions) {
      if (action != focusedGamepadAction) {
        if (gamepadEditorShortcuts[action.name] == newVal) {
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
  if ($('#macrokeyboardshortcut').is(':focus')) {
    const inUse = buttonInUse(button, true).inUse;
    if (inUse) {
      $('#alreadyAssignedWarnMacro').html("\"" + getGamepadButtonName(button) + "\" is already assigned to " + buttonInUse(button, true).source + "<br>");
      $('#alreadyAssignedWarnMacro').show();
      $('#macrokeyboardshortcut').parent().removeClass('primary').addClass('alert');
    } else {
      $('#alreadyAssignedWarnMacro').hide();
      $('#macrokeyboardshortcut').val(getGamepadButtonName(button));
      $('#macrokeyboardshortcut').parent().removeClass('alert').addClass('primary');
      currentEditMacroButton = button;
    }
    return;
  }

  const dlgVisible = $('.dialog').filter((i, dlg) => { return $(dlg).css('visibility') == 'visible'}).length > 0;

  for (const action of inputActions) {
    if (gamepadShortcuts[action.name] == button && action.keydown) {
      if (!dlgVisible || dlgContext[action.dlgContext]) {
        if (gamepadUpAction) {
          gamepadUpAction.keyup();
          gamepadUpAction = undefined;
        }
        action.keydown();
        if (action.keyup) {
          gamepadUpAction = action;
        }
      }
      return;
    }
  }

  if (!dlgVisible) {
    for (let macroIdx = 0; macroIdx < buttonsarray.length; macroIdx++) {
      if (buttonsarray[macroIdx].shortcut == button) {
        runMacro(macroIdx);
        return;
      }
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
  if (gamepadUpAction && !dlgContext[gamepadUpAction.dlgContext]) {
    const dlgVisible = $('.dialog').filter((i, dlg) => { return $(dlg).css('visibility') == 'visible'}).length > 0;
    if (dlgVisible) {
      gamepadUpAction.keyup();
      gamepadUpAction = undefined;
    }
  }

  if (gamepadEditorActive || disableGamepad) return;

  if (gamepadId !== null) {
    const gamepad = navigator.getGamepads()[gamepadId];

    if (gamepad) {
      const isComboPressed = gamepadComboIdx >= 0 && gamepad.buttons[gamepadComboIdx].pressed;

      if (gamepadUpAction) {
        let name = gamepadShortcuts[gamepadUpAction.name];
        const isCombo = (name[0] == '*');
        const idx = parseInt(name.substr(isCombo ? 8 : 7)) - 1;
        if ((isCombo && !isComboPressed) || !gamepad.buttons[idx].pressed) {
          gamepadUpAction.keyup();
          gamepadUpAction = undefined;
        }
      }

      for (let i = 0; i < gamepad.buttons.length; i++) {
        const button = gamepad.buttons[i];
        if (i != gamepadComboIdx && (i < gamepadButtonState.length ? gamepadButtonState[i] : false) != button.pressed) {
          if (button.pressed) {
            let name = "button " + (i+1);
            if (isComboPressed) {
              name = '*' + name;
            }
            handleButtonPress(name);
          }
        }
      }

      gamepadButtonState = gamepad.buttons.map((x) => x.pressed);

      let preciseIdx = -1;
      if (gamepadShortcuts.analogJogPrecise.startsWith("button ")) {
        const idx = parseInt(gamepadShortcuts.analogJogPrecise.substr(7)) - 1;
        if (idx >= 0 && idx < gamepad.buttons.length) {
          preciseIdx = idx;
        }
      }

      let enableAnalogJog = (laststatus.comms.connectionStatus == 2);
      if (enableAnalogJog && $('.dialog').filter((i, dlg) => { return $(dlg).css('visibility') == 'visible'}).length > 0) {
        enableAnalogJog = dlgContext.probe;
      }
      if (enableAnalogJog && analogJogActiveStart + ANALOG_JOG_TIMEOUT < new Date().getTime()) {
        enableAnalogJog = false; // timer expired
      }

      let stickX = 0, stickY = 0, stickZ = 0;
      if (enableAnalogJog) {
        const deadzone = analogStickSettings.deadzone / 100;
        stickX = adjustDeadzone(gamepad.axes[0], deadzone);
        if (analogStickSettings.invertX) {
          stickX = -stickX;
        }
        stickY = -adjustDeadzone(gamepad.axes[1], deadzone);
        if (analogStickSettings.invertY) {
          stickY = -stickY;
        }
        stickZ = -adjustDeadzone(gamepad.axes[3], deadzone);
        if (analogStickSettings.invertZ) {
          stickZ = -stickZ;
        }
        if (preciseIdx != -1 && gamepadButtonState[preciseIdx]) {
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
            enableLimits: parseInt(grblParams.$20) == 1,
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

  if (gamepadEditorActive) {
    requestAnimationFrame(updateGamepadEditor);
  } else if (!disableGamepad) {
    requestAnimationFrame(updateGamepad);
  }
}

function onGamepadDisconnected() {
  $('#gamepadDisplay').addClass('disabled').parent().attr('title', `Gamepad disconnected
Press a button on the gamepad to activate`);
  gamepadId = null;
  if (analogJogActive) {
    analogJogActive = false;
    socket.emit('analogJog', {stop: true});
  }
}

function updateGamepadEditor() {
  if (!gamepadEditorActive) return;
  if (gamepadId !== null) {
    const gamepad = navigator.getGamepads()[gamepadId];
    
    if (gamepad) {
        if (focusedGamepadAction != undefined) {
        let isComboPressed = gamepadEditorComboIdx >= 0 && gamepad.buttons[gamepadEditorComboIdx].pressed;

        for (let i = 0; i < gamepad.buttons.length; i++) {
          const button = gamepad.buttons[i];
          if (i != gamepadEditorComboIdx && (i < gamepadButtonState.length ? gamepadButtonState[i] : false) != button.pressed) {
            if (button.pressed) {
              let name = "button " + (i+1);
              if (isComboPressed) {
                name = '*' + name;
              }
              const input = $('#' + focusedGamepadAction.name + 'newButton');
              const inUse = buttonInUse(name, false).inUse;
              if (isComboPressed && focusedGamepadAction.singleKey) {
                $('#alreadyAssignedWarnButton').html("This action does not support button combos");
                $('#alreadyAssignedWarnButton').show();
                input.parent().removeClass('primary').addClass('alert');
              } else if (inUse) {
                $('#alreadyAssignedWarnButton').html("\"" + getGamepadButtonName(name) + "\" is already assigned to " + buttonInUse(name, false).source);
                $('#alreadyAssignedWarnButton').show();
                input.parent().removeClass('primary').addClass('alert');
              } else {
                $('#alreadyAssignedWarnButton').hide();
                gamepadEditorShortcuts[focusedGamepadAction.name] = name;
                input.val(getGamepadButtonName(name));
                input.parent().removeClass('alert').addClass('primary');
                if (focusedGamepadAction.name == "combo") {
                  gamepadEditorComboIdx = i;
                  onGamepadPresetChange();
                }
              }
              break;
            }
          }
        }
      }

      gamepadButtonState = gamepad.buttons.map((x) => x.pressed);

      if (analogViewCtx) {
        analogViewCtx.clearRect(0, 0, analogViewSize.width, analogViewSize.height);

        if ($('#enableGamepad').prop('checked')) {
          let stickX = gamepad.axes[0];
          if ($('#gamepadInvertX').prop('checked')) {
            stickX = -stickX;
          }
          let stickY = gamepad.axes[1];
          if ($('#gamepadInvertY').prop('checked')) {
            stickY = -stickY;
          }
          let stickZ = gamepad.axes[3];
          if ($('#gamepadInvertZ').prop('checked')) {
            stickZ = -stickZ;
          }

          const MarkerSize = 5;
          const Center = analogViewSize.height / 2;
          const Range = analogViewSize.height / 2 - MarkerSize;
          const ZOffset = analogViewSize.height + 5;
          const Deadzone = Math.max(Math.min(parseInt($('#analogDeadzone').val()), 100), 0) * Range / 100;

          analogViewCtx.lineWidth = 1;

          analogViewCtx.strokeStyle = "#00BF00";
          analogViewCtx.beginPath();
          analogViewCtx.rect(Center - Deadzone, Center - Deadzone, 2 * Deadzone, 2 * Deadzone);
          analogViewCtx.moveTo(ZOffset, Center - Deadzone);
          analogViewCtx.lineTo(ZOffset + 2*MarkerSize, Center - Deadzone);
          analogViewCtx.moveTo(ZOffset, Center + Deadzone);
          analogViewCtx.lineTo(ZOffset + 2*MarkerSize, Center + Deadzone);
          analogViewCtx.stroke();

          analogViewCtx.strokeStyle = ThemeData.currentThemeId == "light" ? "#444" : "#ddd";
          analogViewCtx.fillStyle = analogViewCtx.strokeStyle;
          analogViewCtx.beginPath();
          analogViewCtx.rect(0, 0, analogViewSize.height, analogViewSize.height);
          analogViewCtx.stroke();

          const x = Center + Range * stickX;
          const y = Center + Range * stickY;
          const z = Center + Range * stickZ;

          analogViewCtx.beginPath();
          analogViewCtx.moveTo(x - MarkerSize, y);
          analogViewCtx.lineTo(x + MarkerSize, y);
          analogViewCtx.moveTo(x, y - MarkerSize);
          analogViewCtx.lineTo(x, y + MarkerSize);
          analogViewCtx.stroke();

          analogViewCtx.beginPath();
          analogViewCtx.moveTo(ZOffset + 2*MarkerSize, z);
          analogViewCtx.lineTo(ZOffset + 3*MarkerSize, z - MarkerSize);
          analogViewCtx.lineTo(ZOffset + 3*MarkerSize, z + MarkerSize);
          analogViewCtx.lineTo(ZOffset + 2*MarkerSize, z);
          analogViewCtx.fill();
        }
      }

      requestAnimationFrame(updateGamepadEditor);
    } else {
      gamepadId = null;
    }
  }
}

function onGamepadPresetChange() {
  gamepadEditorPreset = gamepadPresets[parseInt($('#selectButtonPreset').val())];
  for (const action of inputActions) {
    const input = $('#' + action.name + 'newButton');
    input.val(getGamepadButtonName(gamepadEditorShortcuts[action.name]));
  }
}

function initGamepadEditor() {
  gamepadEditorShortcuts = {};
  for (const action of inputActions) {
    gamepadEditorShortcuts[action.name] = gamepadShortcuts[action.name];
    $('#gamepadAssignmentForm').append(`
      <div class="row mt-1 ml-1 mr-1">
        <label class="cell-sm-6" style="margin-top:4px">` + action.label + `</label>
        <div class="cell-sm-6">
          <input type="text" readonly data-role="input" data-clear-button="true" data-editable="true"
              onfocus="onButtonGetFocus('` + action.name + `')" onblur="onButtonLoseFocus()" onchange="onButtonInputChange('` + action.name + `')"
              id="` + action.name + `newButton" value="` + getGamepadButtonName(gamepadShortcuts[action.name]) + `" />
        </div>
      </div>`);
  }

  $('#enableGamepad').prop('checked', !disableGamepad);
  $('#analogDeadzone').val(analogStickSettings.deadzone);
  $('#gamepadInvertX').prop('checked', analogStickSettings.invertX);
  $('#gamepadInvertY').prop('checked', analogStickSettings.invertY);
  $('#gamepadInvertZ').prop('checked', analogStickSettings.invertZ);
  gamepadWarningShown = !disableGamepad;

  const canvas = document.getElementById('gamepadViewCanvas');
  analogViewCtx = canvas.getContext("2d");
  analogViewSize = canvas.getBoundingClientRect();
  if (analogJogActive) {
    analogJogActive = false;
    socket.emit('analogJog', {stop: true});
  }

  for (let i = 0; i < gamepadPresets.length; i++) {
    $('#selectButtonPreset').append('<option value="' + i + '">' + gamepadPresets[i].name + '</option>');
  }
  $('#selectButtonPreset').val(gamepadPresets.indexOf(gamepadPreset));

  gamepadEditorPreset = gamepadPreset;
  gamepadEditorComboIdx = gamepadComboIdx;
  gamepadEditorActive = true;
  if (gamepadId !== null) {
    requestAnimationFrame(updateGamepadEditor);
  }
}

function closeGamepadEditor() {
  analogViewCtx = undefined;
  gamepadEditorActive = false;
  if (gamepadId !== null && !disableGamepad) {
    requestAnimationFrame(updateGamepad);
  }
  gamepadEditorPreset = undefined;
  gamepadEditorComboIdx = undefined;
  gamepadEditorShortcuts = undefined;
}

function applyGamepadSettings() {
  if (gamepadPreset != gamepadEditorPreset) {
    gamepadPreset = gamepadEditorPreset;
    populateMacroButtons();
  }
  gamepadComboIdx = gamepadEditorComboIdx;
  for (const action of inputActions) {
    gamepadShortcuts[action.name] = gamepadEditorShortcuts[action.name];
  }

  localStorage.setItem('gamepadShortcuts', JSON.stringify(gamepadShortcuts));

  analogStickSettings.deadzone = Math.max(Math.min(parseInt($('#analogDeadzone').val()), 100), 0);
  analogStickSettings.invertX = $('#gamepadInvertX').prop('checked');
  analogStickSettings.invertY = $('#gamepadInvertY').prop('checked');
  analogStickSettings.invertZ = $('#gamepadInvertZ').prop('checked');
  localStorage.setItem('analogStickSettings', JSON.stringify(analogStickSettings));

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

  localStorage.setItem('gamepadPreset', gamepadPreset.name);
  closeGamepadEditor();
}

function cancelGamepadSettings() {
  closeGamepadEditor();
}

function showGamepadWarning() {
  if (!$('#enableGamepad').prop('checked') || disabledWarnings.enableGamepad || gamepadWarningShown) {
    return;
  }
  gamepadWarningShown = true;
  metroTopDialog({
    clsDialog: 'dark',
    title: "<i class='fas fa-exclamation-triangle'></i> Gamepad Enabled",
    content: `To prevent unwanted movement when the analog sticks are bumped accidentally, it is recommended that you assign a button to the ` +
      `<b>Activate Joystick Move</b> action. If a button is assigned to that action, the sticks will be disabled until the button is pressed. ` +
      `The sticks will be disabled again after 10 seconds of inactivity.<br><br>` +
      `<input id="disableGamepadDlg" type="checkbox" data-role="checkbox" data-style="2" data-caption="Don't show this again"/>`,
    actions: [{
      caption: "OK",
      cls: "js-dialog-close warning",
      onclick: function() {
        if ($('#disableGamepadDlg').prop('checked')) {
          disableWarning("enableGamepad");
        }
      }
    }]
  });
}

function initGamepadActions() {
  for (const action of inputActions) {
    gamepadShortcuts[action.name] = "";
  }

  disableGamepad = localStorage.getItem('disableGamepad') == null || JSON.parse(localStorage.getItem('disableGamepad')) == true;

  if (localStorage.getItem('gamepadShortcuts')) {
    const settings = JSON.parse(localStorage.getItem('gamepadShortcuts'));
    for (const action of inputActions) {
      if (settings[action.name] != undefined) {
        gamepadShortcuts[action.name] = settings[action.name];
      }
    }
  }

  if (localStorage.getItem('analogStickSettings')) {
    const settings = JSON.parse(localStorage.getItem('analogStickSettings'));
    if (settings.deadzone != undefined) { analogStickSettings.deadzone = settings.deadzone; }
    if (settings.invertX != undefined) { analogStickSettings.invertX = settings.invertX; }
    if (settings.invertY != undefined) { analogStickSettings.invertY = settings.invertY; }
    if (settings.invertZ != undefined) { analogStickSettings.invertZ = settings.invertZ; }
  }

  $('#gamepadDisplay').toggle(!disableGamepad);
  window.addEventListener('gamepadconnected', onGamepadConnected);
  window.addEventListener('gamepaddisconnected', onGamepadDisconnected);
  onGamepadDisconnected();

  gamepadPreset = gamepadPresets[0];
  const presetName = localStorage.getItem('gamepadPreset');
  for (const preset of gamepadPresets) {
    if (preset.name == presetName) {
      gamepadPreset = preset;
      break;
    }
  }

  gamepadComboIdx = -1;
  if (gamepadShortcuts.combo.startsWith("button ")) {
    gamepadComboIdx = parseInt(gamepadShortcuts.combo.substr(7)) - 1;
  }
}
