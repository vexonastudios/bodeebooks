import { SignUp } from "@clerk/nextjs";
import styles from "../../auth.module.css";

export default function GuardSignUpPage() {
  return <div className={styles.authPage}><SignUp /></div>;
}
