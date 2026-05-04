import { K10_TEST } from "./k10";
import { BFQ_TEST } from "./BFQ_TEST";
import { LAMINAS_TEST } from "./LAMINAS_TEST";
import { RAVEN_TEST } from "./raven_test";

export const TESTS_REGISTRY: Record<string, any> = {
  k10: K10_TEST,
  bfq: BFQ_TEST,
  laminas: LAMINAS_TEST,
  raven: RAVEN_TEST,

};