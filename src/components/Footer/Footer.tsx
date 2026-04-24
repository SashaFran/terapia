
import styles from './Footer.module.css';
import logo from '../../assets/IMAGES/logo.png';


export default function Modal({ }) {
    return (
        <footer className={styles.footerStyle}>
            <div className={styles.containerStyle}>
                <div className={styles.brandStyle}> <img className={styles.logo} src={logo} alt="Logo" /></div>
            
                <div className={styles.noteStyle}>
                    © {new Date().getFullYear()} JOIN SOLUTION.
                </div>
            </div>
        </footer>
    );
};
