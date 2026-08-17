import { createApp } from "vue";
import App from "./App.vue";
import ExternalReminderWindow from "./components/ExternalReminderWindow.vue";
import "./style.css";

const isReminderWindow = new URLSearchParams(window.location.search).has("reminder");
if (isReminderWindow) document.documentElement.classList.add("external-reminder-window");
createApp(isReminderWindow ? ExternalReminderWindow : App).mount("#app");
