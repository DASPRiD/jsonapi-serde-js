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

        nav: [{ text: "Guide", link: "/introduction" }],

        sidebar: [
            {
                text: "Introduction",
                link: "/introduction",
            },
            {
                text: "Server",
                items: [
                    {
                        text: "Getting Started",
                        link: "/server/getting-started",
                    },
                    {
                        text: "Error Handling",
                        link: "/server/error-handling",
                    },
                    {
                        text: "Serialization",
                        link: "/server/serialization",
                    },
                    {
                        text: "Parsing Request Bodies",
                        link: "/server/parsing-request-bodies",
                    },
                    {
                        text: "Parsing Query Parameters",
                        link: "/server/parsing-query-parameters",
                    },
                    {
                        text: "Integrations",
                        items: [
                            {
                                text: "Koa",
                                link: "/server/integration/koa",
                            },
                        ],
                    },
                ],
            },
            {
                text: "Client",
                items: [
                    {
                        text: "Installation",
                        link: "/client/installation",
                    },
                    {
                        text: "Quickstart",
                        link: "/client/quickstart",
                    },
                    {
                        text: "Handling Relationships",
                        link: "/client/handling-relationships",
                    },
                    {
                        text: "Handling Errors",
                        link: "/client/handling-errors",
                    },
                    {
                        text: "Pagination Helpers",
                        link: "/client/pagination-helpers",
                    },
                ],
            },
        ],

        socialLinks: [{ icon: "github", link: "https://github.com/dasprid/jsonapi-serde-js" }],
    },
    srcDir: "src",
});
