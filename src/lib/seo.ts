import { useEffect } from "react";

type Meta = {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
};

function setMeta(name: string, value: string, attr: "name" | "property" = "name") {
  if (typeof document === "undefined") return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

export function useSeo({ title, description, ogTitle, ogDescription }: Meta) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) setMeta("description", description);
    if (ogTitle) setMeta("og:title", ogTitle, "property");
    if (ogDescription) setMeta("og:description", ogDescription, "property");
  }, [title, description, ogTitle, ogDescription]);
}
