import { SignIn } from "@clerk/nextjs";
import styles from "../../auth.module.css";

export default function GuardSignInPage() {
  return <div className={styles.authPage}><SignIn /></div>;
}
