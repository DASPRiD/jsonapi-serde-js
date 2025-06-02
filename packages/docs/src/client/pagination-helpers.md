# Pagination Helpers

The package also provides utilities for working with pagination links and parameters, such as:

- `extractPageParams`: extracts pagination parameters (e.g., page numbers) from top-level pagination links (`first`,
  `prev`, `next`, `last`).
- `injectPageParams`: injects page parameters into URLs for building pagination requests.

These helpers support:

- Parsing parameters from links while validating expected keys.
- Constructing URLs with correct page query parameters (`page[number]`, `page[size]`, etc.).

## Example

```ts
const links = {
  first: "https://api.example.com/articles?page[number]=1&page[size]=10",
  next: "https://api.example.com/articles?page[number]=2&page[size]=10",
};

const pageParams = extractPageParams(links, ["number", "size"]);
console.log(pageParams.next.number); // "2"

const url = new URL("https://api.example.com/articles");
injectPageParams(url, { number: "3", size: "10" });
console.log(url.toString()); // https://api.example.com/articles?page[number]=3&page[size]=10
```
