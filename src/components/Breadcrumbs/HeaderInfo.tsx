import { useEffect, useState } from "react";

import styles from "./HeaderInfo.module.css";

import { getSoftDateInfo } from "../../utils/getGreetings/getGreetings";

export default function HeaderInfo() {
  const [info, setInfo] = useState(getSoftDateInfo());

  useEffect(() => {
    const timer = setInterval(() => {
      setInfo(getSoftDateInfo());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className={styles.container}
      aria-label={`${info.fecha}, ${info.hora}`}
    >
      <div className={styles.topRow}>
        <span className={styles.fecha}>
          {info.fecha}
        </span>
      </div>

      <div className={styles.bottomRow}>
        <span className={styles.hora}>
          {info.hora}
        </span>
      </div>
    </div>
  );
}