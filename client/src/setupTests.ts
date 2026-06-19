import "@testing-library/jest-dom";
import { configure } from "@testing-library/react";

// The full suite runs many jsdom environments in parallel, so query resolution
// can exceed waitFor's 1s default under load. Give async assertions more headroom.
configure({ asyncUtilTimeout: 5000 });
