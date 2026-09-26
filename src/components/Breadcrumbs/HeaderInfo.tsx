import { Link as RouterLink, useLocation } from "react-router-dom";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import HomeIcon from "@mui/icons-material/Home";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import styles from './HeaderInfo.module.css';
import { useEffect, useState } from "react";
import { getSoftDateInfo } from "../../utils/getGreetings/getGreetings";


  export default function HeaderInfo(){
  const [info, setInfo] = useState(getSoftDateInfo());

  useEffect(() => {
    const timer = setInterval(() => setInfo(getSoftDateInfo()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={styles.container}>
        <div className={styles.topRow}>
          <span className={styles.fecha}>{info.fecha}</span>
        </div>
        <div className={styles.bottomRow}>          
          <span className={styles.hora}>{info.hora}</span>
          <span className={styles.emoji}>{info.emoji}</span>
        </div>
    </div>
  );
};