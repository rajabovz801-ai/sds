"use client";
import Link from "next/link";
import {ChevronRight} from "lucide-react";
import styles from "./learning-ui.module.css";

type BackProps = {
  label?: string;
  ariaLabel?: string;
  className?: string;
} & ({href:string;onClick?:never}|{href?:never;onClick:()=>void|Promise<void>});

/** Uses the lesson Start style while preserving each page's return action. */
export default function AnimatedBackButton(props:BackProps){
  const {label="Go back",ariaLabel,className=""}=props;
  const classes=(styles.start+" "+styles.back+" ark-back-control "+className).trim();
  if(props.href) return <Link href={props.href} className={classes} aria-label={ariaLabel||label}><span>{label}</span><ChevronRight size={16} aria-hidden="true"/></Link>;
  return <button type="button" className={classes} aria-label={ariaLabel||label} onClick={props.onClick}><span>{label}</span><ChevronRight size={16} aria-hidden="true"/></button>;
}
