const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveDailyReport: (payload) => ipcRenderer.invoke('save-daily-report', payload)
});

