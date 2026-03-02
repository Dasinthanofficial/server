import slugify from "slugify";

export function makeSlug(title) {
  return slugify(title, { lower: true, strict: true, trim: true });
}