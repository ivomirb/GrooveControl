// update.js initialzies handles the auto update feature

const MAX_CHANGELOG_LINES = 16;

// System dependencies
import fs from 'fs';
import path from 'path';

import {
  shell,
} from 'electron';

import electronUpdater from 'electron-updater';
const { autoUpdater, CancellationToken } = electronUpdater;

// App dependencies
import {
  rootDir,
  debug_log,
  status,
  persistentConfig,
  savePersistentConfig,
} from './core.js';

import {
  serverEmit,
  addConnectionHandler,
  addDocReadyHandler,
} from './server.js';


// Global variables
var changelogText = "";
var downloadCancelToken = null;
var pendingInfo = null; // null - not ready, false - ready, object - send on next onDocReady

function createAutoUpdater(isPackaged) {
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.autoDownload = false;
  autoUpdater.fullChangelog = true;

  if (!isPackaged) {
    autoUpdater.forceDevUpdateConfig = true;
    autoUpdater.setFeedURL({provider: "github", owner: "ivomirb", repo: "GrooveControl"});
  }

  autoUpdater.on('update-available', (info) => {
    if (process.platform == 'win32') {
      info.canInstall = true;
    } else if (process.platform == 'linux') {
      // on Linux updates are supported only for AppImage packages
      info.canInstall = (process.env.APPIMAGE != undefined);
    } else { // Mac
      // The original OpenBuilds disables updates on Mac for some unknown reason. Until I can test it, auto updates will be disabled
    }

    if (pendingInfo == false) {
      serverEmit('update-available', info);
    } else {
      pendingInfo = info;
    }
  });

  autoUpdater.on('error', (ev, err) => {
    const string = err ? 'Error in auto-updater: ' + err.split('SyntaxError')[0] : 'Error in auto-updater';
    const output = {
      'command': 'autoupdate',
      'response': string
    }
    serverEmit('update-error', output);
  })

  autoUpdater.on('download-progress', (ev) => {
    serverEmit('download-progress', Math.max(Math.floor(ev.percent), 99));
  })

  autoUpdater.on('update-cancelled', () => {
    downloadCancelToken = null;
    serverEmit('download-progress', -1);
  });

  autoUpdater.on('update-downloaded', () => {
    downloadCancelToken = null;
    serverEmit('download-progress', 100);
    autoUpdater.quitAndInstall();
  });

  autoUpdater.checkForUpdates();
}

function onConnection(socket) {
  socket.on('openUpdatePage', function() {
    shell.openExternal("https://github.com/ivomirb/GrooveControl/releases/latest");
  });

  socket.on('cancelUpdate', function() {
    if (downloadCancelToken) {
      downloadCancelToken.cancel();
      downloadCancelToken = null;
    }
  });

  socket.on('downloadAndInstall', function() {
    downloadCancelToken =  new CancellationToken();
    autoUpdater.downloadUpdate(downloadCancelToken);
  });

  socket.on('enableUpdates', function(enable) {
    persistentConfig.enableUpdates = enable;
    status.misc.enableUpdates = enable;
    savePersistentConfig();
  });
}

function onDocReady(result) {
  if (pendingInfo) {
    serverEmit('update-available', pendingInfo);
  }
  pendingInfo = false;
  result.changelogText = changelogText;
}

export function initUpdate(isPackaged) {
  addConnectionHandler(onConnection);
  addDocReadyHandler(onDocReady);
  if (persistentConfig.enableUpdates) {
    createAutoUpdater(isPackaged);
  }
  status.misc.enableUpdates = persistentConfig.enableUpdates;

  try {
    const changelog = path.join(rootDir, "CHANGELOG.txt");
    let text = fs.readFileSync(changelog, 'utf8');
    text = text.split(/\r?\n/, MAX_CHANGELOG_LINES + 10);

    // cut off the line count at next new section after the first MAX_CHANGELOG_LINES lines, trim empty lines at the end
    let length = MAX_CHANGELOG_LINES;
    for (let i = MAX_CHANGELOG_LINES; i < text.length; i++) {
      if (text[i][0] == 'v') {
        break;
      }
      if (text[i].length > 0) {
        length = i + 1;
      }
    }
    text.length = length;

    changelogText = text.join('\n');
  } catch (err) {
    debug_log(err);
  }
}
