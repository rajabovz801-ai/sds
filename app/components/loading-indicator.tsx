import styles from "./learning-ui.module.css";
export default function LoadingIndicator({full=true,label="Loading"}:{full?:boolean;label?:string}){
 return <div className={full?styles.loadingScreen:styles.loadingInline} role="status" aria-label={label}><span className={styles.spinner} aria-hidden="true"/></div>;
}
