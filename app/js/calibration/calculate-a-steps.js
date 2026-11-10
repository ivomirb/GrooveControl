const grblcalctemplateA = `<div>
      Use the wizard below to calculate theoretical steps-per-degree values for this axis. This will get you quite close and ready for initial testing. Finer tuning may be required later.
      <hr>
      <table class="table compact">
        <tbody>
          <tr>
            <td>Motor Type</td>
            <td colspan="3">
              <select data-role="select" data-filter="false" id="motorselect" data-on-change="updateCalAControls();">
                <option value="200">1.8&deg; (200 steps per rotation)</option>
                <option value="400">0.9&deg; (400 steps per rotation)</option>
                <option value="0">Custom</option>
              </select>
            </td>
          </tr>
          <tr id="microsteprow">
            <td>Microstepping Type</td>
            <td colspan="3">
              <select class="compact-options" data-role="select" data-filter="false" id="microstepselect" data-on-change="updateCalAControls();">
                <option value="32">1/32 Step</option>
                <option value="16">1/16 Step</option>
                <option value="8" selected>1/8 Step</option>
                <option value="4">1/4 Step</option>
                <option value="1">Full Step</option>
              </select>
            </td>
          </tr>
          <tr id="microsteprow2">
            <td><i>Calculated Microsteps</i><span class="far fa-question-circle ml-1" title="The number of microsteps required for one rotation of the motor.
Select Custom motor type to set this manually"></span></td>
            <td colspan="3"><input data-role="input" data-clear-button="false" data-append="steps/rotation" type="text" id="calculatedsteps" readonly></td>
          </tr>
          <tr id="microsteprow3">
            <td>Custom Microsteps<span class="far fa-question-circle ml-1" title="Enter the number of microsteps required for one rotation of the motor.
This can be adjusted via switches on the stepper driver or the motor itself"></span></td>
            <td colspan="3"><input data-role="input" data-clear-button="false" data-append="steps/rotation" type="text" id="customsteps" onchange="updateCalAControls()"></td>
          </tr>
          <tr>
            <td style="width:32%"><b>Gear Ratio<b><span class="far fa-question-circle ml-1" title="Enter the reduction ratio for the axis driving mechanism.
Examples:
  * For a 30:1 gearbox enter 30 and 1
  * For a belt drive with a 20-tooth gear on the motor and an 80-tooth gear on the chuck enter 80 and 20, or simply 4 and 1.
     Note that the chuck gear is in the first field"></span></td>
            <td style="width:33%"><input data-role="input" data-clear-button="false" id="gearboxgear1" onchange="updateCalAControls()"></td>
            <td style="width:2%">:</td>
            <td style="width:33%"><input data-role="input" data-clear-button="false" id="gearboxgear2" onchange="updateCalAControls()"></td>
          </tr>
          <tr>
            <td><b>Calculated Value</b><span class="far fa-question-circle ml-1" title="Microsteps divided by the gear ratio, then divided by 360"></span></td>
            <td colspan="3"><input data-role="input" data-clear-button="false" data-append="steps/degree" type="text" id="calculatedstepsperdeg" readonly></td>
          </tr>
        </tbody>
      </table>

</div>`

function astepspermm() {
  Metro.dialog.create({
    width: 600,
    title: "Calculate Steps per degree for A-Axis ($103)",
    content: grblcalctemplateA,
    actions: [{
        caption: "Apply calculated value to Grbl Settings",
        cls: "js-dialog-close success applyASteps",
        onclick: function() {
          $('#val-103-input').val($('#calculatedstepsperdeg').val());
          checkifchanged();
        }
      },
      {
        caption: "Cancel",
        cls: "js-dialog-close",
        onclick: function() {}
      }
    ]
  });
  setTimeout(updateCalAControls, 0);
}

function updateCalAControls() {
  const motorselect = parseInt($('#motorselect').data('select').val());
  const microstepselect = parseInt($('#microstepselect').data('select').val());

  $('#calculatedsteps').addClass('disabled');

  const custom = motorselect == 0;
  $('#microsteprow').toggle(!custom);
  $('#microsteprow2').toggle(!custom);
  $('#microsteprow3').toggle(custom);

  let stepsperrev;
  if (custom) {
    stepsperrev = parseInt($('#customsteps').val());
  } else {
    stepsperrev = motorselect * microstepselect;
    $('#calculatedsteps').val(stepsperrev);
  }

  const gear1 = parseFloat($('#gearboxgear1').val());
  const gear2 = parseFloat($('#gearboxgear2').val());

  if (isNaN(stepsperrev) || isNaN(gear1) || isNaN(gear2) || gear1 == 0 || gear2 == 0) {
    $('#calculatedstepsperdeg').val("");
    enableViaClass('.applyASteps', false);
  } else {
    const stepsperdeg = (stepsperrev * gear1) / (gear2 * 360);
    $('#calculatedstepsperdeg').val(parseFloat(stepsperdeg.toFixed(3)));
    enableViaClass('.applyASteps', true);
  }
}
