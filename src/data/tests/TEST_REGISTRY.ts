import { K10_TEST } from "./k10";
import { BFQ_TEST } from "./BFQ_TEST";
import { LAMINAS_TEST } from "./LAMINAS_TEST";
// import { BDI_TEST } from "./bdi";
// import { GAD7_TEST } from "./gad7";

export const TESTS_REGISTRY: Record<string, any> = {
  k10: K10_TEST,
  bfq: BFQ_TEST,
  laminas: LAMINAS_TEST,
  // bdi: BDI_TEST,
  // gad7: GAD7_TEST,
};
