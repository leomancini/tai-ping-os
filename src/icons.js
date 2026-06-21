// Maps the icon keywords the generator may return (see ICON_KEYWORDS in
// server.js) to Font Awesome (free, solid) icon objects.
import {
  faCalculator,
  faClock,
  faNoteSticky,
  faListCheck,
  faDice,
  faStopwatch,
  faChartSimple,
  faMoneyBill,
  faCalendar,
  faMusic,
  faCamera,
  faHeart,
  faStar,
  faBolt,
  faGamepad,
  faPalette,
  faGlobe,
  faBook,
  faFlask,
  faCompass,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";

const ICON_MAP = {
  calculator: faCalculator,
  clock: faClock,
  note: faNoteSticky,
  list: faListCheck,
  dice: faDice,
  timer: faStopwatch,
  chart: faChartSimple,
  money: faMoneyBill,
  calendar: faCalendar,
  music: faMusic,
  camera: faCamera,
  heart: faHeart,
  star: faStar,
  bolt: faBolt,
  gamepad: faGamepad,
  palette: faPalette,
  globe: faGlobe,
  book: faBook,
  flask: faFlask,
  compass: faCompass,
};

// Resolve a keyword to an icon object, falling back to a generic glyph.
export const resolveIcon = (keyword) => ICON_MAP[keyword] || faWandMagicSparkles;
