import { K10_TEST } from "./k10";
import { BFQ_TEST } from "./BFQ_TEST";
import { ZULLIGER_TEST } from "./zulliger_test";
import { BENDER_TEST } from "./bender_test";  

export const TESTS_REGISTRY: Record<string, any> = {
  k10: K10_TEST,
  bfq: BFQ_TEST,
  zulliger: ZULLIGER_TEST,
  bender: BENDER_TEST,
};