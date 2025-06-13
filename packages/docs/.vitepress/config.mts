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
    head: [["link", { rel: "icon", type: "image/svg+xml", href: "/icon.svg" }]],
    themeConfig: {
        logo: { src: "/icon.svg", width: 24, height: 24 },

        editLink: {
            pattern:
                "https://github.com/dasprid/jsonapi-serde-js/edit/main/packages/docs/src/:path",
            text: "Edit this page on GitHub",
        },

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
                    {
                        text: "OpenAPI",
                        items: [
                            {
                                text: "Introduction",
                                link: "/server/openapi/introduction",
                            },
                            {
                                text: "Getting Started",
                                link: "/server/openapi/getting-started",
                            },
                            {
                                text: "Query Parameters",
                                link: "/server/openapi/query-parameters",
                            },
                            {
                                text: "Data Requests",
                                link: "/server/openapi/data-requests",
                            },
                            {
                                text: "Data Responses",
                                link: "/server/openapi/data-responses",
                            },
                            {
                                text: "Error Responses",
                                link: "/server/openapi/error-responses",
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
