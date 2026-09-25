"use client";
import Link from "next/link";

type BackProps = {
  label?: string;
  ariaLabel?: string;
  className?: string;
} & ({href:string;onClick?:never}|{href?:never;onClick:()=>void|Promise<void>});

function Inner({label}:{label:string}){
  return <>
    <span className="ark-back-icon" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="25" height="25" fill="none">
        <path d="M224 480h640a32 32 0 1 1 0 64H224a32 32 0 0 1 0-64z" fill="#000000"/>
        <path d="m237.248 512 265.408 265.344a32 32 0 0 1-45.312 45.312l-288-288a32 32 0 0 1 0-45.312l288-288a32 32 0 1 1 45.312 45.312L237.248 512z" fill="#000000"/>
      </svg>
    </span>
    <span className="ark-back-label">{label}</span>
  </>;
}

/** Shared back control; preserves the exact green expanding-arrow design throughout the challenge. */
export default function AnimatedBackButton(props:BackProps){
  const {label="Go Back",ariaLabel,className=""}=props;
  const classes=("ark-back-control "+className).trim();
  if(props.href) return <Link href={props.href} className={classes} aria-label={ariaLabel||label}><Inner label={label}/></Link>;
  return <button type="button" className={classes} aria-label={ariaLabel||label} onClick={props.onClick}><Inner label={label}/></button>;
}
