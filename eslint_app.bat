@REM This file combines all app source files into one and validates it with eslint.
@REM eslint can't process multiple scripts that are linked together by index.html, because it assumes every file has its own local environment.
@REM 
@REM Update this file when adding more scripts to index.html.
@REM The echo // NOTE lines insert comments into all.js that force warnings in the eslint log.
@REM This helps identify which original file has which issue from the log.

cd app
copy /b globals.js all.js

echo // >> all.js
echo // NOTE: ui.js >> all.js
copy /b all.js + js\ui.js

echo // >> all.js
echo // NOTE: theme.js >> all.js
copy /b all.js + js\theme.js

echo // >> all.js
echo // NOTE: settings.js >> all.js
copy /b all.js + js\settings.js

echo // >> all.js
echo // NOTE: macros.js >> all.js
copy /b all.js + js\macros.js

echo // >> all.js
echo // NOTE: viewer.js >> all.js
copy /b all.js + js\viewer.js

echo // >> all.js
echo // NOTE: viewer-ruler.js >> all.js
copy /b all.js + js\viewer-ruler.js

echo // >> all.js
echo // NOTE: main.js >> all.js
copy /b all.js + js\main.js

echo // >> all.js
echo // NOTE: updates.js >> all.js
copy /b all.js + js\updates.js

echo // >> all.js
echo // NOTE: grbl-settings-templates.js >> all.js
copy /b all.js + js\grbl-settings-templates.js

echo // >> all.js
echo // NOTE: grbl-settings.js >> all.js
copy /b all.js + js\grbl-settings.js

echo // >> all.js
echo // NOTE: websocket.js >> all.js
copy /b all.js + js\websocket.js

echo // >> all.js
echo // NOTE: jog.js >> all.js
copy /b all.js + js\jog.js

echo // >> all.js
echo // NOTE: servo.js >> all.js
copy /b all.js + js\servo.js

echo // >> all.js
echo // NOTE: widget.js >> all.js
copy /b all.js + js\widget.js

echo // >> all.js
echo // NOTE: actions.js >> all.js
copy /b all.js + js\actions.js

echo // >> all.js
echo // NOTE: keyboard.js >> all.js
copy /b all.js + js\keyboard.js

echo // >> all.js
echo // NOTE: 3dview\3dview.js >> all.js
copy /b all.js + js\3dview\3dview.js

echo // >> all.js
echo // NOTE: calibration\calculate-xyz-steps.js >> all.js
copy /b all.js + js\calibration\calculate-xyz-steps.js

echo // >> all.js
echo // NOTE: calibration\calculate-a-steps.js >> all.js
copy /b all.js + js\calibration\calculate-a-steps.js

echo // >> all.js
echo // NOTE: calibration\calibrate-x.js >> all.js
copy /b all.js + js\calibration\calibrate-x.js

echo // >> all.js
echo // NOTE: calibration\calibrate-y.js >> all.js
copy /b all.js + js\calibration\calibrate-y.js

echo // >> all.js
echo // NOTE: calibration\calibrate-z.js >> all.js
copy /b all.js + js\calibration\calibrate-z.js

echo // >> all.js
echo // NOTE: \calibration\calibrate-servo.js >> all.js
copy /b all.js + js\calibration\calibrate-servo.js

echo // NOTE: probe\probev2.js >> all.js
copy /b all.js + js\probe\probev2.js

echo // NOTE: probe\holefinder.js >> all.js
copy /b all.js + js\probe\holefinder.js

echo // NOTE: surfacing\surfacing.js >> all.js
copy /b all.js + js\surfacing\surfacing.js

echo // NOTE: heightmap\heightmap.js >> all.js
copy /b all.js + js\heightmap\heightmap.js

echo // NOTE: jobstats\jobstats.js >> all.js
copy /b all.js + js\jobstats\jobstats.js

echo // NOTE: resume\resume.js >> all.js
copy /b all.js + js\resume\resume.js

echo // NOTE: js\toolchange.js >> all.js
copy /b all.js + js\toolchange.js

cd ..

npx eslint app\all.js > app\eslint.log
