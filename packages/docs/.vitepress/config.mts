import { defineConfig } from "vitepress";
import { groupIconMdPlugin, groupIconVitePlugin } from "vitepress-plugin-group-icons";

export default defineConfig({
    title: "JSON:API Serde",
    description: "Framework agnostic serialization and deserialization",
    markdown: {
        config(md) {
            md.use(groupIconMdPlugin);
        },
    },
    vite: {
        plugins: [groupIconVitePlugin()],
    },
    themeConfig: {
        logo: { src: "/icon.svg", width: 24, height: 24 },

        editLink: {
            pattern:
                "https://github.com/dasprid/jsonapi-serde-js/edit/main/packages/docs/src/:path",
            text: "Edit this page on GitHub",
        },

        head: [["link", { rel: "icon", type: "image/svg+xml", href: "/icon.svg" }]],

        search: {
            provider: "local",
        },

        nav: [{ text: "Guide", link: "/getting-started" }],

        sidebar: [
            {
                text: "Getting Started",
                link: "/getting-started",
            },
            {
                text: "Error Handling",
                link: "/error-handling",
            },
            {
                text: "Serialization",
                link: "/serialization",
            },
            {
                text: "Parsing Request Bodies",
                link: "/parsing-request-bodies",
            },
            {
                text: "Parsing Query Parameters",
                link: "/parsing-query-parameters",
            },
            {
                text: "Integrations",
                items: [
                    {
                        text: "Koa",
                        link: "/integration/koa",
                    },
                ],
            },
        ],

        socialLinks: [{ icon: "github", link: "https://github.com/dasprid/jsonapi-serde-js" }],
    },
    srcDir: "src",
});
