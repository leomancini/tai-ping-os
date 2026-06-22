// App registry. Each app is a self-contained file exporting a `meta` object
// (id, name, icon, color) and a default component. To add an app, drop a file
// in this folder and add it here.
import Clock, { meta as clock } from "./Clock";
import Notes, { meta as notes } from "./Notes";
import Calculator, { meta as calculator } from "./Calculator";
import Stopwatch, { meta as stopwatch } from "./Stopwatch";
import Camera, { meta as camera } from "./Camera";

export const APPS = [
  { ...clock, Component: Clock },
  { ...notes, Component: Notes },
  { ...calculator, Component: Calculator },
  { ...stopwatch, Component: Stopwatch },
  { ...camera, Component: Camera },
];

export const getApp = (id) => APPS.find((a) => a.id === id);
