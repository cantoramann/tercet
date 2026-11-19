import { THEME_KEY } from "./key.js";

/**
 * Runs in <head> before first paint so a saved theme never flashes the
 * other one. Kept tiny and dependency-free because it is inlined as a string.
 */
export const themeScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
