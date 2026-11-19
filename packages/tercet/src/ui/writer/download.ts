import { frontmatterCodec } from "../../poems/codec/frontmatter/index.js";
import { slugify } from "../../poems/slug.js";

/** Save the poem as a `.mdx` file in the same format the storage drivers read. */
export function downloadPoem(title: string, content: string) {
  const slug = slugify(title) || "untitled";
  const body = frontmatterCodec.encode({
    slug,
    title: title.trim() || "Untitled",
    date: new Date().toISOString().slice(0, 10),
    content,
  });

  const url = URL.createObjectURL(new Blob([body], { type: "text/markdown;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slug}${frontmatterCodec.extensions[0]}`;
  link.click();
  // Let the click start the download before releasing the blob.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
