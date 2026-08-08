"use client";

import LocalBusinessTemplate from "./LocalBusinessTemplate";
import {
  EditorialLayout,
  SereneLayout,
  TheaterLayout,
  RetailLayout,
  ProcessLayout,
} from "./layouts/LocalLayouts";
import {
  FolioLayout,
  EstateLayout,
  MentorLayout,
  MarqueeLayout,
  CauseLayout,
  LaunchLayout,
  AtelierLayout,
} from "./layouts/NicheLayouts";
import { getLayoutStyle } from "@/lib/templates";

const LAYOUT_COMPONENTS = {
  bleed: LocalBusinessTemplate,
  editorial: EditorialLayout,
  serene: SereneLayout,
  theater: TheaterLayout,
  retail: RetailLayout,
  process: ProcessLayout,
  folio: FolioLayout,
  estate: EstateLayout,
  mentor: MentorLayout,
  marquee: MarqueeLayout,
  cause: CauseLayout,
  launch: LaunchLayout,
  atelier: AtelierLayout,
};

/** Picks a distinct single-page layout from the site’s template. */
export default function SiteTemplate({ content, ...rest }) {
  const layoutStyle = getLayoutStyle(content?.template);
  const Layout = LAYOUT_COMPONENTS[layoutStyle] || LocalBusinessTemplate;
  return <Layout content={content} {...rest} />;
}

export { LAYOUT_COMPONENTS };
