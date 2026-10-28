"use strict";

var disableGamepad = true;
var buttonShortcuts = {};
var focusedButtonAction = undefined;
var gamepadWarningShown = false;

var gamepadId = null;
var controllerButtons = [];

var analogJogActive = false;
var analogJogActiveStart = false;
var analogStickDeadzone = 10;
var analogStickInvertX = false;
var analogStickInvertY = false;
var analogStickInvertZ = false;
var ANALOG_JOG_TIMEOUT = 10000; // deactivate after 10 seconds of inactivity

var gamepadEditorActive = false;
var analogViewCtx;
var analogViewSize;

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
    for (const action of inputActions) {
      if (buttonShortcuts[action.name] == newVal) {
        inUse = true;
        usedBy = "action: " + action.friendlyName;
        break;
      }
    }
  } else {
    // Check currently edited buttons, not saved yet
    for (const action of inputActions) {
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

  if (disableGamepad) {
    return;
  }

  const dlgVisible = $('.dialog').filter((i, dlg) => { return $(dlg).css('visibility') == 'visible'}).length > 0;

  for (const action of inputActions) {
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
  for (const action of inputActions) {
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
  if (gamepadEditorActive) return;
  if (gamepadId !== null) {
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

      const previousButtons = controllerButtons;
      controllerButtons = gamepad.buttons.map((x) => x.pressed);

      if (disableGamepad) {
        return;
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
          if (controllerButtons[activateIdx] && !previousButtons[activateIdx]) {
            gamepad.vibrationActuator.playEffect("dual-rumble", {startDelay: 0, duration: 75, strongMagnitude: 0, weakMagnitude: 0.75});
            analogJogActiveStart = new Date().getTime();
          } else if (analogJogActiveStart + ANALOG_JOG_TIMEOUT < new Date().getTime()) {
            enableAnalogJog = false; // timer expired
          }
        } else {
          analogJogActiveStart = false;
        }
      }

      let stickX = 0, stickY = 0, stickZ = 0;
      if (enableAnalogJog) {
        const deadzone = analogStickDeadzone / 100;
        stickX = adjustDeadzone(gamepad.axes[0], deadzone);
        if (analogStickInvertX) {
          stickX = -stickX;
        }
        stickY = -adjustDeadzone(gamepad.axes[1], deadzone);
        if (analogStickInvertY) {
          stickY = -stickY;
        }
        stickZ = -adjustDeadzone(gamepad.axes[3], deadzone);
        if (analogStickInvertZ) {
          stickZ = -stickZ;
        }
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

      if (focusedButtonAction != undefined) {
        for (let i = 0; i < gamepad.buttons.length; i++) {
          const button = gamepad.buttons[i];
          if ((i < controllerButtons.length ? controllerButtons[i] : false) != button.pressed) {
            const name = "button " + (i+1);
            if (button.pressed) {
              const input = $('#' + focusedButtonAction.name + 'newButton');
              const inUse = buttonInUse(name, false).inUse;
              if (inUse) {
                $('#alreadyAssignedWarnButton').html("\"" + capitalizeShortcut(name) + "\" is already assigned to " + buttonInUse(name, false).source);
                $('#alreadyAssignedWarnButton').show();
                input.parent().removeClass('primary').addClass('alert');
              } else {
                $('#alreadyAssignedWarnButton').hide();
                input.val(capitalizeShortcut(name));
                input.parent().removeClass('alert').addClass('primary');
              }
              break;
            }
          }
        }
      }

      controllerButtons = gamepad.buttons.map((x) => x.pressed);

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
          const ZOffset = analogViewSize.height + 12;
          const Deadzone = Math.max(Math.min(parseInt($('#analogDeadzone').val()), 100), 0) * Range / 100;

          analogViewCtx.lineWidth = 1;

          analogViewCtx.strokeStyle = "#00BF00";
          analogViewCtx.beginPath();
          analogViewCtx.rect(Center - Deadzone, Center - Deadzone, 2 * Deadzone, 2 * Deadzone);
          analogViewCtx.moveTo(ZOffset - MarkerSize - 2, Center - Deadzone);
          analogViewCtx.lineTo(ZOffset + MarkerSize + 2, Center - Deadzone);
          analogViewCtx.moveTo(ZOffset - MarkerSize - 2, Center + Deadzone);
          analogViewCtx.lineTo(ZOffset + MarkerSize + 2, Center + Deadzone);
          analogViewCtx.stroke();

          analogViewCtx.strokeStyle = ThemeData.currentThemeId == "light" ? "#000000" : "#FFFFFF";
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
          analogViewCtx.moveTo(ZOffset - MarkerSize, z);
          analogViewCtx.lineTo(ZOffset + MarkerSize, z);
          analogViewCtx.moveTo(ZOffset, z - 2);
          analogViewCtx.lineTo(ZOffset, z + 2);
          analogViewCtx.stroke();
        }
      }

      requestAnimationFrame(updateGamepadEditor);
    } else {
      gamepadId = null;
    }
  }

}

function initGamepadEditor() {
  for (const action of inputActions) {
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
  $('#gamepadInvertX').prop('checked', analogStickInvertX);
  $('#gamepadInvertY').prop('checked', analogStickInvertY);
  $('#gamepadInvertZ').prop('checked', analogStickInvertZ);
  gamepadWarningShown = !disableGamepad;

  const canvas = document.getElementById("gamepadViewCanvas");
  analogViewCtx = canvas.getContext("2d");
  analogViewSize = canvas.getBoundingClientRect();
  if (analogJogActive) {
    analogJogActive = false;
    socket.emit('analogJog', {stop: true});
  }
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
}

function applyGamepadSettings() {
  for (const action of inputActions) {
    const newButton = $('#' + action.name + 'newButton').val().toLowerCase();
    buttonShortcuts[action.name] = newButton;
  }

  localStorage.setItem('buttonShortcuts', JSON.stringify(buttonShortcuts));

  analogStickDeadzone = Math.max(Math.min(parseInt($('#analogDeadzone').val()), 100), 0);
  localStorage.setItem('analogStickDeadzone', JSON.stringify(analogStickDeadzone));
  analogStickInvertX = $('#gamepadInvertX').prop('checked');
  analogStickInvertY = $('#gamepadInvertY').prop('checked');
  analogStickInvertZ = $('#gamepadInvertZ').prop('checked');
  localStorage.setItem('analogStickInvertX', analogStickInvertX);
  localStorage.setItem('analogStickInvertY', analogStickInvertY);
  localStorage.setItem('analogStickInvertZ', analogStickInvertZ);

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
  Metro.dialog.create({
    clsDialog: 'dark',
    leaveOverlayOnClose: true,
    title: "<i class='fas fa-exclamation-triangle'></i> Gamepad Enabled",
    content: `To prevent unwanted movement when the analog sticks are pushed accidentally, it is recommended that you assign a button to the` +
      `'Activate Analog Move' action. The button will activate the sticks and allow you to jog. The sticks will be disabled after 10 seconds of inactivity.<br><br>` +
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
