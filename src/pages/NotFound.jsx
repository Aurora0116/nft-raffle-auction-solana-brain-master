import React from "react";
import loadable from "@loadable/component";

const Header = loadable(() => import("../components/Header"));
const Footer = loadable(() => import("../components/Footer"));

export default function NotFound() {
  return (
    <div>
      <Header />
      Error: 404, Page Not Found
      <Footer />
    </div>
  );
}
