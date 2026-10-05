// Applies the stored theme before first paint (inlined by the root layout).
// Plain module (no "use client") so the server layout can read the string.
// The key and its raw "light" / "dark" value are the ones the store has always
// used, so an existing preference carries over.
export const THEME_KEY = "theme";
export const THEME_INIT_SCRIPT = `try{if(localStorage.getItem("${THEME_KEY}")==="light"){document.documentElement.dataset.theme="light"}}catch(e){}`;
