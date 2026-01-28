import { Link as RouterLink, useLocation } from "react-router-dom";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import HomeIcon from "@mui/icons-material/Home";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";

export default function BreadcrumbsNav() {
    const location = useLocation();
    const pathnames = location.pathname.split("/").filter((x) => x);

    return (
        <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" />}
            aria-label="breadcrumb"
            
            sx={{
                mb: 2,
                fontSize: "0.95rem",
                "--color": "var(--text-secondary)",
                
            }}
        >
            {/* HOME */}
            <Link
                component={RouterLink}
                underline="hover"
                color="inherit"
                to="/"
                sx={{ display: "flex", alignItems: "center" }}
            >
                <HomeIcon fontSize="small" sx={{ mr: 0.5 }} />
                Inicio
            </Link>

            {/* RESTO DE PARTES */}
            {pathnames.map((value, index) => {
                const isLast = index === pathnames.length - 1;
                const pathTo = "/" + pathnames.slice(0, index + 1).join("/");

                const label = value.replace(/-/g, " ");

                return isLast ? (
                    <Typography
                        key={pathTo}
                        sx={{ color: "var(--color)", fontWeight: 600 }}
                    >
                        {label}
                    </Typography>
                ) : (
                    <Link
                        key={pathTo}
                        underline="hover"
                        color="inherit"
                        component={RouterLink}
                        to={pathTo}
                        sx={{ Transform: "uppercase" }}
                        inputProps={{style: {textTransform: 'capitalize'}}} 
                        
                    >
                        {label}
                    </Link>
                );
            })}
        </Breadcrumbs>
    );
}
