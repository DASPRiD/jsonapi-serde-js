import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import "virtual:group-icons.css";
import "./style.css";

export default {
    extends: DefaultTheme,
} satisfies Theme;
