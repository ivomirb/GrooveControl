"use strict";

var disableKeyboardShortcuts = true;
var keyboardShortcuts = {};
var dlgContext = {};
var focusedKbdAction = undefined;
var kbdWarningShown = false;

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
  let Parts = parts.map((x) => x == "" ? "" : x[0].toUpperCase() + x.substr(1));
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
      if (!action.gamepad && action != focusedKbdAction) {
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
  for (const action of inputActions) {
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

function initKeyboardActions() {
  for (const action of inputActions) {
    keyboardShortcuts[action.name] = action.defaultKey;
  }

  if (localStorage.getItem('keyboardShortcuts')) {
    let settings = JSON.parse(localStorage.getItem('keyboardShortcuts'));
    for (const action of inputActions) {
      if (settings[action.name] != undefined) {
        keyboardShortcuts[action.name] = settings[action.name];
      }
    }
  }

  disableKeyboardShortcuts = localStorage.getItem('disableKeyboardShortcuts') == null || (JSON.parse(localStorage.getItem('disableKeyboardShortcuts')) == true);

  // Remove Keyboard Bindings from Override Sliders
  $("#jrocell").find(".marker").unbind(Metro.events.keydown);
  $("#trocell").find(".marker").unbind(Metro.events.keydown);
  $("#frocell").find(".marker").unbind(Metro.events.keydown);
  $("#jrocell").find(".marker").unbind(Metro.events.keyup);
  $("#trocell").find(".marker").unbind(Metro.events.keyup);
  $("#frocell").find(".marker").unbind(Metro.events.keyup);

  $(document).on('keydown', onDocKeyDown);
  $(document).on('keyup', onDocKeyUp);
}
