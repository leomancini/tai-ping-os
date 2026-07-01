// App registry. Each app is a self-contained file exporting a `meta` object
// (id, name, icon, color) and a default component. To add an app, drop a file
// in this folder and add it here.
//
// There are currently no built-in apps — the home screen shows only the
// apps the user creates.
export const APPS = [];

export const getApp = (id) => APPS.find((a) => a.id === id);
