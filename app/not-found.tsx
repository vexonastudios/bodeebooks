import Link from "next/link";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.errorCode}>404</div>
        <h1 className={`${styles.title} font-serif`}>Page Not Found</h1>
        <p className={styles.description}>
          It seems you've wandered into an uncharted section of our library. 
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <Link href="/" className={styles.homeButton}>
          Return to Home
        </Link>
      </div>
    </div>
  );
}
