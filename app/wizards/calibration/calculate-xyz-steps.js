const grblcalctemplateXYZ = `<div>
      Use the wizard below to calculate theoretical steps-per-mm values for this axis. This will get you quite close and ready for initial testing. To fine tune final calibration, make use of the Calibration Wizards under Wizards and Tools.
      <hr>
      <table class="table compact">
        <tbody>
          <tr id="actuatorrow">
            <td style="width: 30%;">Actuator Type</td>
            <td style="width: 70%;">
              <select class="compact-options" data-role="select" data-filter="false" id="actuatorselect" data-on-change="updateCalXyzControls();">
                <option value="belt">Belt Driven</option>
                <option value="screw" selected>Screw Driven (Ballscrew or Leadscrew)</option>
              </select>
            </td>
          </tr>
          <tr id="leadscrewrow">
            <td>Screw Pitch<span class="far fa-question-circle ml-1" title="You can easily measure the pitch by counting 10 threads and measuring them together with a caliper.
Divide the value by 10. Round to the nearest mm, as the pitches are standard.

Note: some larger ballscrews have multiple helixes running in parallel.
You will have to further divide by that count"></span></td>
            <td>
              <select class="compact-options" data-role="select" data-filter="false" id="leadscrewselect" data-on-change="updateCalXyzControls();">
                <option value="1">1 mm pitch (e.g. size 1001, 1201)</option>
                <option value="2">2 mm pitch (e.g. size 1202, 1602)</option>
                <option value="4">4 mm pitch (e.g. size 1204, 1604, 2004)</option>
                <option value="5">5 mm pitch (e.g. size 1205, 1605, 2005)</option>
                <option value="8" selected>8 mm pitch (e.g. size 1608, 2008)</option>
                <option value="10">10 mm pitch (e.g. size 1610, 2010)</option>
              </select>
            </td>
          </tr>
          <tr id="beltrow" style="display: none;">
            <td>Belt Type</td>
            <td>
              <select class="compact-options" data-role="select" data-filter="false" id="beltselect" data-on-change="updateCalXyzControls();">
                <option value="2">GT2 (2 mm per tooth)</option>
                <option value="3">GT3 (3 mm per tooth)</option>
              </select>
            </td>
          </tr>
          <tr id="pulleyrow" style="display: none;">
            <td>Pulley Type</td>
            <td>
              <select class="compact-options" data-role="select" data-filter="false" id="pulleyselect" data-on-change="updateCalXyzControls();">
                <option value="14">14 Teeth</option>
                <option value="16">16 Teeth</option>
                <option value="20" selected>20 Teeth</option>
                <option value="30">30 Teeth</option>
              </select>
            </td>
          </tr>
          <tr>
            <td><i>Calculated Travel</i><span class="far fa-question-circle ml-1" title="The distance traveled by one rotation of the motor"></span></td>
            <td><input data-role="input" data-clear-button="false" data-append="mm/rotation" type="text" id="calculatedmm" readonly></td>
          </tr>
          <tr>
            <td>Motor Type</td>
            <td>
              <select data-role="select" data-filter="false" id="motorselect" data-on-change="updateCalXyzControls();">
                <option value="200">1.8&deg; (200 steps per rotation)</option>
                <option value="400">0.9&deg; (400 steps per rotation)</option>
                <option value="0">Custom</option>
              </select>
            </td>
          </tr>
          <tr id="microsteprow">
            <td>Microstepping Type</td>
            <td>
              <select class="compact-options" data-role="select" data-filter="false" id="microstepselect" data-on-change="updateCalXyzControls();">
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
            <td><input data-role="input" data-clear-button="false" data-append="steps/rotation" type="text" id="calculatedsteps" readonly></td>
          </tr>
          <tr id="microsteprow3">
            <td>Custom Microsteps<span class="far fa-question-circle ml-1" title="Enter the number of microsteps required for one rotation of the motor.
This can be adjusted via switches on the stepper driver or the motor itself"></span></td>
            <td><input data-role="input" data-clear-button="false" data-append="steps/rotation" type="text" id="customsteps" onchange="updateCalXyzControls()"></td>
          </tr>
          <tr>
            <td><b>Calculated Value</b><span class="far fa-question-circle ml-1" title="Microsteps divided by the travel distance"></span></td>
            <td><input data-role="input" data-clear-button="false" data-append="steps/mm" type="text" id="calculatedstepspermm" readonly></td>
          </tr>
        </tbody>
      </table>

</div>`

function xstepspermm() {
  Metro.dialog.create({
    width: 600,
    title: "Calculate Steps per mm for X-Axis ($100)",
    content: grblcalctemplateXYZ,
    actions: [{
        caption: "Apply calculated value to Grbl Settings",
        cls: "js-dialog-close success applyXyzSteps",
        onclick: function() {
          $('#val-100-input').val($('#calculatedstepspermm').val());
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
  setTimeout(updateCalXyzControls, 0);
}

function ystepspermm() {
  Metro.dialog.create({
    width: 600,
    title: "Calculate Steps per mm for Y-Axis ($101)",
    content: grblcalctemplateXYZ,
    actions: [{
        caption: "Apply calculated value to Grbl Settings",
        cls: "js-dialog-close success",
        onclick: function() {
          $('#val-101-input').val($('#calculatedstepspermm').val());
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
  setTimeout(updateCalXyzControls, 0);
}

function zstepspermm() {
  Metro.dialog.create({
    width: 600,
    title: "Calculate Steps per mm for Z-Axis ($102)",
    content: grblcalctemplateXYZ,
    actions: [{
        caption: "Apply calculated value to Grbl Settings",
        cls: "js-dialog-close success",
        onclick: function() {
          $('#val-102-input').val($('#calculatedstepspermm').val());
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
  setTimeout(updateCalXyzControls, 0);
}

function updateCalXyzControls() {
  const actuatorselect = $('#actuatorselect').data('select').val();
  const motorselect = parseInt($('#motorselect').data('select').val());
  const microstepselect = parseInt($('#microstepselect').data('select').val());
  const beltpitch = parseInt($('#beltselect').data('select').val());
  const pulleyteeth = parseInt($('#pulleyselect').data('select').val());
  const screwpitch = parseInt($('#leadscrewselect').data('select').val());

  $('#calculatedmm').addClass('disabled');
  $('#calculatedsteps').addClass('disabled');

  const belt = actuatorselect == "belt";
  $('#beltrow').toggle(belt);
  $('#pulleyrow').toggle(belt);
  $('#leadscrewrow').toggle(!belt);

  const dist = belt ? beltpitch * pulleyteeth : screwpitch;
  $('#calculatedmm').val(dist);

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

  if (isNaN(stepsperrev)) {
    $('#calculatedstepspermm').val("");
    enableViaClass('.applyXyzSteps', false);
  } else {
    const calculatedstepspermm = stepsperrev / dist;
    $('#calculatedstepspermm').val(parseFloat(calculatedstepspermm.toFixed(3)));
    enableViaClass('.applyXyzSteps', true);
  }
}
